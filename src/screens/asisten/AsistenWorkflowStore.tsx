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
import {
  bukaSesiDanNonaktifkanJadwal,
  tutupSesiDanNonaktifkanJadwal,
} from "../../services/firebase/sesiJadwal";

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
  aktif?: boolean; // false = sesi diarsipkan (pengganti hapus, Rules melarang delete)
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

export type JadwalSiap = {
  id: string;
  kelasId: string;
  kelas: string;
  praktikum: string;
  pertemuanKe: number;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
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
    jadwalSiap: JadwalSiap[];
  bukaSesiDariJadwal: (
    jadwalId: string,
    kode: string,
    catatan?: string,
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

  // ---------------------------------------------------------------------
  // Turunan "milik saya".
  // Rules mengizinkan semua Asisten membaca praktikum/kelas/jadwal/sesi,
  // tetapi subkoleksi (peserta, presensi, pengajuanIzin, kodePresensi)
  // hanya untuk Asisten pemilik kelas. Karena itu semua listener
  // subkoleksi dan daftar sesi di UI dibatasi ke kelas milik Asisten ini.
  // Dependensi efek memakai key string agar listener tidak dibongkar
  // setiap kali satu dokumen sesi berubah.
  // ---------------------------------------------------------------------
  const uid = profile?.uid;

  const kelasSaya = useMemo(
    () =>
      uid
        ? kelasList.filter(
            (k) => Array.isArray(k.asistenUids) && k.asistenUids.includes(uid),
          )
        : [],
    [kelasList, uid],
  );

  const kelasSayaIdKey = useMemo(
    () =>
      kelasSaya
        .map((k) => k.id)
        .sort()
        .join(","),
    [kelasSaya],
  );

  const sesiSaya = useMemo(() => {
    const ids = new Set(kelasSaya.map((k) => k.id));
    // aktif === false berarti sesi sudah diarsipkan (dihapus dari tampilan)
    return rawSesi.filter((s) => ids.has(s.kelasId) && s.aktif !== false);
  }, [rawSesi, kelasSaya]);

  const sesiSayaIdKey = useMemo(
    () =>
      sesiSaya
        .map((s) => s.id)
        .sort()
        .join(","),
    [sesiSaya],
  );

  const sesiDibukaKey = useMemo(
    () =>
      sesiSaya
        .filter((s) => s.status === "dibuka")
        .map((s) => s.id)
        .sort()
        .join(","),
    [sesiSaya],
  );

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

  // 2. Listen to class participant counts (hanya kelas milik saya)
  useEffect(() => {
    if (!kelasSayaIdKey) {
      setPesertaCountMap({});
      return undefined;
    }

    const unsubs = kelasSayaIdKey.split(",").map((kelasId) =>
      listenCollection(
        firestoreRefs.peserta(kelasId),
        (participants: (PesertaDoc & { id: string })[]) => {
          const activeCount = participants.filter((p) => p.aktif !== false).length;
          setPesertaCountMap((prev) => ({
            ...prev,
            [kelasId]: activeCount,
          }));
        },
        (e) =>
          console.warn("listener peserta", kelasId, getFirestoreErrorCode(e)),
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [kelasSayaIdKey]);

  // 3a. Subcollections presensi & pengajuanIzin (hanya sesi dari kelas milik saya)
  useEffect(() => {
    if (!sesiSayaIdKey) {
      setPresensiCountMap({});
      setPengajuanMap({});
      return undefined;
    }

    const unsubs: (() => void)[] = [];

    for (const sesiId of sesiSayaIdKey.split(",")) {
      // Subcollection: presensi
      unsubs.push(
        listenCollection(
          firestoreRefs.presensi(sesiId),
          (attendees) => {
            setPresensiCountMap((prev) => ({
              ...prev,
              [sesiId]: attendees.length,
            }));
          },
          (e) =>
            console.warn("listener presensi", sesiId, getFirestoreErrorCode(e)),
        ),
      );

      // Subcollection: pengajuanIzin
      unsubs.push(
        listenCollection(
          firestoreRefs.pengajuanIzin(sesiId),
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
                id: `${sesiId}_${praktikanId}`,
                sesiId,
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
              [sesiId]: enriched,
            }));
          },
          (e) =>
            console.warn("listener izin", sesiId, getFirestoreErrorCode(e)),
        ),
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [sesiSayaIdKey]);

  // 3b. kodePresensi hanya untuk sesi milik saya yang sedang dibuka.
  // Dipisah agar membuka/menutup satu sesi tidak membongkar listener presensi & izin.
  useEffect(() => {
    if (!sesiDibukaKey) return undefined;

    const unsubs = sesiDibukaKey.split(",").map((sesiId) =>
      listenDocument(
        firestoreRefs.kodePresensi(sesiId),
        (kodeDoc: any) => {
          if (kodeDoc?.kode) {
            setKodePresensiMap((prev) => ({
              ...prev,
              [sesiId]: kodeDoc.kode,
            }));
          }
        },
        (e) => console.warn("listener kode", sesiId, getFirestoreErrorCode(e)),
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [sesiDibukaKey]);

  // 4. Construct SesiAsisten list (hanya sesi kelas milik saya)
  const sesi = useMemo<SesiAsisten[]>(() => {
    return sesiSaya.map((item) => {
      const jadwal = jadwalList.find((j) => j.id === item.jadwalId);
      const kelasId = item.kelasId || jadwal?.kelasId || "";
      const kelas = kelasList.find((k) => k.id === kelasId);
      const praktikumId = item.praktikumId || kelas?.praktikumId || "";
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
    sesiSaya,
    jadwalList,
    kelasList,
    praktikumList,
    presensiCountMap,
    pesertaCountMap,
    kodePresensiMap,
  ]);

 
  // Jadwal aktif milik kelas saya yang belum dipakai sesi dibuka/ditutup.
  const jadwalSiap = useMemo<JadwalSiap[]>(() => {
    const dipakai = new Set(
      sesi.filter((s) => s.jadwalId && s.status !== "belum_dibuka").map((s) => s.jadwalId),
    );
    return jadwalList
      .filter((j) => j.aktif && !dipakai.has(j.id))
      .flatMap((j) => {
        const kelas = kelasSaya.find((k) => k.id === j.kelasId);
        if (!kelas) return [];
        const praktikum = praktikumList.find((p) => p.id === kelas.praktikumId);
        return [
          {
            id: j.id,
            kelasId: kelas.id,
            kelas: kelas.nama,
            praktikum: praktikum?.nama ?? "Praktikum",
            pertemuanKe: j.pertemuanKe,
            lab: j.lokasi,
            tanggal: j.tanggal,
            jamMulai: j.jamMulai,
            jamSelesai: j.jamSelesai,
          },
        ];
      })
      .sort(
        (a, b) =>
          a.tanggal.localeCompare(b.tanggal) ||
          a.jamMulai.localeCompare(b.jamMulai),
      );
  }, [jadwalList, kelasSaya, praktikumList, sesi]);

  // 5. Construct Pengajuan list across my sessions
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

    // Kelas dicari hanya dari kelas yang dikelola Asisten ini (Rules: assistantOwnsClass)
    const matchingKelas = kelasSaya.find(
      (k) => k.nama.trim().toLowerCase() === draft.kelas.trim().toLowerCase(),
    );
    if (!matchingKelas) {
      return {
        success: false,
        message: "Kelas tidak ditemukan di kelas yang Anda kelola.",
      };
    }

    const matchingPraktikum = praktikumList.find(
      (p) =>
        p.nama.trim().toLowerCase() === draft.praktikum.trim().toLowerCase(),
    );
    const matchingJadwal = jadwalList.find(
      (j) =>
        j.kelasId === matchingKelas.id && j.pertemuanKe === draft.pertemuanKe,
    );

    const payload = {
      jadwalId: matchingJadwal?.id || draft.jadwalId || "",
      kelasId: matchingKelas.id,
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

  // "Hapus" = arsipkan (aktif:false). Rules melarang delete pada sesi dan kodePresensi.
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

      // Hanya field `aktif` yang boleh berubah (validSessionArchive di Rules)
      await updateDocument(firestoreRefs.sesiDoc(id), { aktif: false } as any);

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
      // jadwalId hanya dipakai bila dokumennya memang ada (data lama bisa kosong).
      const jadwalId = jadwalList.some((j) => j.id === item.jadwalId)
        ? item.jadwalId
        : undefined;
      await bukaSesiDanNonaktifkanJadwal({
        sesiId: id,
        jadwalId,
        kode: kode.trim(),
        catatan: catatan?.trim() || item.catatan || "",
      });

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
      const jadwalId = jadwalList.some((j) => j.id === item.jadwalId)
        ? item.jadwalId
        : undefined;
      await tutupSesiDanNonaktifkanJadwal({ sesiId: id, jadwalId });

      return { success: true, message: "Sesi berhasil ditutup." };
    } catch (error) {
      return {
        success: false,
        message: `Sesi gagal ditutup (${getFirestoreErrorCode(error)}).`,
      };
    }
  }

  async function bukaSesiDariJadwal(
    jadwalId: string,
    kode: string,
    catatan?: string,
  ): Promise<Result> {
    const authError = requireAssistant();
    if (authError) return authError;

    if (!/^\d{4}$/.test(kode)) {
      return { success: false, message: "Kode presensi harus tepat 4 digit." };
    }

    const jadwal = jadwalList.find((j) => j.id === jadwalId);
    if (!jadwal || !jadwal.aktif) {
      return { success: false, message: "Jadwal tidak aktif atau tidak ditemukan." };
    }
    const kelas = kelasSaya.find((k) => k.id === jadwal.kelasId);
    if (!kelas) {
      return {
        success: false,
        message: "Kelas tidak ditemukan di kelas yang Anda kelola.",
      };
    }
    const praktikum = praktikumList.find((p) => p.id === kelas.praktikumId);

    const sesiAda = sesi.find((s) => s.jadwalId === jadwalId);
    if (sesiAda && sesiAda.status !== "belum_dibuka") {
      return {
        success: false,
        message: "Jadwal ini sudah dipakai untuk sesi yang dibuka atau ditutup.",
      };
    }

    const catatanBersih = catatan?.trim() || "";
    const payload = {
      jadwalId,
      kelasId: kelas.id,
      praktikumId: kelas.praktikumId,
      praktikum: praktikum?.nama ?? "Praktikum",
      pertemuanKe: jadwal.pertemuanKe,
      kelas: kelas.nama,
      lab: jadwal.lokasi,
      tanggal: jadwal.tanggal,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
      catatan: catatanBersih,
    };

    try {
      // Sesi belum_dibuka yang sudah ada dipakai ulang (mis. percobaan
      // sebelumnya putus di tengah), supaya tidak muncul sesi ganda.
      const sesiId =
        sesiAda?.id ??
        (await addDocument(firestoreRefs.sesi(), {
          ...payload,
          status: "belum_dibuka",
          openedAt: null,
          closedAt: null,
        }));

      await bukaSesiDanNonaktifkanJadwal({
        sesiId,
        jadwalId,
        kode: kode.trim(),
        catatan: catatanBersih,
      });
      setKodePresensiMap((prev) => ({ ...prev, [sesiId]: kode.trim() }));

      return { success: true, message: "Sesi berhasil dibuka." };
    } catch (error) {
      return {
        success: false,
        message: `Sesi gagal dibuka (${getFirestoreErrorCode(error)}).`,
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
        jadwalSiap,
        bukaSesiDariJadwal,
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