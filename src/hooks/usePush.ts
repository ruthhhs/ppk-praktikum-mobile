import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type {
  PlatformPerangkat,
  StatusIzinNotifikasi,
  UsePushResult,
} from '@/data/notifikasi';
import { useAuth } from '@/hooks/useAuth';
import { simpanPerangkat } from '@/services/firebase/firestore';

const CHANNEL_ID = 'sip-notifikasi';

export function usePush(): UsePushResult {
  const { user } = useAuth();
  const [statusIzin, setStatusIzin] =
    useState<StatusIzinNotifikasi>('memuat');
  const [perangkatTerdaftar, setPerangkatTerdaftar] = useState(false);

  const periksaDanDaftarkan = useCallback(
    async (mintaIzin: boolean) => {
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        setStatusIzin('tidak_tersedia');
        setPerangkatTerdaftar(false);
        return;
      }

      if (!user) {
        setStatusIzin('tidak_tersedia');
        setPerangkatTerdaftar(false);
        return;
      }

      setStatusIzin('memuat');

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Notifikasi SIP!',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;

        if (status !== 'granted' && mintaIzin) {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }

        if (status !== 'granted') {
          setStatusIzin(
            status === 'denied' ? 'izin_ditolak' : 'memuat',
          );
          setPerangkatTerdaftar(false);
          return;
        }

        setStatusIzin('diizinkan');

        const tokenFcm = (await Notifications.getDevicePushTokenAsync()).data;
        const platform = Platform.OS as PlatformPerangkat;

        await simpanPerangkat(user.uid, tokenFcm, platform);
        setPerangkatTerdaftar(true);
      } catch (error) {
        console.error('Pendaftaran push gagal:', error);
        setStatusIzin('galat');
        setPerangkatTerdaftar(false);
      }
    },
    [user],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void periksaDanDaftarkan(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [periksaDanDaftarkan]);

  const mintaIzin = useCallback(
    () => periksaDanDaftarkan(true),
    [periksaDanDaftarkan],
  );

  return { statusIzin, perangkatTerdaftar, mintaIzin };
}