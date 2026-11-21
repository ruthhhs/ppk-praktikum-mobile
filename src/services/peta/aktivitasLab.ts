import type {
  JadwalDoc,
  KelasDoc,
  PraktikumDoc,
  SesiDoc,
  SesiStatus,
  WithId,
} from '@/data/firestoreType';

// labId pada kelas ditambahkan oleh A (A1/A2). Dibuat opsional di sini agar file
// ini tetap valid sebelum KelasDoc diperbarui; kelas tanpa labId diabaikan.
export type KelasUntukAktivitas = WithId<KelasDoc> & { labId?: string };

export interface DataAktivitas {
  kelas: KelasUntukAktivitas[];
  jadwal: WithId<JadwalDoc>[];
  sesi: WithId<SesiDoc>[];
  praktikum: WithId<PraktikumDoc>[];
}

export interface AktivitasLabItem {
  jadwalId: string;
  kelasId: string;
  kelasNama: string;
  praktikumId: string;
  praktikumNama: string;
  tanggal: string; // YYYY-MM-DD (Asia/Jakarta)
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  statusSesi: SesiStatus;
}

export interface AktivitasLab {
  labId: string;
  berlangsung: AktivitasLabItem[];
  berikutnya: AktivitasLabItem | null;
}

const OFFSET_JAKARTA_MS = 7 * 60 * 60 * 1000; // UTC+7, tanpa DST

/** Tanggal (YYYY-MM-DD) dan menit-sejak-tengah-malam di Asia/Jakarta. */
export function waktuJakarta(sekarang: Date): { tanggal: string; menit: number } {
  const jakarta = new Date(sekarang.getTime() + OFFSET_JAKARTA_MS);
  return {
    tanggal: jakarta.toISOString().slice(0, 10),
    menit: jakarta.getUTCHours() * 60 + jakarta.getUTCMinutes(),
  };
}

function jamKeMenit(jam: string): number | null {
  const cocok = /^(\d{2}):(\d{2})$/.exec(jam);
  if (!cocok) return null;
  const jamAngka = Number(cocok[1]);
  const menitAngka = Number(cocok[2]);
  if (jamAngka > 23 || menitAngka > 59) return null;
  return jamAngka * 60 + menitAngka;
}

// Bila satu jadwal punya beberapa dokumen sesi, status yang menang:
// dibuka > ditutup > belum_dibuka.
const PRIORITAS_STATUS: Record<SesiStatus, number> = {
  dibuka: 0,
  ditutup: 1,
  belum_dibuka: 2,
};

function petakanStatusSesi(sesi: WithId<SesiDoc>[]): Map<string, SesiStatus> {
  const hasil = new Map<string, SesiStatus>();
  for (const s of sesi) {
    const lama = hasil.get(s.jadwalId);
    if (lama === undefined || PRIORITAS_STATUS[s.status] < PRIORITAS_STATUS[lama]) {
      hasil.set(s.jadwalId, s.status);
    }
  }
  return hasil;
}

/**
 * Menentukan aktivitas satu lab pada waktu `sekarang`.
 *
 * - berlangsung: jadwal aktif hari ini (Asia/Jakarta) milik kelas di lab ini
 *   yang jamnya mencakup sekarang ATAU sesinya berstatus dibuka.
 * - berikutnya: jadwal aktif terdekat setelah sekarang.
 * - jadwal tanpa dokumen sesi dianggap belum_dibuka.
 *
 * Data yang masuk sudah dibatasi sesuai hak baca pengguna oleh pemanggil.
 */
export function hitungAktivitasLab(
  labId: string,
  data: DataAktivitas,
  sekarang: Date = new Date(),
): AktivitasLab {
  const { tanggal: hariIni, menit: menitSekarang } = waktuJakarta(sekarang);

  const kelasDiLab = new Map<string, KelasUntukAktivitas>();
  for (const k of data.kelas) {
    if (k.labId === labId) kelasDiLab.set(k.id, k);
  }
  const praktikumPerId = new Map(data.praktikum.map((p) => [p.id, p]));
  const statusPerJadwal = petakanStatusSesi(data.sesi);

  const berlangsung: AktivitasLabItem[] = [];
  const kandidat: AktivitasLabItem[] = [];

  for (const j of data.jadwal) {
    if (!j.aktif) continue;
    const kelas = kelasDiLab.get(j.kelasId);
    if (!kelas) continue;

    const mulai = jamKeMenit(j.jamMulai);
    const selesai = jamKeMenit(j.jamSelesai);
    if (mulai === null || selesai === null) continue;

    const item: AktivitasLabItem = {
      jadwalId: j.id,
      kelasId: kelas.id,
      kelasNama: kelas.nama,
      praktikumId: kelas.praktikumId,
      praktikumNama:
        praktikumPerId.get(kelas.praktikumId)?.nama ?? 'Praktikum tidak diketahui',
      tanggal: j.tanggal,
      jamMulai: j.jamMulai,
      jamSelesai: j.jamSelesai,
      statusSesi: statusPerJadwal.get(j.id) ?? 'belum_dibuka',
    };

    if (j.tanggal === hariIni) {
      const mencakup = menitSekarang >= mulai && menitSekarang < selesai;
      if (mencakup || item.statusSesi === 'dibuka') {
        berlangsung.push(item);
      } else if (mulai > menitSekarang) {
        kandidat.push(item);
      }
    } else if (j.tanggal > hariIni) {
      // YYYY-MM-DD bisa dibandingkan sebagai string
      kandidat.push(item);
    }
  }

  berlangsung.sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  kandidat.sort(
    (a, b) =>
      a.tanggal.localeCompare(b.tanggal) || a.jamMulai.localeCompare(b.jamMulai),
  );

  return { labId, berlangsung, berikutnya: kandidat[0] ?? null };
}