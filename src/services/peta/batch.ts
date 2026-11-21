/** Batas jumlah nilai pada operator `in` di Firestore. */
export const BATAS_IN_FIRESTORE = 30;

/**
 * Memecah daftar (mis. kelasId milik Asisten) menjadi potongan berukuran
 * maksimum `ukuran`, untuk query `where(field, 'in', potongan)`.
 * Nilai duplikat dibuang. Daftar kosong menghasilkan [] (jangan jalankan query).
 */
export function bagiBatch<T>(
  daftar: readonly T[],
  ukuran: number = BATAS_IN_FIRESTORE,
): T[][] {
  if (!Number.isInteger(ukuran) || ukuran < 1) {
    throw new Error('ukuran batch harus bilangan bulat >= 1');
  }
  const unik = Array.from(new Set(daftar));
  const hasil: T[][] = [];
  for (let i = 0; i < unik.length; i += ukuran) {
    hasil.push(unik.slice(i, i + ukuran));
  }
  return hasil;
}