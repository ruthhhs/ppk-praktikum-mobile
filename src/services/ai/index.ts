export type StatusKlasifikasiAI = 'berhasil' | 'gagal';

export type HasilKlasifikasiAI = {
  statusKlasifikasi: StatusKlasifikasiAI;
  kategoriAI?: string;
  pesan?: string;
};

const AI_TIMEOUT_MS = 10000;

function ekstrakKategoriDariRespons(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const record = data as Record<string, unknown>;
  const kandidatLangsung = [
    record.kategori,
    record.kategoriAI,
    record.category,
    record.label,
    record.prediction,
    record.prediksi,
    record.result,
    record.hasil,
  ];

  for (const nilai of kandidatLangsung) {
    if (typeof nilai === 'string' && nilai.trim().length > 0) {
      return nilai.trim();
    }
  }

  if (record.data && typeof record.data === 'object') {
    return ekstrakKategoriDariRespons(record.data);
  }

  return undefined;
}

/**
 * Mengirim alasan izin ke API model AI yang disediakan pengajar untuk mendapatkan prediksi kategori alasan.
 * - Tidak menyimpan endpoint rahasia atau API key di kode sumber (membaca dari EXPO_PUBLIC_AI_API_URL).
 * - Tidak mengarang kategori jika API belum dikonfigurasi atau gagal merespons.
 * - Kegagalan API mengembalikan statusKlasifikasi: 'gagal' agar pengajuan izin tetap tersimpan
 *   dan dapat diperiksa secara manual oleh asisten.
 */
export async function klasifikasikanAlasanIzin(
  alasanInput: string,
): Promise<HasilKlasifikasiAI> {
  const alasan = alasanInput.trim();
  const endpoint = (process.env.EXPO_PUBLIC_AI_API_URL ?? '').trim();
  const apiToken = (process.env.EXPO_PUBLIC_AI_API_TOKEN ?? '').trim();

  if (!endpoint) {
    return {
      statusKlasifikasi: 'gagal',
      pesan:
        'Layanan klasifikasi AI belum dikonfigurasi. Pengajuan izin tetap disimpan untuk diperiksa manual oleh asisten.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, AI_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (apiToken) {
      headers.Authorization = apiToken.startsWith('Bearer ')
        ? apiToken
        : `Bearer ${apiToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        alasan,
        text: alasan,
        input: alasan,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        statusKlasifikasi: 'gagal',
        pesan: `Layanan AI mengembalikan status ${response.status}. Pengajuan tetap diteruskan untuk peninjauan manual asisten.`,
      };
    }

    const body: unknown = await response.json();
    const kategori = ekstrakKategoriDariRespons(body);

    if (!kategori) {
      return {
        statusKlasifikasi: 'gagal',
        pesan:
          'Format respons klasifikasi AI tidak memuat kategori yang dikenali. Pengajuan tetap disimpan untuk ditinjau asisten.',
      };
    }

    return {
      statusKlasifikasi: 'berhasil',
      kategoriAI: kategori,
    };
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.message.toLowerCase().includes('aborted'));

    return {
      statusKlasifikasi: 'gagal',
      pesan: isAbort
        ? 'Waktu tunggu layanan AI habis. Pengajuan izin tetap disimpan untuk diperiksa manual oleh asisten.'
        : 'Tidak dapat terhubung ke layanan AI. Pengajuan izin tetap disimpan untuk diperiksa manual oleh asisten.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
