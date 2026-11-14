// =====================================================================
// HOOK DATA REKAP PRESENSI (B3)
// ---------------------------------------------------------------------
// Layar AsistenRekapSesiScreen hanya memakai hook ini, jadi saat
// Firestore siap cukup ganti ISI hook ini (bentuk return jangan berubah):
//   - status "loading": sampai snapshot pertama listener datang
//   - status "error"  : dari callback error onSnapshot
//   - offline         : dari snapshot.metadata.fromCache
//   - retry           : pasang ulang listener
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { dummyUsers } from "../data/dummy";
import { useApp } from "./useApp";
import { useAsistenWorkflowStore } from "../screens/asisten/AsistenWorkflowStore";

export type PraktikanHadir = {
  id: string;
  nama: string;
  nim: string;
  waktu: string;
};

export type StatusMuat = "loading" | "error" | "ready";

type Simulasi = null | "loading" | "error" | "offline";

// SEMENTARA: ubah ke "loading" | "error" | "offline" untuk melihat tampilan
// tiap state. KEMBALIKAN ke null sebelum commit.
const SIMULASI_AWAL: Simulasi = null;

export function useRekapPresensi(sesiId?: string) {
  const { sesi, tutup } = useAsistenWorkflowStore();
  const { presensi } = useApp();
  const [simulasi, setSimulasi] = useState<Simulasi>(SIMULASI_AWAL);

  // Simulasi loading selesai sendiri setelah 1,5 detik.
  useEffect(() => {
    if (simulasi !== "loading") return;
    const timer = setTimeout(() => setSimulasi(null), 1500);
    return () => clearTimeout(timer);
  }, [simulasi]);

  // Sengaja TIDAK jatuh ke sesi lain jika sesiId tidak ketemu,
  // supaya Asisten tidak salah menutup sesi.
  const session = useMemo(
    () => (sesiId ? sesi.find((item) => item.id === sesiId) : sesi[0]),
    [sesi, sesiId],
  );
  const idSesi = session?.id;

  const daftar = useMemo<PraktikanHadir[]>(() => {
    if (!idSesi) return [];

    return presensi
      .filter((entry) => entry.sesiId === idSesi)
      .map((entry): PraktikanHadir => {
        const user = dummyUsers.find((item) => item.id === entry.praktikanId);
        return {
          id: entry.id,
          nama: user?.nama ?? "Praktikan",
          nim: user?.nim ?? "NIM tidak tersedia",
          waktu: new Date(entry.waktuHadir).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
          }),
        };
      })
      .sort((a, b) => a.waktu.localeCompare(b.waktu));
  }, [presensi, idSesi]);

  const status: StatusMuat =
    simulasi === "loading" ? "loading" : simulasi === "error" ? "error" : "ready";

  const retry = useCallback(() => setSimulasi(null), []);

  return {
    session,
    daftar,
    status,
    offline: simulasi === "offline",
    retry,
    tutup,
  };
}