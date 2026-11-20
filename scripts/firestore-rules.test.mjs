import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-sip";
const LAB_ID = "lab-b";
const KELAS_ID = "kelas-a";
const SESI_1_ID = "sesi-1";
const SESI_2_ID = "sesi-2";
const PRAKTIKAN_UID = "praktikan-1";
const TOKEN_FCM = "token-uji-1";

const rulesPath = fileURLToPath(
  new URL("../firestore.rules", import.meta.url),
);

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(rulesPath, "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.now();

    await setDoc(doc(db, "users", "asisten-1"), {
      role: "asisten",
    });

    await setDoc(doc(db, "users", "asisten-2"), {
      role: "asisten",
    });

    await setDoc(doc(db, "users", PRAKTIKAN_UID), {
      role: "praktikan",
    });

    await setDoc(doc(db, "users", "praktikan-2"), {
      role: "praktikan",
    });

    await setDoc(doc(db, "laboratorium", LAB_ID), {
      nama: "Lab B",
      deskripsi: "Data lab untuk pengujian emulator",
      lat: -7.0482375,
      lng: 110.440765625,
      cosLat: Math.cos((-7.0482375 * Math.PI) / 180),
      radiusMeter: 100,
      aktif: true,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "kelas", KELAS_ID), {
      praktikumId: "praktikum-a",
      nama: "Kelas A",
      labId: LAB_ID,
      asistenUids: ["asisten-1"],
      praktikanUids: [PRAKTIKAN_UID],
      aktif: true,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(
      doc(db, "kelas", KELAS_ID, "peserta", PRAKTIKAN_UID),
      {
        uid: PRAKTIKAN_UID,
        nama: "Praktikan Uji",
        aktif: true,
        joinedAt: now,
      },
    );

    await setDoc(doc(db, "sesi", SESI_1_ID), {
      jadwalId: "jadwal-1",
      kelasId: KELAS_ID,
      status: "dibuka",
      catatan: "",
      openedAt: now,
      closedAt: null,
      aktif: true,
    });

    await setDoc(doc(db, "sesi", SESI_2_ID), {
      jadwalId: "jadwal-2",
      kelasId: KELAS_ID,
      status: "dibuka",
      catatan: "",
      openedAt: now,
      closedAt: null,
      aktif: true,
    });

    await setDoc(doc(db, "kodePresensi", SESI_1_ID), {
      kode: "1234",
      updatedAt: now,
    });

    await setDoc(doc(db, "kodePresensi", SESI_2_ID), {
      kode: "5678",
      updatedAt: now,
    });

    await setDoc(
      doc(db, "users", PRAKTIKAN_UID, "notifikasi", "notif-1"),
      {
        tipe: "sesi_dibuka",
        judul: "Sesi dibuka",
        isi: "Sesi praktikum sudah dibuka.",
        sesiId: SESI_1_ID,
        dibaca: false,
        createdAt: now,
      },
    );
  });
});

after(async () => {
  await testEnv.cleanup();
});

function dataPresensi(overrides = {}) {
  return {
    userId: PRAKTIKAN_UID,
    recordedAt: serverTimestamp(),
    kode: "1234",
    labId: LAB_ID,
    lat: -7.0482375,
    lng: 110.440765625,
    akurasi: 10,
    mocked: false,
    ...overrides,
  };
}

function referensiPresensi(db, sesiId = SESI_1_ID) {
  return doc(db, "sesi", sesiId, "presensi", PRAKTIKAN_UID);
}

function dataLaboratorium(overrides = {}) {
  return {
    nama: "Lab Uji",
    deskripsi: "Laboratorium untuk tes rules",
    lat: -7.0482375,
    lng: 110.440765625,
    cosLat: Math.cos((-7.0482375 * Math.PI) / 180),
    radiusMeter: 150,
    aktif: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

test("praktikan boleh presensi di dalam radius pada sesi yang dibuka", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    setDoc(referensiPresensi(db), dataPresensi()),
  );
});

test("praktikan ditolak jika koordinat di luar radius lab", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ lat: -7.052 }),
    ),
  );
});

test("praktikan ditolak jika lokasi ditandai mock", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ mocked: true }),
    ),
  );
});

test("praktikan ditolak jika akurasi GPS lebih dari 50 meter", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ akurasi: 51 }),
    ),
  );
});

test("praktikan boleh presensi dengan akurasi GPS tepat 50 meter", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ akurasi: 50 }),
    ),
  );
});

