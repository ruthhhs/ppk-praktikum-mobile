/* eslint-disable @typescript-eslint/no-require-imports */
// Adapter AI untuk pengajuan izin.
// Memakai model sentimen lokal dari repo pengajar (sentiment.js + model-edom.json).
// Tanpa jaringan, tanpa API key. Hasilnya hanya informasi pendukung untuk Asprak.
//
// Letakkan di src/services/ai/ bersama:
//   - sentiment.js        (salin dari repo pengajar)
//   - model-edom.json     (salin dari repo pengajar; JANGAN pakai model.json)
//   - EDOM-LICENSE.txt dan EDOM-ATTRIBUTION.txt (salin; lisensi MIT dataset)
//
// Nama fungsi dan bentuk hasil sama dengan versi lama, jadi praktikanStore
// dan layar izin tidak perlu diubah.

export type StatusKlasifikasiAI = 'berhasil' | 'gagal';

export type SentimenAI = 'positif' | 'netral' | 'negatif';

export type HasilKlasifikasiAI = {
  statusKlasifikasi: StatusKlasifikasiAI;
  // Nama field dipertahankan (kategoriAI) demi kontrak data; isinya sentimen.
  kategoriAI?: SentimenAI;
  pesan?: string;
};

type HasilModel = {
  label: string | null;
  status: string;
};

type Klasifikator = (teks: string) => HasilModel;

const LABEL_VALID: readonly string[] = ['positif', 'netral', 'negatif'];

let klasifikator: Klasifikator | null = null;
let gagalMemuat = false;

// Dimuat sekali dan malas (saat izin pertama dikirim), supaya model
// 273 KiB tidak diproses saat aplikasi baru dibuka.
function ambilKlasifikator(): Klasifikator | null {
  if (klasifikator) {
    return klasifikator;
  }
  if (gagalMemuat) {
    return null;
  }
  try {
    const { createSentimentClassifier } = require('./sentiment');
    const model = require('./model-edom.json');
    klasifikator = createSentimentClassifier(model) as Klasifikator;
    return klasifikator;
  } catch {
    gagalMemuat = true;
    return null;
  }
}

function pesanGagal(status: string): string {
  if (status === 'empty_input') {
    return 'Alasan belum dapat dianalisis. Pengajuan tetap disimpan untuk diperiksa Asprak.';
  }
  if (status === 'unknown_vocabulary') {
    return 'Alasan tidak memuat kata yang dikenali model. Pengajuan tetap disimpan untuk diperiksa Asprak.';
  }
  return 'Analisis sentimen tidak tersedia. Pengajuan tetap disimpan untuk diperiksa Asprak.';
}

/**
 * Menganalisis sentimen alasan izin dengan model lokal.
 * - label null (teks kosong atau kata tidak dikenali) diperlakukan GAGAL, bukan netral.
 * - Semua kegagalan mengembalikan statusKlasifikasi 'gagal' agar pengajuan
 *   tetap tersimpan dan dapat diperiksa manual oleh Asprak.
 * - Hasil tidak pernah dipakai sebagai keputusan otomatis.
 */
export async function klasifikasikanAlasanIzin(
  alasanInput: string,
): Promise<HasilKlasifikasiAI> {
  const alasan = alasanInput.trim();
  const klasifikasi = ambilKlasifikator();

  if (!klasifikasi) {
    return {
      statusKlasifikasi: 'gagal',
      pesan:
        'Model sentimen tidak dapat dimuat. Pengajuan tetap disimpan untuk diperiksa Asprak.',
    };
  }

  try {
    const hasil = klasifikasi(alasan);

    if (hasil.label === null || !LABEL_VALID.includes(hasil.label)) {
      return {
        statusKlasifikasi: 'gagal',
        pesan: pesanGagal(hasil.status),
      };
    }

    return {
      statusKlasifikasi: 'berhasil',
      kategoriAI: hasil.label as SentimenAI,
    };
  } catch {
    return {
      statusKlasifikasi: 'gagal',
      pesan:
        'Analisis sentimen gagal diproses. Pengajuan tetap disimpan untuk diperiksa Asprak.',
    };
  }
}