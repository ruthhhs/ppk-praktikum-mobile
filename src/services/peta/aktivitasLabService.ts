import {
  query,
  where,
  type Unsubscribe,
} from '@react-native-firebase/firestore';
import type { PraktikumDoc, JadwalDoc, SesiDoc } from '@/data/firestoreType';
import type { Role } from '@/data/types';
import {
  firestoreRefs,
  listenCollection,
  listenDocument,
  listenKeanggotaanPraktikan,
  type FirestoreListenerError,
  type WithId,
} from '@/services/firebase/firestore';
import type { DataAktivitas, KelasUntukAktivitas } from './aktivitasLab';
import { bagiBatch } from './batch';

// Rules Sprint 2 (main):
// - Asisten boleh membaca kelas/jadwal/sesi/praktikum. Subkoleksi tidak disentuh di sini.
// - Praktikan: kelas hanya lewat dokumen (get) setelah keanggotaan ditemukan lewat
//   collection group `peserta`; jadwal/sesi dibaca per kelas (where kelasId == ...).
// Pola ini mengikuti AsistenWorkflowStore dan praktikanStore.

type SesiDenganAktif = WithId<SesiDoc> & { aktif?: boolean };

function filterKelasId(ids: string[]) {
  return ids.length === 1
    ? where('kelasId', '==', ids[0])
    : where('kelasId', 'in', ids);
}

function buatPenampung(
  onValue: (data: DataAktivitas) => void,
  onError: FirestoreListenerError,
) {
  const kelasPer = new Map<string, KelasUntukAktivitas>();
  const jadwalPer = new Map<string, WithId<JadwalDoc>[]>();
  const sesiPer = new Map<string, SesiDenganAktif[]>();
  const listenerGrup = new Map<string, Unsubscribe[]>();
  let praktikum: WithId<PraktikumDoc>[] | null = null;
  let kelasSiap = false;
  let grupAktif: string[] = [];
  let dihentikan = false;

  function emit() {
    if (dihentikan || !kelasSiap || praktikum === null) return;
    // Tunggu snapshot pertama semua grup agar UI tidak berkedip "kosong".
    if (!grupAktif.every((k) => jadwalPer.has(k) && sesiPer.has(k))) return;
    onValue({
      kelas: Array.from(kelasPer.values()),
      jadwal: grupAktif.flatMap((k) => jadwalPer.get(k) ?? []),
      // aktif === false = sesi diarsipkan (sama seperti AsistenWorkflowStore)
      sesi: grupAktif
        .flatMap((k) => sesiPer.get(k) ?? [])
        .filter((s) => s.aktif !== false),
      praktikum,
    });
  }

  /** Satu grup = satu query jadwal + satu query sesi untuk sekumpulan kelasId. */
  function sinkronkanGrup(grupBaru: string[][]) {
    const kunciBaru = grupBaru.map((ids) => ids.join(','));

    for (const [kunci, unsubs] of listenerGrup.entries()) {
      if (!kunciBaru.includes(kunci)) {
        unsubs.forEach((u) => u());
        listenerGrup.delete(kunci);
        jadwalPer.delete(kunci);
        sesiPer.delete(kunci);
      }
    }

    grupBaru.forEach((ids, i) => {
      const kunci = kunciBaru[i];
      if (listenerGrup.has(kunci)) return;
      listenerGrup.set(kunci, [
        listenCollection(
          query(firestoreRefs.jadwal(), filterKelasId(ids)),
          (items) => {
            jadwalPer.set(kunci, items);
            emit();
          },
          onError,
        ),
        listenCollection(
          query(firestoreRefs.sesi(), filterKelasId(ids)),
          (items) => {
            sesiPer.set(kunci, items as SesiDenganAktif[]);
            emit();
          },
          onError,
        ),
      ]);
    });

    grupAktif = kunciBaru;
    emit();
  }

  return {
    kelasPer,
    emit,
    sinkronkanGrup,
    setPraktikum(items: WithId<PraktikumDoc>[]) {
      praktikum = items;
      emit();
    },
    setKelasSiap(siap: boolean) {
      kelasSiap = siap;
    },
    hentikan() {
      dihentikan = true;
      listenerGrup.forEach((unsubs) => unsubs.forEach((u) => u()));
      listenerGrup.clear();
    },
  };
}

