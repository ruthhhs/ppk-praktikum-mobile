import type { Koordinat, LaboratoriumDenganId } from '@/data/lokasi';
import {
  auth,
  isFirebaseConfigured,
  isNativeFirebaseConfigured,
  rnAuth,
} from '@/services/firebase';
import {
  firestoreRefs,
  readDocument,
  serverTimestamp,
  setDocument,
} from '@/services/firebase/firestore';
import { hitungJarakMeter } from '@/utils/hitungJarakMeter';

export const BATAS_AKURASI_PRESENSI_METER = 50;

export type AlasanGagalKirimPresensi =
  | 'belum_login'
  | 'sesi_tidak_ditemukan'
  | 'belum_dibuka'
  | 'sudah_ditutup'
  | 'sudah_presensi'
  | 'izin_diterima'
  | 'kode_kosong'
  | 'kode_format'
  | 'kode_salah'
  | 'lokasi_tidak_tersedia'
  | 'lokasi_mock'
  | 'akurasi_buruk'
  | 'lab_tidak_aktif'
  | 'di_luar_radius'
  | 'gagal_jaringan';

export interface LokasiPresensiInput extends Koordinat {
  labId?: string;
}

export interface KirimPresensiOpsi {
  uid?: string;
  lab?: LaboratoriumDenganId | null;
  statusSesi?: 'belum_dibuka' | 'dibuka' | 'ditutup';
}

export type HasilKirimPresensi =
  | {
      ok: true;
      sesiId: string;
      userId: string;
      labId: string;
      waktuIso: string;
      jarakMeter: number;
      akurasi: number;
    }
  | {
      ok: false;
      reason: AlasanGagalKirimPresensi;
      pesan: string;
      jarakMeter?: number;
      radiusMeter?: number;
    };

const isFirestoreAktif = isFirebaseConfigured || isNativeFirebaseConfigured;

function formatMeterBulat(nilai: number): string {
  if (!Number.isFinite(nilai)) return '-';
  return `${Math.round(nilai)} m`;
}

function dalamRadiusBidangDatar(
  lokasi: { lat: number; lng: number },
  lab: { lat: number; lng: number; cosLat: number; radiusMeter: number },
): boolean {
  const selisihLatMeter = (lokasi.lat - lab.lat) * 110540;
  const selisihLngMeter = (lokasi.lng - lab.lng) * 111320 * lab.cosLat;
  return (
    selisihLatMeter * selisihLatMeter + selisihLngMeter * selisihLngMeter <=
    lab.radiusMeter * lab.radiusMeter
  );
}

export function apakahDalamRadiusLab(
  lokasi: { lat: number; lng: number },
  lab: { lat: number; lng: number; cosLat?: number; radiusMeter: number },
): { dalamRadius: boolean; jarakMeter: number } {
  const jarakMeter = hitungJarakMeter(
    { lat: lokasi.lat, lng: lokasi.lng },
    { lat: lab.lat, lng: lab.lng },
  );
  const cosLat =
    typeof lab.cosLat === 'number' && Number.isFinite(lab.cosLat)
      ? lab.cosLat
      : Math.cos((lab.lat * Math.PI) / 180);

  const dalamRadius =
    jarakMeter <= lab.radiusMeter &&
    dalamRadiusBidangDatar(lokasi, {
      lat: lab.lat,
      lng: lab.lng,
      cosLat,
      radiusMeter: lab.radiusMeter,
    });

  return { dalamRadius, jarakMeter };
}

function apakahErrorJaringan(err: unknown): boolean {
  const code = ((err as { code?: string })?.code ?? '').toLowerCase();
  const message = ((err as { message?: string })?.message ?? '').toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('network') ||
    code.includes('deadline-exceeded') ||
    message.includes('network') ||
    message.includes('offline')
  );
}

/**
 * Mencatat presensi berlokasi ke `sesi/{sesiId}/presensi/{uid}`.
 * Payload disesuaikan ketat dengan `firestore.rules` dan menerjemahkan
 * penolakan Rules maupun gangguan jaringan ke pesan bahasa Indonesia yang jelas.
 */
