// =====================================================================
// Daftar Praktikan untuk fitur "Tambah peserta" (B1).
// Mengambil profil berole "praktikan" dari koleksi users.
//
// PENTING: query HARUS memakai where('role','==','praktikan'). Firestore
// Rules bukan filter: tanpa where, query ditolak walau Rules mengizinkan
// Asisten membaca profil Praktikan. Lihat aturan `users` di catatan.
// =====================================================================
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../../services/firebase";

export type PraktikanProfil = {
  uid: string;
  nama: string;
  nim: string;
  email: string;
};

function pesanError(reason: unknown) {
  const code =
    typeof reason === "object" && reason && "code" in reason
      ? String((reason as { code: unknown }).code)
      : "unknown";
  if (code.includes("permission-denied"))
    return "Akses ke daftar Praktikan ditolak oleh Rules.";
  if (code.includes("unavailable"))
    return "Tidak ada koneksi. Periksa internetmu.";
  return `Gagal memuat daftar Praktikan (${code}).`;
}

/** @param aktif hanya memuat saat true (misalnya role === "asisten") */
export function useDaftarPraktikan(aktif: boolean) {
  const [daftar, setDaftar] = useState<PraktikanProfil[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (!db) {
        setError("Firebase belum dikonfigurasi.");
        return;
      }
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "praktikan")),
      );
      const hasil = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            uid: d.id,
            nama: String(data.nama ?? "Tanpa nama"),
            nim: String(data.nim ?? ""),
            email: String(data.email ?? ""),
          };
        })
        .sort((a, b) => a.nama.localeCompare(b.nama, "id-ID"));
      setDaftar(hasil);
    } catch (reason) {
      setError(pesanError(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aktif) void muat();
  }, [aktif, muat]);

  const petaByUid = useMemo(
    () => new Map(daftar.map((p) => [p.uid, p] as const)),
    [daftar],
  );

  return { daftar, petaByUid, loading, error, muat };
}