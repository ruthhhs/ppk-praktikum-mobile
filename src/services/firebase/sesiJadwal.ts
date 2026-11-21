import { getFirestore, writeBatch } from "@react-native-firebase/firestore";
import { firestoreRefs, serverTimestamp } from "./firestore";

// Buka/tutup sesi dan menonaktifkan jadwal asalnya dalam SATU batch, supaya
// tidak ada keadaan "sesi sudah dibuka tapi jadwal masih aktif" bila salah
// satu tulisan gagal. Dua operasi ini idempotent: menonaktifkan jadwal yang
// sudah nonaktif tidak mengubah apa pun.

export async function bukaSesiDanNonaktifkanJadwal(params: {
  sesiId: string;
  jadwalId?: string;
  kode: string;
  catatan: string;
}): Promise<void> {
  const batch = writeBatch(getFirestore());

  batch.update(firestoreRefs.sesiDoc(params.sesiId), {
    status: "dibuka",
    openedAt: serverTimestamp(),
    catatan: params.catatan,
  });
  batch.set(firestoreRefs.kodePresensi(params.sesiId), {
    kode: params.kode,
    updatedAt: serverTimestamp(),
  });
  if (params.jadwalId) {
    batch.update(firestoreRefs.jadwalDoc(params.jadwalId), { aktif: false });
  }

  await batch.commit();
}

export async function tutupSesiDanNonaktifkanJadwal(params: {
  sesiId: string;
  jadwalId?: string;
}): Promise<void> {
  const batch = writeBatch(getFirestore());

  batch.update(firestoreRefs.sesiDoc(params.sesiId), {
    status: "ditutup",
    closedAt: serverTimestamp(),
  });
  if (params.jadwalId) {
    batch.update(firestoreRefs.jadwalDoc(params.jadwalId), { aktif: false });
  }

  await batch.commit();
}