test("praktikan ditolak jika memakai kode presensi yang salah", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ kode: "9999" }),
    ),
  );
});

test("praktikan ditolak jika mengirim labId yang salah", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      referensiPresensi(db),
      dataPresensi({ labId: "lab-lain" }),
    ),
  );
});

test("praktikan tidak dapat presensi dua kali pada sesi yang sama", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();
  const presensiRef = referensiPresensi(db);

  await assertSucceeds(setDoc(presensiRef, dataPresensi()));
  await assertFails(setDoc(presensiRef, dataPresensi()));
});

test("presensi pada satu sesi tidak memblokir sesi lain", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    setDoc(referensiPresensi(db, SESI_1_ID), dataPresensi()),
  );

  await assertSucceeds(
    setDoc(
      referensiPresensi(db, SESI_2_ID),
      dataPresensi({ kode: "5678" }),
    ),
  );
});

test("praktikan ditolak jika sesi sudah ditutup", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "sesi", SESI_1_ID), {
      jadwalId: "jadwal-1",
      kelasId: KELAS_ID,
      status: "ditutup",
      catatan: "",
      openedAt: Timestamp.now(),
      closedAt: Timestamp.now(),
      aktif: true,
    });
  });

  await assertFails(
    setDoc(referensiPresensi(db), dataPresensi()),
  );
});

test("praktikan bisa membaca laboratorium aktif", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    getDoc(doc(db, "laboratorium", LAB_ID)),
  );
});

test("praktikan tidak bisa membuat laboratorium", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(doc(db, "laboratorium", "lab-client"), dataLaboratorium()),
  );
});

test("asisten bisa membuat laboratorium dengan data valid", async () => {
  const db = testEnv.authenticatedContext("asisten-1").firestore();

  await assertSucceeds(
    setDoc(doc(db, "laboratorium", "lab-asisten"), dataLaboratorium()),
  );
});

test("asisten kelas bisa memperbarui kelasnya", async () => {
  const db = testEnv.authenticatedContext("asisten-1").firestore();

  await assertSucceeds(
    updateDoc(doc(db, "kelas", KELAS_ID), {
      updatedAt: serverTimestamp(),
    }),
  );
});

test("asisten yang tidak terdaftar di kelas ditolak saat memperbarui kelas", async () => {
  const db = testEnv.authenticatedContext("asisten-2").firestore();

  await assertFails(
    updateDoc(doc(db, "kelas", KELAS_ID), {
      updatedAt: serverTimestamp(),
    }),
  );
});

test("pengguna bisa mendaftarkan token perangkat miliknya", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    setDoc(
      doc(db, "users", PRAKTIKAN_UID, "perangkat", TOKEN_FCM),
      {
        tokenFcm: TOKEN_FCM,
        platform: "android",
        updatedAt: serverTimestamp(),
      },
    ),
  );
});

test("pengguna tidak bisa mendaftarkan token ke akun orang lain", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      doc(db, "users", "praktikan-2", "perangkat", TOKEN_FCM),
      {
        tokenFcm: TOKEN_FCM,
        platform: "android",
        updatedAt: serverTimestamp(),
      },
    ),
  );
});

test("pengguna bisa membaca notifikasinya sendiri", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    getDoc(
      doc(db, "users", PRAKTIKAN_UID, "notifikasi", "notif-1"),
    ),
  );
});

test("pengguna tidak bisa membaca notifikasi akun lain", async () => {
  const db = testEnv.authenticatedContext("praktikan-2").firestore();

  await assertFails(
    getDoc(
      doc(db, "users", PRAKTIKAN_UID, "notifikasi", "notif-1"),
    ),
  );
});

test("pengguna bisa menandai notifikasinya sebagai dibaca", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertSucceeds(
    updateDoc(
      doc(db, "users", PRAKTIKAN_UID, "notifikasi", "notif-1"),
      { dibaca: true },
    ),
  );
});

test("pengguna tidak bisa membuat dokumen notifikasi sendiri", async () => {
  const db = testEnv.authenticatedContext(PRAKTIKAN_UID).firestore();

  await assertFails(
    setDoc(
      doc(db, "users", PRAKTIKAN_UID, "notifikasi", "notif-baru"),
      {
        tipe: "sesi_dibuka",
        judul: "Notifikasi palsu",
        isi: "Dibuat oleh client.",
        dibaca: false,
        createdAt: serverTimestamp(),
      },
    ),
  );
});