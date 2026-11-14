import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    dummyPraktikum,
    dummyPresensi,
    dummySesi,
    dummyUsers,
} from "../../data/dummy";
import type { SesiStatus } from "../../data/types";
import { useApp } from "../../hooks/useApp";

export type SesiAsisten = {
  id: string;
  praktikum: string;
  pertemuanKe: number;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SesiStatus;
  catatan?: string;
  kodePresensi?: string;
  hadir: number;
  total: number;
};

export type DraftSesi = Omit<SesiAsisten, "id" | "status" | "hadir" | "total">;
export type StatusIzin = "menunggu" | "diterima" | "ditolak";

export type PengajuanIzin = {
  id: string;
  sesiId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  alasan: string;
  kategoriAI?: string;
  statusKlasifikasi: "berhasil" | "gagal";
  status: StatusIzin;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

type Result = { success: boolean; message: string };

type AsistenWorkflowStoreValue = {
  sesi: SesiAsisten[];
  pengajuan: PengajuanIzin[];
  simpanSesi: (draft: DraftSesi, id?: string) => Result;
  hapusSesi: (id: string) => Result;
  buka: (id: string, kode: string, catatan?: string) => Result;
  tutup: (id: string) => Result;
  putuskanIzin: (id: string, keputusan: "diterima" | "ditolak") => Result;
};

const initialSesi: SesiAsisten[] = dummySesi.map((item) => {
  const praktikum = dummyPraktikum.find(
    (course) => course.id === item.praktikumId,
  );
  return {
    id: item.id,
    praktikum: praktikum?.nama ?? "Praktikum",
    pertemuanKe: item.pertemuanKe,
    kelas: item.kelas,
    lab: item.lab,
    tanggal: item.tanggal,
    jamMulai: item.jamMulai,
    jamSelesai: item.jamSelesai,
    status: item.status,
    catatan: item.catatan,
    kodePresensi: item.kodePresensi,
    hadir: dummyPresensi.filter((attendance) => attendance.sesiId === item.id)
      .length,
    total: dummyUsers.filter((user) => user.role === "praktikan").length,
  };
});

const initialPengajuan: PengajuanIzin[] = [
  {
    id: "izin-001",
    sesiId: "sesi-001",
    praktikanId: "user-002",
    nama: "Budi Santoso",
    nim: "240101002",
    alasan: "Saya sedang demam dan tidak dapat mengikuti praktikum hari ini.",
    statusKlasifikasi: "gagal",
    status: "menunggu",
    createdAt: "2026-10-23T06:45:00+07:00",
  },
  {
    id: "izin-002",
    sesiId: "sesi-002",
    praktikanId: "user-005",
    nama: "Eko Saputra",
    nim: "240101005",
    alasan: "Ada keperluan keluarga mendadak yang harus saya dampingi.",
    statusKlasifikasi: "gagal",
    status: "menunggu",
    createdAt: "2026-10-24T07:10:00+07:00",
  },
];

const StoreContext = createContext<AsistenWorkflowStoreValue | null>(null);

export function AsistenWorkflowStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    currentUser,
    sesi: sesiBersama,
    presensi,
    bukaSesi,
    tutupSesi,
  } = useApp();
  const [sesiLokal, setSesiLokal] = useState(initialSesi);
  const [pengajuan, setPengajuan] = useState(initialPengajuan);

  const sesi = useMemo(
    () =>
      sesiLokal.map((item) => {
        const shared = sesiBersama.find((entry) => entry.id === item.id);
        const attendanceCount = presensi.filter(
          (entry) => entry.sesiId === item.id,
        ).length;
        return {
          ...item,
          status: shared?.status ?? item.status,
          hadir: attendanceCount,
          catatan: shared?.catatan ?? item.catatan,
          kodePresensi: shared?.kodePresensi ?? item.kodePresensi,
        };
      }),
    [presensi, sesiBersama, sesiLokal],
  );

  function requireAssistant(): Result | null {
    return currentUser?.role === "asisten"
      ? null
      : { success: false, message: "Aksi ini hanya tersedia untuk Asisten." };
  }

  function simpanSesi(draft: DraftSesi, id?: string): Result {
    const authError = requireAssistant();
    if (authError) return authError;
    if (!draft.praktikum.trim() || !draft.kelas.trim() || !draft.lab.trim()) {
      return {
        success: false,
        message: "Praktikum, kelas, dan lokasi wajib diisi.",
      };
    }
    if (!Number.isInteger(draft.pertemuanKe) || draft.pertemuanKe < 1) {
      return {
        success: false,
        message: "Pertemuan harus berupa angka mulai dari 1.",
      };
    }
    const sessionId = id ?? `sesi-${Date.now()}`;
    const previous = sesiLokal.find((item) => item.id === sessionId);
    const next: SesiAsisten = {
      ...draft,
      id: sessionId,
      status: previous?.status ?? "belum_dibuka",
      hadir: previous?.hadir ?? 0,
      total: previous?.total ?? initialSesi[0].total,
    };
    setSesiLokal((items) =>
      previous
        ? items.map((item) => (item.id === sessionId ? next : item))
        : [...items, next],
    );
    return {
      success: true,
      message: id ? "Sesi berhasil diperbarui." : "Sesi berhasil ditambahkan.",
    };
  }

  function hapusSesi(id: string): Result {
    const authError = requireAssistant();
    if (authError) return authError;
    const item = sesi.find((entry) => entry.id === id);
    if (!item) return { success: false, message: "Sesi tidak ditemukan." };
    const hasRequests = pengajuan.some((entry) => entry.sesiId === id);
    if (item.status !== "belum_dibuka" || item.hadir > 0 || hasRequests) {
      return {
        success: false,
        message:
          "Sesi berstatus aktif atau memiliki riwayat; sesi tidak dapat dihapus.",
      };
    }
    setSesiLokal((items) => items.filter((entry) => entry.id !== id));
    return { success: true, message: "Sesi berhasil dihapus." };
  }

  function buka(id: string, kode: string, catatan?: string): Result {
    const authError = requireAssistant();
    if (authError) return authError;
    if (!/^\d{4}$/.test(kode))
      return { success: false, message: "Kode presensi harus tepat 4 digit." };
    const item = sesi.find((entry) => entry.id === id);
    if (!item || item.status !== "belum_dibuka") {
      return {
        success: false,
        message: "Hanya sesi yang belum dibuka yang dapat dimulai.",
      };
    }
    const shared = sesiBersama.find((entry) => entry.id === id);
    if (shared) bukaSesi(id, kode);
    setSesiLokal((items) =>
      items.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: "dibuka",
              kodePresensi: kode,
              catatan: catatan?.trim() || entry.catatan,
            }
          : entry,
      ),
    );
    return { success: true, message: "Sesi berhasil dibuka." };
  }

  function tutup(id: string): Result {
    const authError = requireAssistant();
    if (authError) return authError;
    const item = sesi.find((entry) => entry.id === id);
    if (!item || item.status !== "dibuka") {
      return {
        success: false,
        message: "Hanya sesi yang dibuka yang dapat ditutup.",
      };
    }
    if (sesiBersama.some((entry) => entry.id === id)) tutupSesi(id);
    setSesiLokal((items) =>
      items.map((entry) =>
        entry.id === id ? { ...entry, status: "ditutup" } : entry,
      ),
    );
    return { success: true, message: "Sesi berhasil ditutup." };
  }

  function putuskanIzin(id: string, keputusan: "diterima" | "ditolak"): Result {
    if (!currentUser || currentUser.role !== "asisten") {
      return {
        success: false,
        message: "Aksi ini hanya tersedia untuk Asisten.",
      };
    }
    const item = pengajuan.find((entry) => entry.id === id);
    if (!item) return { success: false, message: "Pengajuan tidak ditemukan." };
    if (item.status !== "menunggu")
      return { success: false, message: "Pengajuan sudah diputuskan." };
    const alreadyAttended = presensi.some(
      (entry) =>
        entry.sesiId === item.sesiId && entry.praktikanId === item.praktikanId,
    );
    if (keputusan === "diterima" && alreadyAttended) {
      return {
        success: false,
        message: "Izin tidak dapat diterima karena praktikan sudah presensi.",
      };
    }
    setPengajuan((items) =>
      items.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: keputusan,
              reviewedBy: currentUser.id,
              reviewedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
    return {
      success: true,
      message:
        keputusan === "diterima"
          ? "Pengajuan izin diterima."
          : "Pengajuan izin ditolak.",
    };
  }

  return (
    <StoreContext.Provider
      value={{
        sesi,
        pengajuan,
        simpanSesi,
        hapusSesi,
        buka,
        tutup,
        putuskanIzin,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useAsistenWorkflowStore() {
  const store = useContext(StoreContext);
  if (!store)
    throw new Error("Gunakan hook di dalam AsistenWorkflowStoreProvider.");
  return store;
}
