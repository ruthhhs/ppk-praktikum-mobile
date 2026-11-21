import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {logger} from "firebase-functions";
import {setGlobalOptions} from "firebase-functions/v2";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

setGlobalOptions({
  maxInstances: 10,
  region: "asia-southeast2",
});

type TipeNotifikasi =
  | "sesi_dibuka"
  | "jadwal_berubah"
  | "izin_diterima"
  | "izin_ditolak";

type NotificationPayload = {
  tipe: TipeNotifikasi;
  judul: string;
  isi: string;
  sesiId?: string;
  jadwalId?: string;
  kelasId?: string;
};

const jadwalFields = [
  "kelasId",
  "pertemuanKe",
  "tanggal",
  "jamMulai",
  "jamSelesai",
  "lokasi",
];

/**
 * Menyimpan notifikasi dan mengirim push ke perangkat pengguna.
 * @param {string} uid UID pengguna penerima notifikasi.
 * @param {string} eventId ID event Firestore untuk mencegah duplikasi.
 * @param {NotificationPayload} payload Isi notifikasi yang akan dikirim.
 */
async function kirimNotifikasi(
  uid: string,
  eventId: string,
  payload: NotificationPayload,
): Promise<void> {
  const safeEventId = eventId.replace(/[^A-Za-z0-9_-]/g, "_");
  const notifikasiId = `${safeEventId}_${payload.tipe}`;
  const notifikasiRef = db
    .collection("users")
    .doc(uid)
    .collection("notifikasi")
    .doc(notifikasiId);

  const dibuat = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(notifikasiRef);
    if (existing.exists) return false;

    transaction.create(notifikasiRef, {
      ...payload,
      dibaca: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return true;
  });

  if (!dibuat) return;

  const perangkatSnapshot = await db
    .collection("users")
    .doc(uid)
    .collection("perangkat")
    .get();

  const perangkat = perangkatSnapshot.docs.flatMap((document) => {
    const token = document.get("tokenFcm");

    if (typeof token !== "string" || token.length === 0) {
      return [];
    }

    return [{ref: document.ref, token}];
  });

  for (let mulai = 0; mulai < perangkat.length; mulai += 500) {
    const kelompok = perangkat.slice(mulai, mulai + 500);
    const data: Record<string, string> = {
      tipe: payload.tipe,
      notifikasiId,
    };

    if (payload.sesiId) data.sesiId = payload.sesiId;
    if (payload.jadwalId) data.jadwalId = payload.jadwalId;
    if (payload.kelasId) data.kelasId = payload.kelasId;

    try {
      const hasil = await messaging.sendEachForMulticast({
        tokens: kelompok.map((item) => item.token),
        notification: {
          title: payload.judul,
          body: payload.isi,
        },
        data,
      });

      const penghapusanToken: Promise<unknown>[] = [];

      hasil.responses.forEach((response, index) => {
        if (response.success) return;

        const code = response.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          penghapusanToken.push(
            kelompok[index].ref.delete().then(() => undefined),
          );
        } else {
          logger.warn("Push gagal dikirim", {uid, code});
        }
      });

      await Promise.all(penghapusanToken);
    } catch (error) {
      logger.error("Pengiriman push gagal", {uid, error});
    }
  }
}

/**
 * Mengirim notifikasi kepada peserta aktif suatu kelas.
 * @param {string} kelasId ID kelas penerima notifikasi.
 * @param {string} eventId ID event Firestore untuk mencegah duplikasi.
 * @param {NotificationPayload} payload Isi notifikasi yang akan dikirim.
 */
async function kirimKePesertaKelas(
  kelasId: string,
  eventId: string,
  payload: NotificationPayload,
): Promise<void> {
  const pesertaSnapshot = await db
    .collection("kelas")
    .doc(kelasId)
    .collection("peserta")
    .where("aktif", "==", true)
    .get();

  await Promise.all(
    pesertaSnapshot.docs.map((peserta) =>
      kirimNotifikasi(peserta.id, eventId, payload),
    ),
  );
}

/** Memberi tahu peserta ketika sesi berubah menjadi dibuka. */
export const sesiDibuka = onDocumentUpdated(
  "sesi/{sesiId}",
  async (event) => {
    const sebelum = event.data?.before.data();
    const sesudah = event.data?.after.data();

    if (
      !sebelum ||
      !sesudah ||
      sebelum.status === "dibuka" ||
      sesudah.status !== "dibuka"
    ) {
      return;
    }

    const kelasId = sesudah.kelasId;
    if (typeof kelasId !== "string" || !kelasId) {
      logger.warn("Sesi dibuka tanpa kelasId", {
        sesiId: event.params.sesiId,
      });
      return;
    }

    await kirimKePesertaKelas(kelasId, event.id, {
      tipe: "sesi_dibuka",
      judul: "Sesi praktikum dibuka",
      isi: "Sesi praktikum telah dibuka. Silakan lakukan presensi.",
      sesiId: event.params.sesiId,
      kelasId,
    });
  },
);

/** Memberi tahu peserta jika informasi jadwal berubah. */
export const jadwalBerubah = onDocumentUpdated(
  "jadwal/{jadwalId}",
  async (event) => {
    const sebelum = event.data?.before.data();
    const sesudah = event.data?.after.data();

    if (!sebelum || !sesudah) return;

    const berubah = jadwalFields.some(
      (field) =>
        JSON.stringify(sebelum[field]) !== JSON.stringify(sesudah[field]),
    );
    if (!berubah) return;

    const kelasIds = new Set<string>();
    if (typeof sebelum.kelasId === "string") {
      kelasIds.add(sebelum.kelasId);
    }
    if (typeof sesudah.kelasId === "string") {
      kelasIds.add(sesudah.kelasId);
    }

    await Promise.all(
      [...kelasIds].map((kelasId) =>
        kirimKePesertaKelas(kelasId, event.id, {
          tipe: "jadwal_berubah",
          judul: "Jadwal praktikum berubah",
          isi: "Informasi jadwal praktikum telah diperbarui.",
          jadwalId: event.params.jadwalId,
          kelasId,
        }),
      ),
    );
  },
);

/** Memberi tahu mahasiswa saat pengajuan izinnya diputuskan. */
export const keputusanIzin = onDocumentUpdated(
  "sesi/{sesiId}/pengajuanIzin/{uid}",
  async (event) => {
    const sebelum = event.data?.before.data();
    const sesudah = event.data?.after.data();

    if (
      !sebelum ||
      !sesudah ||
      sebelum.status !== "menunggu" ||
      (sesudah.status !== "diterima" && sesudah.status !== "ditolak")
    ) {
      return;
    }

    const diterima = sesudah.status === "diterima";
    let tipe: TipeNotifikasi;
    let judul: string;
    let isi: string;

    if (diterima) {
      tipe = "izin_diterima";
      judul = "Izin diterima";
      isi = "Pengajuan izin kamu telah diterima.";
    } else {
      tipe = "izin_ditolak";
      judul = "Izin ditolak";
      isi = "Pengajuan izin kamu telah ditolak.";
    }

    await kirimNotifikasi(event.params.uid, event.id, {
      tipe,
      judul,
      isi,
      sesiId: event.params.sesiId,
    });
  },
);
