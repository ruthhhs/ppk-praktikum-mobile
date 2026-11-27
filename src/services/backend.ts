import { rnAuth } from '@/services/firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const BASE = BACKEND_URL?.replace(/\/+$/, '');

type HasilBuatTransaksi = {
  redirectUrl: string;
  orderId: string;
};

async function panggil<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  if (!BASE) return null;

  const user = rnAuth.currentUser;
  if (!user) {
    throw new Error('Sesi Firebase tidak tersedia.');
  }

  const token = await user.getIdToken();
  const response = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`backend ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function kirimNotifikasi(
  jenis: string,
  refId: string,
): Promise<void> {
  try {
    await panggil('notifikasi', { jenis, refId });
  } catch (error) {
    console.warn('[SIP backend] kirimNotifikasi gagal:', error);
  }
}

export async function hitungDenda(presensiId: string): Promise<void> {
  try {
    await panggil('hitung-denda', { presensiId });
  } catch (error) {
    console.warn('[SIP backend] hitungDenda gagal:', error);
  }
}

export function buatTransaksi(
  tagihanId: string,
): Promise<HasilBuatTransaksi | null> {
  return panggil<HasilBuatTransaksi>('buat-transaksi', { tagihanId });
}