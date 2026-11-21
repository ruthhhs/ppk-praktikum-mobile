import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LaboratoriumDenganId } from '@/data/lokasi';
import type { Role } from '@/data/types';
import { useAuth } from '@/hooks/useAuth';
import { useLokasi } from '@/hooks/useLokasi';
import { pantauLaboratoriumAktif } from '@/services/firebase/firestore';
import {
  hitungAktivitasLab,
  type AktivitasLab,
  type DataAktivitas,
} from '@/services/peta/aktivitasLab';
import { listenDataAktivitas } from '@/services/peta/aktivitasLabService';

interface UseAktivitasLabResult {
  /** Daftar lab aktif dari Firestore */
  labs: LaboratoriumDenganId[];
  /** Lokasi */
  lokasi: ReturnType<typeof useLokasi>;
  /** Aktivitas per lab (hitung dari data mentah) */
  aktivitasPerLab: Map<string, AktivitasLab>;
  /** Sedang memuat data? */
  memuat: boolean;
  /** Pesan galat */
  galat: string | null;
  /** Muat ulang data aktivitas */
  cobaLagi: () => void;
  /** Waktu sekarang (diperbarui tiap menit) */
  sekarang: Date;
}

const PESAN_GAGAL_LAB = 'Gagal memuat daftar laboratorium. Periksa koneksi, lalu coba lagi.';
const PESAN_GAGAL_AKTIVITAS = 'Gagal memuat aktivitas laboratorium. Periksa koneksi, lalu coba lagi.';

export function useAktivitasLab(peran: Role): UseAktivitasLabResult {
  const { user, profile } = useAuth();
  const uid = profile?.uid ?? user?.uid ?? null;

  const lokasi = useLokasi();

  // === Daftar lab dari Firestore ===
  const [labs, setLabs] = useState<LaboratoriumDenganId[]>([]);
  const [labMemuat, setLabMemuat] = useState(true);
  const [labGalat, setLabGalat] = useState<string | null>(null);

  useEffect(() => {
    setLabMemuat(true);
    setLabGalat(null);

    const unsubscribe = pantauLaboratoriumAktif(
      (items) => {
        setLabs(items);
        setLabMemuat(false);
        setLabGalat(null);
      },
      () => {
        setLabMemuat(false);
        setLabGalat(PESAN_GAGAL_LAB);
      },
    );

    return unsubscribe;
  }, []);

  // === Data aktivitas (jadwal, sesi, kelas, praktikum) ===
  const [dataAktivitas, setDataAktivitas] = useState<DataAktivitas | null>(null);
  const [aktivitasMemuat, setAktivitasMemuat] = useState(true);
  const [aktivitasGalat, setAktivitasGalat] = useState<string | null>(null);
  const [percobaan, setPercobaan] = useState(0);

  useEffect(() => {
    if (!uid) {
      setAktivitasMemuat(false);
      setDataAktivitas(null);
      return;
    }

    setAktivitasMemuat(true);
    setAktivitasGalat(null);

    const unsubscribe = listenDataAktivitas(
      uid,
      peran,
      (data) => {
        setDataAktivitas(data);
        setAktivitasMemuat(false);
        setAktivitasGalat(null);
      },
      () => {
        setAktivitasMemuat(false);
        setAktivitasGalat(PESAN_GAGAL_AKTIVITAS);
      },
    );

    return unsubscribe;
  }, [uid, peran, percobaan]);

  // === Waktu sekarang, disegarkan tiap menit ===
  const [sekarang, setSekarang] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // === Hitung aktivitas per lab ===
  const aktivitasPerLab = useMemo(() => {
    const peta = new Map<string, AktivitasLab>();
    if (!dataAktivitas) return peta;

    for (const lab of labs) {
      peta.set(lab.id, hitungAktivitasLab(lab.id, dataAktivitas, sekarang));
    }
    return peta;
  }, [labs, dataAktivitas, sekarang]);

  const cobaLagi = useCallback(() => {
    setPercobaan((n) => n + 1);
  }, []);

  return {
    labs,
    lokasi,
    aktivitasPerLab,
    memuat: labMemuat || aktivitasMemuat,
    galat: labGalat ?? aktivitasGalat,
    cobaLagi,
    sekarang,
  };
}
