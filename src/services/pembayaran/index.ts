import type { SubscribeTagihanAslab } from '@/data/pembayaran';

export const subscribeTagihanAslab: SubscribeTagihanAslab = (
  _praktikumIds,
  { onData },
) => {
  onData([]);
  return () => {};
};

export { buatTransaksi } from '@/services/backend';