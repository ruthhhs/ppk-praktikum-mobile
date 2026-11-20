import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type {
  Koordinat,
  StatusLokasi,
  UseLokasiResult,
} from "@/data/lokasi";

function ubahKeKoordinat(location: Location.LocationObject): Koordinat {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    // Nilai besar ini menandakan akurasi tidak tersedia,
    // sehingga tidak dianggap sebagai koordinat yang presisi.
    akurasi: location.coords.accuracy ?? 999_999,
    mocked: location.mocked ?? false,
  };
}

export function useLokasi(): UseLokasiResult {
  const [status, setStatus] =
    useState<StatusLokasi>("menunggu_koordinat");
  const [koordinat, setKoordinat] = useState<Koordinat | null>(null);

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const subscriptionRef =
    useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  const mulaiPemeriksaan = useCallback(
    async (mintaIzin: boolean): Promise<void> => {
      if (!mountedRef.current) return;

      const requestId = ++requestIdRef.current;
      const masihAktif = () =>
        mountedRef.current && requestIdRef.current === requestId;

      subscriptionRef.current?.remove();
      subscriptionRef.current = null;

      setStatus("memuat");
      setKoordinat(null);

      try {
        const layananAktif = await Location.hasServicesEnabledAsync();

        if (!masihAktif()) return;

        if (!layananAktif) {
          setStatus("layanan_mati");
          return;
        }

        const izin = mintaIzin
          ? await Location.requestForegroundPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();

        if (!masihAktif()) return;

        if (izin.status !== "granted") {
          setStatus(
            izin.status === "denied"
              ? "izin_ditolak"
              : "menunggu_koordinat",
          );
          return;
        }

        const posisiSaatIni = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!masihAktif()) return;

        setKoordinat(ubahKeKoordinat(posisiSaatIni));

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (location) => {
            if (!masihAktif()) return;

            setKoordinat(ubahKeKoordinat(location));
            setStatus("siap");
          },
          () => {
            if (!masihAktif()) return;

            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
            setKoordinat(null);
            setStatus("galat");
          },
        );

        if (!masihAktif()) {
          subscription.remove();
          return;
        }

        subscriptionRef.current = subscription;
        setStatus("siap");
      } catch {
        if (!masihAktif()) return;

        setKoordinat(null);
        setStatus("galat");
      }
    },
    [],
  );

  const mintaIzin = useCallback(async (): Promise<void> => {
    await mulaiPemeriksaan(true);
  }, [mulaiPemeriksaan]);

  const segarkan = useCallback(async (): Promise<void> => {
    await mulaiPemeriksaan(false);
  }, [mulaiPemeriksaan]);

  return {
    status,
    koordinat,
    mintaIzin,
    segarkan,
  };
}