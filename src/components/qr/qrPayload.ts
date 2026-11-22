const PREFIX_V1 = 'sip-presensi:v1:';

export type HasilParseQrPresensi =
  | {
      ok: true;
      sesiId: string | null;
      kode: string;
    }
  | {
      ok: false;
      pesan: string;
    };

/**
 * Membentuk payload QR presensi standar untuk satu sesi praktikum.
 * Format: `sip-presensi:v1:<sesiId>:<kode4Digit>`
 */
export function buatPayloadQrPresensi(sesiId: string, kode: string): string {
  const sesiBersih = sesiId.trim();
  const kodeBersih = kode.trim();
  return `${PREFIX_V1}${sesiBersih}:${kodeBersih}`;
}

/**
 * Mem-parse hasil pemindaian QR menjadi `{ sesiId, kode }`.
 * Mendukung format standar `sip-presensi:v1:<sesiId>:<kode>`,
 * format JSON `{ sesiId, kode }`, serta fallback kode 4 digit murni.
 */
export function parsePayloadQrPresensi(
  rawData: string,
  expectedSesiId?: string,
): HasilParseQrPresensi {
  const teks = rawData.trim();
  if (!teks) {
    return {
      ok: false,
      pesan: 'QR Code kosong atau tidak terbaca. Coba pindai ulang.',
    };
  }

  let sesiId: string | null = null;
  let kode = '';

  if (teks.startsWith(PREFIX_V1)) {
    const isi = teks.slice(PREFIX_V1.length);
    const pemisahTerakhir = isi.lastIndexOf(':');
    if (pemisahTerakhir <= 0) {
      return {
        ok: false,
        pesan: 'Format QR presensi tidak valid. Minta asisten menampilkan ulang QR.',
      };
    }
    sesiId = isi.slice(0, pemisahTerakhir).trim();
    kode = isi.slice(pemisahTerakhir + 1).trim();
  } else if (teks.startsWith('{') && teks.endsWith('}')) {
    try {
      const parsed = JSON.parse(teks) as Record<string, unknown>;
      sesiId =
        typeof parsed.sesiId === 'string' && parsed.sesiId.trim()
          ? parsed.sesiId.trim()
          : null;
      kode = typeof parsed.kode === 'string' ? parsed.kode.trim() : '';
    } catch {
      return {
        ok: false,
        pesan: 'QR Code tidak dikenali sebagai QR presensi SIP!.',
      };
    }
  } else if (/^\d{4}$/.test(teks)) {
    kode = teks;
  } else {
    return {
      ok: false,
      pesan: 'QR Code ini bukan QR presensi SIP!.',
    };
  }

  if (!/^\d{4}$/.test(kode)) {
    return {
      ok: false,
      pesan: 'Kode presensi di dalam QR harus berupa 4 digit angka.',
    };
  }

  if (
    expectedSesiId &&
    sesiId &&
    sesiId !== expectedSesiId.trim()
  ) {
    return {
      ok: false,
      pesan:
        'QR ini milik sesi praktikum lain. Pastikan kamu memindai QR untuk sesi yang sedang dibuka.',
    };
  }

  return {
    ok: true,
    sesiId,
    kode,
  };
}