function listenAsisten(
  uid: string,
  onValue: (data: DataAktivitas) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  const p = buatPenampung(onValue, onError);

  const unsubKelas = listenCollection(
    query(firestoreRefs.kelas(), where('asistenUids', 'array-contains', uid)),
    (items) => {
      p.kelasPer.clear();
      for (const k of items) {
        if (k.aktif !== false) p.kelasPer.set(k.id, k as KelasUntukAktivitas);
      }
      p.setKelasSiap(true);
      // Pecah per 30 nilai (batas operator `in`); urut agar kunci grup stabil.
      const ids = Array.from(p.kelasPer.keys()).sort();
      p.sinkronkanGrup(bagiBatch(ids));
    },
    onError,
  );

  // Asisten boleh membaca semua praktikum (nama praktikum untuk panel info).
  const unsubPraktikum = listenCollection(
    firestoreRefs.praktikum(),
    (items) => p.setPraktikum(items),
    onError,
  );

  return () => {
    unsubKelas();
    unsubPraktikum();
    p.hentikan();
  };
}

function listenPraktikan(
  uid: string,
  onValue: (data: DataAktivitas) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  const p = buatPenampung(onValue, onError);
  const unsubKelasDoc = new Map<string, Unsubscribe>();
  const kelasDimuat = new Set<string>();
  let idKeanggotaan: string[] = [];

  function perbarui() {
    p.setKelasSiap(idKeanggotaan.every((id) => kelasDimuat.has(id)));
    // Hanya kelas yang dokumennya terbaca dan aktif yang dibuatkan listener
    // jadwal/sesi, karena Rules mensyaratkan activeParticipant.
    const ids = Array.from(p.kelasPer.keys()).sort();
    p.sinkronkanGrup(ids.map((id) => [id]));
  }

  const unsubKeanggotaan = listenKeanggotaanPraktikan(
    uid,
    (memberships) => {
      idKeanggotaan = memberships
        .filter((m) => m.uid === uid && m.aktif === true)
        .map((m) => m.kelasId);
      const idSet = new Set(idKeanggotaan);

      for (const [id, unsub] of unsubKelasDoc.entries()) {
        if (!idSet.has(id)) {
          unsub();
          unsubKelasDoc.delete(id);
          kelasDimuat.delete(id);
          p.kelasPer.delete(id);
        }
      }

      for (const id of idKeanggotaan) {
        if (unsubKelasDoc.has(id)) continue;
        unsubKelasDoc.set(
          id,
          listenDocument(
            firestoreRefs.kelasDoc(id),
            (kelas) => {
              kelasDimuat.add(id);
              if (kelas && kelas.aktif !== false) {
                p.kelasPer.set(id, { ...kelas, id } as KelasUntukAktivitas);
              } else {
                p.kelasPer.delete(id);
              }
              perbarui();
            },
            (err) => {
              kelasDimuat.add(id);
              onError(err);
              perbarui();
            },
          ),
        );
      }

      perbarui();
    },
    onError,
  );

  const unsubPraktikum = listenCollection(
    query(
      firestoreRefs.praktikum(),
      where('praktikanUids', 'array-contains', uid),
    ),
    (items) => p.setPraktikum(items),
    onError,
  );

  return () => {
    unsubKeanggotaan();
    unsubPraktikum();
    unsubKelasDoc.forEach((u) => u());
    unsubKelasDoc.clear();
    p.hentikan();
  };
}

/**
 * Mendengarkan data mentah untuk aktivitas lab, dibatasi sesuai hak baca:
 * Asisten = kelas yang ia kelola; Praktikan = kelas yang ia ikuti.
 * Hasilnya diteruskan ke hitungAktivitasLab(labId, data) untuk tiap lab.
 * onValue baru dipanggil setelah semua snapshot awal tiba.
 */
export function listenDataAktivitas(
  uid: string,
  peran: Role,
  onValue: (data: DataAktivitas) => void,
  onError: FirestoreListenerError,
): Unsubscribe {
  return peran === 'asisten'
    ? listenAsisten(uid, onValue, onError)
    : listenPraktikan(uid, onValue, onError);
}