export async function kirimPresensi(
  sesiId: string,
  kode: string,
  lokasi: LokasiPresensiInput | null,
  opsi?: KirimPresensiOpsi,
): Promise<HasilKirimPresensi> {
  const uid =
    rnAuth?.currentUser?.uid ??
    auth?.currentUser?.uid ??
    opsi?.uid?.trim() ??
    '';

  if (!uid) {
    return {
      ok: false,
      reason: 'belum_login',
      pesan: 'Silakan masuk menggunakan akun Praktikan terlebih dahulu.',
    };
  }

  const targetSesiId = sesiId.trim();
  if (!targetSesiId) {
    return {
      ok: false,
      reason: 'sesi_tidak_ditemukan',
      pesan: 'Sesi praktikum tidak ditemukan.',
    };
  }

  if (opsi?.statusSesi === 'belum_dibuka') {
    return {
      ok: false,
      reason: 'belum_dibuka',
      pesan: 'Sesi praktikum belum dibuka oleh asisten.',
    };
  }

  if (opsi?.statusSesi === 'ditutup') {
    return {
      ok: false,
      reason: 'sudah_ditutup',
      pesan: 'Sesi praktikum telah ditutup.',
    };
  }

  const kodeBersih = kode.trim();
  if (kodeBersih.length === 0) {
    return {
      ok: false,
      reason: 'kode_kosong',
      pesan: 'Kode presensi wajib diisi.',
    };
  }

  if (!/^\d{4}$/.test(kodeBersih)) {
    return {
      ok: false,
      reason: 'kode_format',
      pesan: 'Kode presensi harus terdiri dari 4 digit angka.',
    };
  }

  if (
    !lokasi ||
    !Number.isFinite(lokasi.lat) ||
    !Number.isFinite(lokasi.lng) ||
    !Number.isFinite(lokasi.akurasi)
  ) {
    return {
      ok: false,
      reason: 'lokasi_tidak_tersedia',
      pesan:
        'Koordinat lokasi belum tersedia. Pastikan GPS aktif lalu segarkan lokasi.',
    };
  }

  if (lokasi.mocked) {
    return {
      ok: false,
      reason: 'lokasi_mock',
      pesan:
        'Lokasi palsu (mock location) terdeteksi. Matikan aplikasi lokasi palsu lalu coba lagi.',
    };
  }

  if (lokasi.akurasi < 0 || lokasi.akurasi > BATAS_AKURASI_PRESENSI_METER) {
    return {
      ok: false,
      reason: 'akurasi_buruk',
      pesan: `Akurasi GPS saat ini ±${Math.round(lokasi.akurasi)} m (maksimal ${BATAS_AKURASI_PRESENSI_METER} m). Pindah ke area yang lebih terbuka lalu segarkan lokasi.`,
    };
  }

  // Selesaikan data laboratorium (prioritas dari opsi yang sudah real-time, fallback baca Firestore)
  let labAktif = opsi?.lab ?? null;
  let labId = lokasi.labId?.trim() || labAktif?.id || '';

  if (isFirestoreAktif && (!labAktif || !labId)) {
    try {
      const sesiDoc = await readDocument(firestoreRefs.sesiDoc(targetSesiId));
      if (!sesiDoc) {
        return {
          ok: false,
          reason: 'sesi_tidak_ditemukan',
          pesan: 'Sesi praktikum tidak ditemukan.',
        };
      }
      if (sesiDoc.status === 'belum_dibuka') {
        return {
          ok: false,
          reason: 'belum_dibuka',
          pesan: 'Sesi praktikum belum dibuka oleh asisten.',
        };
      }
      if (sesiDoc.status === 'ditutup') {
        return {
          ok: false,
          reason: 'sudah_ditutup',
          pesan: 'Sesi praktikum telah ditutup.',
        };
      }

      const kelasDoc = await readDocument(
        firestoreRefs.kelasDoc(sesiDoc.kelasId),
      );
      labId = kelasDoc?.labId?.trim() ?? '';
      if (labId) {
        const fetchedLab = await readDocument(
          firestoreRefs.laboratoriumDoc(labId),
        );
        if (fetchedLab) {
          labAktif = { ...fetchedLab, id: labId };
        }
      }
    } catch (err) {
      if (apakahErrorJaringan(err)) {
        return {
          ok: false,
          reason: 'gagal_jaringan',
          pesan:
            'Koneksi internet terganggu saat memeriksa data sesi. Periksa jaringan lalu coba lagi.',
        };
      }
    }
  }

  if (!labId || !labAktif || !labAktif.aktif) {
    return {
      ok: false,
      reason: 'lab_tidak_aktif',
      pesan:
        'Laboratorium untuk kelas ini sedang tidak aktif atau belum ditentukan. Hubungi asisten praktikum.',
    };
  }

  const { dalamRadius: diDalamRadius, jarakMeter } = apakahDalamRadiusLab(
    lokasi,
    labAktif,
  );

  if (!diDalamRadius) {
    return {
      ok: false,
      reason: 'di_luar_radius',
      pesan: `Posisimu berada di luar radius laboratorium (${formatMeterBulat(jarakMeter)} dari batas ${labAktif.radiusMeter} m).`,
      jarakMeter,
      radiusMeter: labAktif.radiusMeter,
    };
  }

  const waktuIso = new Date().toISOString();

  if (!isFirestoreAktif) {
    return {
      ok: true,
      sesiId: targetSesiId,
      userId: uid,
      labId,
      waktuIso,
      jarakMeter,
      akurasi: lokasi.akurasi,
    };
  }

  // Payload ketat sesuai `firestore.rules` (create-only pada sesi/{sesiId}/presensi/{uid})
  const payload = {
    userId: uid,
    recordedAt: serverTimestamp(),
    kode: kodeBersih,
    labId,
    lat: lokasi.lat,
    lng: lokasi.lng,
    akurasi: lokasi.akurasi,
    mocked: lokasi.mocked,
  };

  try {
    await setDocument(
      firestoreRefs.presensiDoc(targetSesiId, uid),
      payload as unknown as {
        userId: string;
        recordedAt: ReturnType<typeof serverTimestamp>;
      },
    );

    return {
      ok: true,
      sesiId: targetSesiId,
      userId: uid,
      labId,
      waktuIso,
      jarakMeter,
      akurasi: lokasi.akurasi,
    };
  } catch (err) {
    if (apakahErrorJaringan(err)) {
      return {
        ok: false,
        reason: 'gagal_jaringan',
        pesan:
          'Koneksi internet terganggu. Presensi belum tercatat; periksa jaringan lalu coba lagi.',
      };
    }

    const code = ((err as { code?: string })?.code ?? '').toLowerCase();
    if (code.includes('already-exists')) {
      return {
        ok: false,
        reason: 'sudah_presensi',
        pesan:
          'Kamu sudah melakukan presensi pada sesi ini. Presensi kedua ditolak.',
      };
    }

    if (code.includes('permission-denied')) {
      return await terjemahkanPenolakanRules(
        targetSesiId,
        uid,
        labId,
        lokasi,
      );
    }

    return {
      ok: false,
      reason: 'gagal_jaringan',
      pesan:
        'Gagal menyimpan presensi ke Cloud Firestore. Periksa koneksi internet lalu coba lagi.',
    };
  }
}

