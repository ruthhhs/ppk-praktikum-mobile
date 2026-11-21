// =====================================================================
// HOOK DATA REKAP PRESENSI (B3, diperbarui B4)
// ---------------------------------------------------------------------
// Menghubungkan layar Rekap Presensi Asisten ke Cloud Firestore secara
// real-time dengan listener onSnapshot pada sesi/{sesiId}/presensi.
// B4: menambahkan jarak dan akurasi presensi (field baru Sprint 3).
// Dokumen presensi Sprint 2 tidak punya field ini, jadi nilainya null.
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PresensiDoc } from "../data/firestoreType";
import { useAsistenWorkflowStore } from "../screens/asisten/AsistenWorkflowStore";
import {
  firestoreRefs,
  listenCollection,
  readDocument,
} from "../services/firebase/firestore";

export type PraktikanHadir = {
  id: string;
  nama: string;
  nim: string;
  waktu: string;
  /** Jarak ke lab saat presensi (meter); null bila tidak tercatat. */
  jarakMeter: number | null;
  /** Akurasi GPS saat presensi (meter); null bila tidak tercatat. */
  akurasi: number | null;
};

export type StatusMuat = "loading" | "error" | "ready";

// Field lokasi bersifat opsional agar dokumen Sprint 2 tetap terbaca.
type PresensiBerLokasi = PresensiDoc & {
  id: string;
  jarakMeter?: number;
  akurasi?: number;
};

function angkaAtauNull(nilai: unknown): number | null {
  return typeof nilai === "number" && Number.isFinite(nilai) ? nilai : null;
}

// Cache profil pengguna untuk menghindari fetch Firestore berulang
const profileCache = new Map<string, { nama: string; nim: string }>();

export function useRekapPresensi(sesiId?: string) {
  const { sesi, tutup } = useAsistenWorkflowStore();
  const [retryKey, setRetryKey] = useState(0);

  // Cari sesi dari store
  const session = useMemo(
    () => (sesiId ? sesi.find((item) => item.id === sesiId) : sesi[0]),
    [sesi, sesiId],
  );
  const targetSesiId = session?.id ?? sesiId;

  const [rawPresensi, setRawPresensi] = useState<PresensiBerLokasi[]>([]);
  const [userProfiles, setUserProfiles] = useState<
    Record<string, { nama: string; nim: string }>
  >({});
  const [status, setStatus] = useState<StatusMuat>("loading");
  const [offline, setOffline] = useState(false);

  // Listener real-time ke subcollection presensi pada sesi terpilih
  useEffect(() => {
    if (!targetSesiId) {
      return undefined;
    }

    const ref = firestoreRefs.presensi(targetSesiId);
    const unsubscribe = listenCollection(
      ref,
      async (items) => {
        setRawPresensi(items);
        setStatus("ready");

        // Cari UID yang profilnya belum ada di cache
        const missingUids = items
          .map((item) => item.userId || item.id)
          .filter((uid) => uid && !profileCache.has(uid));

        if (missingUids.length > 0) {
          const newlyFetched: Record<string, { nama: string; nim: string }> = {};
          await Promise.all(
            missingUids.map(async (uid) => {
              try {
                const uDoc = await readDocument(firestoreRefs.user(uid));
                if (uDoc) {
                  const info = {
                    nama: uDoc.nama || "Praktikan",
                    nim: uDoc.nim || "NIM tidak tersedia",
                  };
                  profileCache.set(uid, info);
                  newlyFetched[uid] = info;
                }
              } catch {
                // Abaikan jika gagal baca profil
              }
            }),
          );
          if (Object.keys(newlyFetched).length > 0) {
            setUserProfiles((prev) => ({ ...prev, ...newlyFetched }));
          }
        }
      },
      (error: any) => {
        if (error?.code?.includes("unavailable") || error?.code?.includes("network")) {
          setOffline(true);
        }
        setStatus("error");
      },
    );

    return () => {
      unsubscribe();
    };
  }, [targetSesiId, retryKey]);

  const daftar = useMemo<PraktikanHadir[]>(() => {
    return rawPresensi
      .map((entry): PraktikanHadir => {
        const uid = entry.userId || entry.id;
        const profile = userProfiles[uid] ?? profileCache.get(uid);

        let waktuStr = "--:--:--";
        if (entry.recordedAt) {
          try {
            const raw = entry.recordedAt as any;
            const date =
              typeof raw.toDate === "function" ? raw.toDate() : new Date(raw);
            if (!Number.isNaN(date.getTime())) {
              waktuStr = date.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "Asia/Jakarta",
              });
            }
          } catch {
            waktuStr = "--:--:--";
          }
        }

        return {
          id: entry.id,
          nama: profile?.nama ?? "Praktikan",
          nim: profile?.nim ?? "NIM tidak tersedia",
          waktu: waktuStr,
          jarakMeter: angkaAtauNull(entry.jarakMeter),
          akurasi: angkaAtauNull(entry.akurasi),
        };
      })
      .sort((a, b) => a.waktu.localeCompare(b.waktu));
  }, [rawPresensi, userProfiles]);

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  return {
    session,
    daftar,
    status,
    offline,
    retry,
    tutup,
  };
}