import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PanelInfoLab from '@/components/peta/PanelInfoLab';
import PetaLab from '@/components/peta/PetaLab';
import Button from '@/components/ui/Button';
import { colors } from '@/constants/theme';
import type { LaboratoriumDoc } from '@/data/lokasi';
import type { Role } from '@/data/types';
import { useAuth } from '@/hooks/useAuth';
import { useLokasi } from '@/hooks/useLokasi';
import {
  pantauLaboratorium,
  pantauLaboratoriumAktif,
  pastikanLaboratoriumTetap,
  type WithId,
} from '@/services/firebase/firestore';
import {
  hitungAktivitasLab,
  type DataAktivitas,
} from '@/services/peta/aktivitasLab';
import { listenDataAktivitas } from '@/services/peta/aktivitasLabService';

// Layar Maps untuk kedua peran (asisten/peta dan praktikan/peta), B3.
// - Lab: Asisten membaca semua lab; Praktikan hanya lab aktif (sesuai Rules).
// - Aktivitas: dibatasi hak baca lewat listenDataAktivitas, lalu dihitung
//   per lab dengan hitungAktivitasLab.
// - Lokasi: useLokasi() (A4), ditampilkan oleh PetaLab (B2).
// Semua state dari listener diturunkan lewat kunci "percobaan" sehingga tidak
// ada setState sinkron di badan efek.

type HasilLab = {
  kunci: number;
  items: WithId<LaboratoriumDoc>[];
  galat: string;
};
type HasilAktivitas = {
  kunci: number;
  data: DataAktivitas | null;
  galat: string;
};

function pesanGalat(error: unknown, apa: string): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'unknown';
  if (code.includes('permission-denied')) {
    return `Akses ke ${apa} ditolak oleh Rules.`;
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Tidak ada koneksi ke Firestore. Periksa jaringan lalu coba lagi.';
  }
  return `Gagal memuat ${apa} (${code}).`;
}

export default function PetaScreen({ peran }: { peran: Role }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { status, koordinat, mintaIzin, segarkan } = useLokasi();

  const [percobaan, setPercobaan] = useState(0);
  const [hasilLab, setHasilLab] = useState<HasilLab | null>(null);
  const [hasilAktivitas, setHasilAktivitas] = useState<HasilAktivitas | null>(null);
  const [labTerpilihId, setLabTerpilihId] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState(() => new Date());

// Daftar lab (real-time). Asisten juga memastikan dokumen lab tetap tersedia.
useEffect(() => {
  if (!uid) return undefined;

  let masihTerpasang = true;

  const pantau =
    peran === 'asisten' ? pantauLaboratorium : pantauLaboratoriumAktif;

  const berhentiPantau = pantau(
    (items) => setHasilLab({ kunci: percobaan, items, galat: '' }),
    (error) =>
      setHasilLab({
        kunci: percobaan,
        items: [],
        galat: pesanGalat(error, 'laboratorium'),
      }),
  );

  if (peran === 'asisten') {
    void pastikanLaboratoriumTetap().catch((error) => {
      if (!masihTerpasang) return;

      setHasilLab({
        kunci: percobaan,
        items: [],
        galat: pesanGalat(error, 'laboratorium'),
      });
    });
  }

  return () => {
    masihTerpasang = false;
    berhentiPantau();
  };
}, [uid, peran, percobaan]);

  // Data aktivitas (real-time, dibatasi hak baca).
  useEffect(() => {
    if (!uid) return undefined;
    return listenDataAktivitas(
      uid,
      peran,
      (data) => setHasilAktivitas({ kunci: percobaan, data, galat: '' }),
      (error) =>
        setHasilAktivitas({
          kunci: percobaan,
          data: null,
          galat: pesanGalat(error, 'aktivitas laboratorium'),
        }),
    );
  }, [uid, peran, percobaan]);

  // Segarkan "sekarang" tiap menit agar berlangsung/berikutnya ikut bergeser.
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const labSiap = hasilLab?.kunci === percobaan;
  const memuatLab = !!uid && !labSiap;
  const galatLab = labSiap ? hasilLab.galat : '';

  const aktivitasSiap = hasilAktivitas?.kunci === percobaan;
  const memuatAktivitas = !!uid && !aktivitasSiap;
  const galatAktivitas = aktivitasSiap ? hasilAktivitas.galat : '';

  const daftarLab = useMemo(
    () =>
      [...(hasilLab?.items ?? [])].sort((a, b) =>
        a.nama.localeCompare(b.nama, 'id-ID'),
      ),
    [hasilLab],
  );

  const labTerpilih = daftarLab.find((lab) => lab.id === labTerpilihId) ?? null;

  const aktivitas = useMemo(
    () =>
      labTerpilih && hasilAktivitas?.data
        ? hitungAktivitasLab(labTerpilih.id, hasilAktivitas.data, sekarang)
        : null,
    [labTerpilih, hasilAktivitas, sekarang],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.layar}>
      <PetaLab
        style={styles.peta}
        daftarLab={daftarLab}
        koordinatPengguna={koordinat}
        statusLokasi={status}
        onMintaIzin={mintaIzin}
        onSegarkan={segarkan}
        labTerpilihId={labTerpilihId}
        onPilihLab={setLabTerpilihId}
        memuat={memuatLab}
        pesanGalat={galatLab || undefined}
      />

      {galatLab ? (
        <View style={styles.coba}>
          <Button
            title="Coba lagi"
            variant="secondary"
            onPress={() => setPercobaan((n) => n + 1)}
          />
        </View>
      ) : null}

      {labTerpilih ? (
        <View style={styles.panelWadah}>
          <PanelInfoLab
            lab={labTerpilih}
            aktivitas={aktivitas}
            memuat={memuatAktivitas}
            galat={galatAktivitas || null}
            onTutup={() => setLabTerpilihId(null)}
            onCobaLagi={() => setPercobaan((n) => n + 1)}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layar: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  peta: {
    flex: 1,
  },
  panelWadah: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  coba: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
});