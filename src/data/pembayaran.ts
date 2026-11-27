import type {
  PembayaranDoc,
  TagihanDoc,
  WithId,
} from './firestoreType';

export type { StatusPembayaran, StatusTagihan } from './firestoreType';

export type Tagihan = WithId<TagihanDoc>;
export type Pembayaran = WithId<PembayaranDoc>;

export interface UseTagihanResult {
  data: Tagihan[];
  loading: boolean;
  error: Error | null;
}

export type UseTagihan = (
  uid: string | null | undefined,
) => UseTagihanResult;

export type Unsubscribe = () => void;

export interface SubscribeTagihanAslabCallbacks {
  onData: (tagihan: Tagihan[]) => void;
  onError?: (error: Error) => void;
}

export type SubscribeTagihanAslab = (
  praktikumIds: string[],
  callbacks: SubscribeTagihanAslabCallbacks,
) => Unsubscribe;

export interface UsePembayaranParams {
  uid?: string | null;
  tagihanId?: string | null;
}

export interface UsePembayaranResult {
  data: Pembayaran[];
  loading: boolean;
  error: Error | null;
}

export type UsePembayaran = (
  params: UsePembayaranParams,
) => UsePembayaranResult;