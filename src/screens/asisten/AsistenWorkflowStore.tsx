import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SesiStatus } from "../../data/types";
import { useAuth } from "../../hooks/useAuth";
import {
  addDocument,
  firestoreRefs,
  listenCollection,
  listenDocument,
  readCollection,
  readDocument,
  removeDocument,
  serverTimestamp,
  setDocument,
  updateDocument,
} from "../../services/firebase/firestore";
import type {
  JadwalDoc,
  KelasDoc,
  PengajuanIzinDoc,
  PesertaDoc,
  PraktikumDoc,
  SesiDoc,
} from "../../data/firestoreType";

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
  kelasId?: string;
  jadwalId?: string;
  praktikumId?: string;
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

function getFirestoreErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "unknown";
}

type RawSesiItem = SesiDoc & {
  id: string;
  praktikum?: string;
  namaPraktikum?: string;
  pertemuanKe?: number;
  kelas?: string;
  lab?: string;
  lokasi?: string;
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  praktikumId?: string;
};

type AsistenWorkflowStoreValue = {
  sesi: SesiAsisten[];
  pengajuan: PengajuanIzin[];
  loading: boolean;
  error: string;
  simpanSesi: (draft: DraftSesi, id?: string) => Promise<Result>;
  hapusSesi: (id: string) => Promise<Result>;
  buka: (id: string, kode: string, catatan?: string) => Promise<Result>;
  tutup: (id: string) => Promise<Result>;
  putuskanIzin: (
    id: string,
    keputusan: "diterima" | "ditolak",
  ) => Promise<Result>;
};

const StoreContext = createContext<AsistenWorkflowStoreValue | null>(null);

// Cache user profile for fast lookup in pengajuan
const userCache = new Map<string, { nama: string; nim: string }>();

