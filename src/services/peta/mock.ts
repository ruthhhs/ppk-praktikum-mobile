import type { FirestoreError } from '@react-native-firebase/firestore';
import type {
  JadwalDoc,
  KelasDoc,
  PraktikumDoc,
  SesiDoc,
  WithId,
} from '@/data/firestoreType';
import type { Role } from '@/data/types';
import type { FirestoreListenerError } from '@/services/firebase/firestore';
import type { DataAktivitas, KelasUntukAktivitas } from './aktivitasLab';
import type { LabPeta } from './tipe';

// DATA TIRUAN: hanya untuk membangun UI sebelum labId/Rules lab (A2, A3) masuk.
// Jangan diimpor dari kode produksi selain lewat satu flag di hook.
//
// Jadwal dibuat RELATIF terhadap waktu sekarang agar "berlangsung" dan
// "berikutnya" selalu ada saat dicoba kapan pun. Catatan: bila dijalankan
// sekitar tengah malam WIB, jadwal yang melewati pergantian hari tidak akan
// cocok dengan aturan "hari ini"; itu keterbatasan data tiruan, bukan bug.

const OFFSET_JAKARTA_MS = 7 * 60 * 60 * 1000;
const MENIT = 60 * 1000;

function buatLab(
  id: string,
  nama: string,
  deskripsi: string,
  lat: number,
  lng: number,
  aktif = true,
): LabPeta {
  return { id, nama, deskripsi, lat, lng, radiusMeter: 100, aktif };
}

// Koordinat fiktif di sekitar Jepara; ganti dengan data asli dari A2.
export const LAB_TIRUAN: LabPeta[] = [
  buatLab('lab-b', 'Lab B', 'Laboratorium B (tiruan)', -6.5891, 110.6684),
  buatLab('lab-c', 'Lab C', 'Laboratorium C (tiruan)', -6.5896, 110.6692),
  buatLab('lab-d', 'Lab D', 'Laboratorium D (tiruan)', -6.5903, 110.6679),
  buatLab('lab-ap', 'Lab AP', 'Laboratorium AP (tiruan)', -6.5885, 110.6701),
];

function waktuRelatif(sekarang: Date, mulaiMenit: number, durasiMenit: number) {
  const mulai = new Date(
    sekarang.getTime() + mulaiMenit * MENIT + OFFSET_JAKARTA_MS,
  ).toISOString();
  const selesai = new Date(
    sekarang.getTime() + (mulaiMenit + durasiMenit) * MENIT + OFFSET_JAKARTA_MS,
  ).toISOString();
  return {
    tanggal: mulai.slice(0, 10),
    jamMulai: mulai.slice(11, 16),
    jamSelesai: selesai.slice(11, 16),
  };
}

function waktuHariKe(
  sekarang: Date,
  hari: number,
  jamMulai: string,
  jamSelesai: string,
) {
  const tanggal = new Date(
    sekarang.getTime() + hari * 24 * 60 * MENIT + OFFSET_JAKARTA_MS,
  )
    .toISOString()
    .slice(0, 10);
  return { tanggal, jamMulai, jamSelesai };
}

/**
 * Skenario yang tercakup:
 * - Lab B: dua kelas berlangsung (satu sesi dibuka, satu ditutup), jadwal
 *   nonaktif yang harus diabaikan, berikutnya besok.
 * - Lab C: berlangsung tanpa dokumen sesi (dianggap belum_dibuka), berikutnya
 *   beberapa jam lagi.
 * - Lab D: jadwal hari ini sudah lewat (tidak tampil), berikutnya lusa.
 * - Lab AP: tidak ada jadwal sama sekali (kondisi kosong).
 */