async function terjemahkanPenolakanRules(
  sesiId: string,
  uid: string,
  labId: string,
  lokasi: LokasiPresensiInput,
): Promise<HasilKirimPresensi> {
  const [presensiExisting, izinExisting, sesiTerbaru, labTerbaru] =
    await Promise.all([
      readDocument(firestoreRefs.presensiDoc(sesiId, uid)).catch(() => null),
      readDocument(firestoreRefs.pengajuanIzinDoc(sesiId, uid)).catch(
        () => null,
      ),
      readDocument(firestoreRefs.sesiDoc(sesiId)).catch(() => null),
      readDocument(firestoreRefs.laboratoriumDoc(labId)).catch(() => null),
    ]);

  if (presensiExisting) {
    return {
      ok: false,
      reason: 'sudah_presensi',
      pesan:
        'Kamu sudah melakukan presensi pada sesi ini. Presensi kedua ditolak.',
    };
  }

  if (izinExisting?.status === 'diterima') {
    return {
      ok: false,
      reason: 'izin_diterima',
      pesan:
        'Pengajuan izin kamu pada sesi ini sudah diterima asisten, sehingga presensi tidak dapat dilakukan.',
    };
  }

  if (sesiTerbaru?.status === 'belum_dibuka') {
    return {
      ok: false,
      reason: 'belum_dibuka',
      pesan: 'Sesi praktikum belum dibuka oleh asisten.',
    };
  }

  if (sesiTerbaru?.status === 'ditutup') {
    return {
      ok: false,
      reason: 'sudah_ditutup',
      pesan: 'Sesi praktikum telah ditutup oleh asisten.',
    };
  }

  if (!labTerbaru || !labTerbaru.aktif) {
    return {
      ok: false,
      reason: 'lab_tidak_aktif',
      pesan:
        'Laboratorium untuk kelas ini sedang tidak aktif. Hubungi asisten praktikum.',
    };
  }

  if (lokasi.mocked) {
    return {
      ok: false,
      reason: 'lokasi_mock',
      pesan:
        'Lokasi palsu (mock location) terdeteksi. Nonaktifkan aplikasi lokasi palsu lalu coba lagi.',
    };
  }

  if (lokasi.akurasi > BATAS_AKURASI_PRESENSI_METER) {
    return {
      ok: false,
      reason: 'akurasi_buruk',
      pesan: `Akurasi GPS saat ini ±${Math.round(lokasi.akurasi)} m (maksimal ${BATAS_AKURASI_PRESENSI_METER} m).`,
    };
  }

  const jarakTerbaru = hitungJarakMeter(
    { lat: lokasi.lat, lng: lokasi.lng },
    { lat: labTerbaru.lat, lng: labTerbaru.lng },
  );
  const cosLatTerbaru =
    typeof labTerbaru.cosLat === 'number' && Number.isFinite(labTerbaru.cosLat)
      ? labTerbaru.cosLat
      : Math.cos((labTerbaru.lat * Math.PI) / 180);

  if (
    jarakTerbaru > labTerbaru.radiusMeter ||
    !dalamRadiusBidangDatar(lokasi, {
      lat: labTerbaru.lat,
      lng: labTerbaru.lng,
      cosLat: cosLatTerbaru,
      radiusMeter: labTerbaru.radiusMeter,
    })
  ) {
    return {
      ok: false,
      reason: 'di_luar_radius',
      pesan: `Presensi ditolak: posisimu (${formatMeterBulat(jarakTerbaru)}) berada di luar radius laboratorium (${labTerbaru.radiusMeter} m).`,
      jarakMeter: jarakTerbaru,
      radiusMeter: labTerbaru.radiusMeter,
    };
  }

  return {
    ok: false,
    reason: 'kode_salah',
    pesan: 'Kode presensi tidak sesuai.',
  };
}