export function AsistenWorkflowStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile, role } = useAuth();
  const currentUser = profile ? { id: profile.uid, role: profile.role } : null;

  const [rawSesi, setRawSesi] = useState<RawSesiItem[]>([]);
  const [jadwalList, setJadwalList] = useState<(JadwalDoc & { id: string })[]>(
    [],
  );
  const [kelasList, setKelasList] = useState<(KelasDoc & { id: string })[]>([]);
  const [praktikumList, setPraktikumList] = useState<
    (PraktikumDoc & { id: string })[]
  >([]);

  const [presensiCountMap, setPresensiCountMap] = useState<
    Record<string, number>
  >({});
  const [kodePresensiMap, setKodePresensiMap] = useState<
    Record<string, string>
  >({});
  const [pengajuanMap, setPengajuanMap] = useState<
    Record<string, PengajuanIzin[]>
  >({});
  const [pesertaCountMap, setPesertaCountMap] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Listen to parent collections: praktikum, kelas, jadwal, sesi
  useEffect(() => {
    if (role !== "asisten" || !user) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    const unsubscribers: (() => void)[] = [];

    const onError = (err: unknown) => {
      setError(`Gagal memuat data dari Firestore (${getFirestoreErrorCode(err)})`);
      setLoading(false);
    };

    unsubscribers.push(
      listenCollection(
        firestoreRefs.praktikum(),
        (items) => setPraktikumList(items),
        onError,
      ),
    );

    unsubscribers.push(
      listenCollection(
        firestoreRefs.kelas(),
        (items) => setKelasList(items),
        onError,
      ),
    );

    unsubscribers.push(
      listenCollection(
        firestoreRefs.jadwal(),
        (items) => setJadwalList(items),
        onError,
      ),
    );

    unsubscribers.push(
      listenCollection(
        firestoreRefs.sesi(),
        (items) => {
          setRawSesi(items as RawSesiItem[]);
          setLoading(false);
        },
        onError,
      ),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [role, user]);

  // 2. Listen to class participant counts
  useEffect(() => {
    if (kelasList.length === 0) return undefined;

    const unsubs = new Map<string, () => void>();

    for (const kelas of kelasList) {
      unsubs.set(
        kelas.id,
        listenCollection(
          firestoreRefs.peserta(kelas.id),
          (participants: (PesertaDoc & { id: string })[]) => {
            const activeCount = participants.filter((p) => p.aktif !== false).length;
            setPesertaCountMap((prev) => ({
              ...prev,
              [kelas.id]: activeCount,
            }));
          },
          () => {},
        ),
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [kelasList]);

  // 3. Listen to subcollections (presensi, pengajuanIzin) and kodePresensi per session
  useEffect(() => {
    if (rawSesi.length === 0) {
      setPresensiCountMap({});
      setPengajuanMap({});
      setKodePresensiMap({});
      return undefined;
    }

    const unsubs = new Map<string, () => void>();
    const sessionIds = new Set(rawSesi.map((s) => s.id));

    for (const s of rawSesi) {
      // Subcollection: presensi
      unsubs.set(
        `presensi-${s.id}`,
        listenCollection(
          firestoreRefs.presensi(s.id),
          (attendees) => {
            setPresensiCountMap((prev) => ({
              ...prev,
              [s.id]: attendees.length,
            }));
          },
          () => {},
        ),
      );

      // Subcollection: pengajuanIzin
      unsubs.set(
        `izin-${s.id}`,
        listenCollection(
          firestoreRefs.pengajuanIzin(s.id),
          async (reqs) => {
            // Enrich with user profile if missing
            const enriched: PengajuanIzin[] = [];
            for (const doc of reqs) {
              const rawData = doc as unknown as PengajuanIzinDoc & {
                nama?: string;
                nim?: string;
                praktikanId?: string;
              };
              const praktikanId = rawData.userId || rawData.praktikanId || doc.id;
              let nama = rawData.nama;
              let nim = rawData.nim;

              if (!nama || !nim) {
                const cached = userCache.get(praktikanId);
                if (cached) {
                  nama = nama || cached.nama;
                  nim = nim || cached.nim;
                } else {
                  try {
                    const uDoc = await readDocument(
                      firestoreRefs.user(praktikanId),
                    );
                    if (uDoc) {
                      userCache.set(praktikanId, {
                        nama: uDoc.nama,
                        nim: uDoc.nim ?? "",
                      });
                      nama = nama || uDoc.nama;
                      nim = nim || uDoc.nim;
                    }
                  } catch {
                    // ignore
                  }
                }
              }

              let createdAtStr = new Date().toISOString();
              if (rawData.createdAt) {
                try {
                  const ts = rawData.createdAt as any;
                  createdAtStr =
                    typeof ts.toDate === "function"
                      ? ts.toDate().toISOString()
                      : new Date(ts).toISOString();
                } catch {
                  createdAtStr = new Date().toISOString();
                }
              }

              let reviewedAtStr: string | undefined;
              if (rawData.reviewedAt) {
                try {
                  const ts = rawData.reviewedAt as any;
                  reviewedAtStr =
                    typeof ts.toDate === "function"
                      ? ts.toDate().toISOString()
                      : new Date(ts).toISOString();
                } catch {
                  reviewedAtStr = undefined;
                }
              }

              enriched.push({
                id: `${s.id}_${praktikanId}`,
                sesiId: s.id,
                praktikanId,
                nama: nama || "Praktikan",
                nim: nim || "NIM tidak tersedia",
                alasan: rawData.alasan || "",
                kategoriAI: rawData.kategoriAI,
                statusKlasifikasi: rawData.statusKlasifikasi || "gagal",
                status: rawData.status || "menunggu",
                createdAt: createdAtStr,
                reviewedBy: rawData.reviewedBy,
                reviewedAt: reviewedAtStr,
              });
            }

            setPengajuanMap((prev) => ({
              ...prev,
              [s.id]: enriched,
            }));
          },
          () => {},
        ),
      );

      // If session is open, listen to kodePresensi
      if (s.status === "dibuka") {
        unsubs.set(
          `kode-${s.id}`,
          listenDocument(
            firestoreRefs.kodePresensi(s.id),
            (kodeDoc: any) => {
              if (kodeDoc?.kode) {
                setKodePresensiMap((prev) => ({
                  ...prev,
                  [s.id]: kodeDoc.kode,
                }));
              }
            },
            () => {},
          ),
        );
      }
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [rawSesi]);

  // 4. Construct SesiAsisten list
  const sesi = useMemo<SesiAsisten[]>(() => {
    return rawSesi.map((item) => {
      const jadwal = jadwalList.find((j) => j.id === item.jadwalId);
      const kelasId = item.kelasId || jadwal?.kelasId || "";
      const kelas = kelasList.find((k) => k.id === kelasId);
      const praktikumId =
        item.praktikumId || kelas?.praktikumId || "";
      const praktikum = praktikumList.find((p) => p.id === praktikumId);

      const resolvedPraktikum =
        item.praktikum ||
        item.namaPraktikum ||
        praktikum?.nama ||
        "Praktikum";
      const resolvedPertemuanKe =
        typeof item.pertemuanKe === "number"
          ? item.pertemuanKe
          : typeof jadwal?.pertemuanKe === "number"
            ? jadwal.pertemuanKe
            : 1;
      const resolvedKelas = item.kelas || kelas?.nama || "A";
      const resolvedLab =
        item.lab || item.lokasi || jadwal?.lokasi || "Lab Komputer";
      const resolvedTanggal = item.tanggal || jadwal?.tanggal || "";
      const resolvedJamMulai = item.jamMulai || jadwal?.jamMulai || "";
      const resolvedJamSelesai = item.jamSelesai || jadwal?.jamSelesai || "";

      const hadir = presensiCountMap[item.id] ?? 0;
      const total = pesertaCountMap[kelasId] ?? 30;
      const kodePresensi = kodePresensiMap[item.id];

      return {
        id: item.id,
        praktikum: resolvedPraktikum,
        pertemuanKe: resolvedPertemuanKe,
        kelas: resolvedKelas,
        lab: resolvedLab,
        tanggal: resolvedTanggal,
        jamMulai: resolvedJamMulai,
        jamSelesai: resolvedJamSelesai,
        status: item.status || "belum_dibuka",
        catatan: item.catatan || "",
        kodePresensi,
        hadir,
        total: Math.max(total, hadir),
        kelasId,
        jadwalId: item.jadwalId,
        praktikumId,
      };
    });
  }, [
    rawSesi,
    jadwalList,
    kelasList,
    praktikumList,
    presensiCountMap,
    pesertaCountMap,
    kodePresensiMap,
  ]);

  // 5. Construct Pengajuan list across all sessions
  const pengajuan = useMemo<PengajuanIzin[]>(() => {
    const all = Object.values(pengajuanMap).flat();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [pengajuanMap]);

  function requireAssistant(): Result | null {
    return currentUser?.role === "asisten"
      ? null
      : { success: false, message: "Aksi ini hanya tersedia untuk Asisten." };
  }

  async function simpanSesi(draft: DraftSesi, id?: string): Promise<Result> {
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

    // Match with existing class, schedule, course
    const matchingKelas = kelasList.find(
      (k) => k.nama.trim().toLowerCase() === draft.kelas.trim().toLowerCase(),
    );
    const matchingPraktikum = praktikumList.find(
      (p) =>
        p.nama.trim().toLowerCase() === draft.praktikum.trim().toLowerCase(),
    );
    const matchingJadwal = jadwalList.find(
      (j) =>
        (matchingKelas ? j.kelasId === matchingKelas.id : true) &&
        j.pertemuanKe === draft.pertemuanKe,
    );

    const payload = {
      jadwalId: matchingJadwal?.id || draft.jadwalId || "",
      kelasId: matchingKelas?.id || draft.kelasId || "",
      praktikumId: matchingPraktikum?.id || draft.praktikumId || "",
      praktikum: draft.praktikum.trim(),
      pertemuanKe: draft.pertemuanKe,
      kelas: draft.kelas.trim(),
      lab: draft.lab.trim(),
      tanggal: draft.tanggal.trim(),
      jamMulai: draft.jamMulai.trim(),
      jamSelesai: draft.jamSelesai.trim(),
      catatan: draft.catatan?.trim() || "",
    };

    try {
      if (id) {
        await updateDocument(firestoreRefs.sesiDoc(id), payload);
        return { success: true, message: "Sesi berhasil diperbarui." };
      } else {
        await addDocument(firestoreRefs.sesi(), {
          ...payload,
          status: "belum_dibuka",
          openedAt: null,
          closedAt: null,
        });
        return { success: true, message: "Sesi berhasil ditambahkan." };
      }
    } catch (error) {
      return {
        success: false,
        message: `Gagal menyimpan sesi (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  async function hapusSesi(id: string): Promise<Result> {
    const authError = requireAssistant();
    if (authError) return authError;

    const item = sesi.find((entry) => entry.id === id);
    if (!item) return { success: false, message: "Sesi tidak ditemukan." };

    if (item.status !== "belum_dibuka") {
      return {
        success: false,
        message: "Hanya sesi berstatus belum dibuka yang dapat dihapus.",
      };
    }

    try {
      // Check attendance history
      const attendees = await readCollection(firestoreRefs.presensi(id));
      if (attendees.length > 0) {
        return {
          success: false,
          message: "Sesi memiliki riwayat presensi; sesi tidak dapat dihapus.",
        };
      }

      // Check permission request history
      const requests = await readCollection(firestoreRefs.pengajuanIzin(id));
      if (requests.length > 0) {
        return {
          success: false,
          message: "Sesi memiliki pengajuan izin; sesi tidak dapat dihapus.",
        };
      }

      await removeDocument(firestoreRefs.sesiDoc(id));
      await removeDocument(firestoreRefs.kodePresensi(id)).catch(() => {});

      return { success: true, message: "Sesi berhasil dihapus." };
    } catch (error) {
      return {
        success: false,
        message: `Gagal menghapus sesi (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  async function buka(
    id: string,
    kode: string,
    catatan?: string,
  ): Promise<Result> {
    const authError = requireAssistant();
    if (authError) return authError;

    if (!/^\d{4}$/.test(kode)) {
      return { success: false, message: "Kode presensi harus tepat 4 digit." };
    }

    const item = sesi.find((entry) => entry.id === id);
    if (!item || item.status !== "belum_dibuka") {
      return {
        success: false,
        message: "Hanya sesi yang belum dibuka yang dapat dimulai.",
      };
    }

    try {
      await Promise.all([
        updateDocument(firestoreRefs.sesiDoc(id), {
          status: "dibuka",
          openedAt: serverTimestamp(),
          catatan: catatan?.trim() || item.catatan || "",
        }),
        setDocument(firestoreRefs.kodePresensi(id), {
          kode: kode.trim(),
          updatedAt: serverTimestamp(),
        }),
      ]);

      setKodePresensiMap((prev) => ({ ...prev, [id]: kode.trim() }));

      return { success: true, message: "Sesi berhasil dibuka." };
    } catch (error) {
      return {
        success: false,
        message: `Sesi gagal dibuka (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  async function tutup(id: string): Promise<Result> {
    const authError = requireAssistant();
    if (authError) return authError;

    const item = sesi.find((entry) => entry.id === id);
    if (!item || item.status !== "dibuka") {
      return {
        success: false,
        message: "Hanya sesi yang dibuka yang dapat ditutup.",
      };
    }

    try {
      await updateDocument(firestoreRefs.sesiDoc(id), {
        status: "ditutup",
        closedAt: serverTimestamp(),
      });

      return { success: true, message: "Sesi berhasil ditutup." };
    } catch (error) {
      return {
        success: false,
        message: `Sesi gagal ditutup (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  async function putuskanIzin(
    id: string,
    keputusan: "diterima" | "ditolak",
  ): Promise<Result> {
    if (!currentUser || currentUser.role !== "asisten") {
      return {
        success: false,
        message: "Aksi ini hanya tersedia untuk Asisten.",
      };
    }

    const item = pengajuan.find((entry) => entry.id === id);
    if (!item) return { success: false, message: "Pengajuan tidak ditemukan." };

    if (item.status !== "menunggu") {
      return { success: false, message: "Pengajuan sudah diputuskan." };
    }

    // Check if the student has already attended
    try {
      const attendance = await readDocument(
        firestoreRefs.presensiDoc(item.sesiId, item.praktikanId),
      );
      if (keputusan === "diterima" && attendance !== null) {
        return {
          success: false,
          message: "Izin tidak dapat diterima karena praktikan sudah presensi.",
        };
      }

      await updateDocument(
        firestoreRefs.pengajuanIzinDoc(item.sesiId, item.praktikanId),
        {
          status: keputusan,
          reviewedBy: currentUser.id,
          reviewedAt: serverTimestamp(),
        },
      );

      return {
        success: true,
        message:
          keputusan === "diterima"
            ? "Pengajuan izin diterima."
            : "Pengajuan izin ditolak.",
      };
    } catch (error) {
      return {
        success: false,
        message: `Keputusan izin gagal disimpan (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  return (
    <StoreContext.Provider
      value={{
        sesi,
        pengajuan,
        loading,
        error,
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
  if (!store) {
    throw new Error("Gunakan hook di dalam AsistenWorkflowStoreProvider.");
  }
  return store;
}