export function buatDataAktivitasTiruan(
  uid = 'uid-tiruan',
  peran: Role = 'praktikan',
  sekarang: Date = new Date(),
): DataAktivitas {
  const praktikum: WithId<PraktikumDoc>[] = [
    ['prak-mobile', 'Pemrograman Mobile'],
    ['prak-basisdata', 'Basis Data'],
    ['prak-jarkom', 'Jaringan Komputer'],
  ].map(([id, nama]) => ({
    id,
    nama,
    deskripsi: '',
    aktif: true,
    praktikanUids: peran === 'praktikan' ? [uid] : [],
    createdAt: null,
    updatedAt: null,
  }));

  const buatKelas = (
    id: string,
    nama: string,
    praktikumId: string,
    labId: string,
  ): KelasUntukAktivitas => ({
    id,
    nama,
    praktikumId,
    labId,
    asistenUids: peran === 'asisten' ? [uid] : ['asisten-lain'],
    praktikanUids: peran === 'praktikan' ? [uid] : [],
    aktif: true,
    createdAt: null,
    updatedAt: null,
  });

  const kelas: KelasUntukAktivitas[] = [
    buatKelas('kelas-a1', 'A1', 'prak-mobile', 'lab-b'),
    buatKelas('kelas-a2', 'A2', 'prak-basisdata', 'lab-b'),
    buatKelas('kelas-b1', 'B1', 'prak-jarkom', 'lab-c'),
    buatKelas('kelas-c2', 'C2', 'prak-mobile', 'lab-c'),
    buatKelas('kelas-d1', 'D1', 'prak-basisdata', 'lab-d'),
  ];

  const buatJadwal = (
    id: string,
    kelasId: string,
    pertemuanKe: number,
    waktu: { tanggal: string; jamMulai: string; jamSelesai: string },
    aktif = true,
  ): WithId<JadwalDoc> => ({
    id,
    kelasId,
    pertemuanKe,
    ...waktu,
    lokasi: 'Gedung Lab (tiruan)',
    aktif,
  });

  const jadwal: WithId<JadwalDoc>[] = [
    buatJadwal('j-b-a2-kini', 'kelas-a2', 3, waktuRelatif(sekarang, -30, 90)),
    buatJadwal('j-b-a1-kini', 'kelas-a1', 4, waktuRelatif(sekarang, -45, 75)),
    buatJadwal('j-b-a1-besok', 'kelas-a1', 5, waktuHariKe(sekarang, 1, '08:00', '10:00')),
    buatJadwal('j-b-nonaktif', 'kelas-a2', 9, waktuRelatif(sekarang, -5, 60), false),
    buatJadwal('j-c-b1-kini', 'kelas-b1', 2, waktuRelatif(sekarang, -10, 90)),
    buatJadwal('j-c-c2-nanti', 'kelas-c2', 1, waktuRelatif(sekarang, 180, 90)),
    buatJadwal('j-d-d1-lalu', 'kelas-d1', 6, waktuRelatif(sekarang, -240, 90)),
    buatJadwal('j-d-d1-lusa', 'kelas-d1', 7, waktuHariKe(sekarang, 2, '10:00', '12:00')),
  ];

  const buatSesi = (
    jadwalId: string,
    kelasId: string,
    status: SesiDoc['status'],
  ): WithId<SesiDoc> => ({
    id: `sesi-${jadwalId}`,
    jadwalId,
    kelasId,
    status,
    catatan: '',
    openedAt: null,
    closedAt: null,
  });

  // j-c-b1-kini sengaja tanpa dokumen sesi.
  const sesi: WithId<SesiDoc>[] = [
    buatSesi('j-b-a2-kini', 'kelas-a2', 'dibuka'),
    buatSesi('j-b-a1-kini', 'kelas-a1', 'ditutup'),
    buatSesi('j-d-d1-lalu', 'kelas-d1', 'ditutup'),
  ];

  return { kelas, jadwal, sesi, praktikum };
}

export type ModeTiruan = 'normal' | 'kosong' | 'gagal';

/**
 * Meniru tanda tangan listenDataAktivitas (aktivitasLabService.ts) agar hook
 * bisa berganti sumber lewat satu flag. Data tiba setelah jeda singkat untuk
 * menguji keadaan memuat. Mode 'kosong' dan 'gagal' menguji keadaan kosong
 * dan galat/offline.
 */
export function listenDataAktivitasTiruan(
  uid: string,
  peran: Role,
  onValue: (data: DataAktivitas) => void,
  onError: FirestoreListenerError,
  opsi: { mode?: ModeTiruan; tundaMs?: number } = {},
): () => void {
  const { mode = 'normal', tundaMs = 400 } = opsi;

  const timer = setTimeout(() => {
    if (mode === 'gagal') {
      onError({
        code: 'unavailable',
        message: 'Mode tiruan: jaringan terganggu',
      } as unknown as FirestoreError);
      return;
    }
    onValue(
      mode === 'kosong'
        ? { kelas: [], jadwal: [], sesi: [], praktikum: [] }
        : buatDataAktivitasTiruan(uid, peran),
    );
  }, tundaMs);

  return () => clearTimeout(timer);
}