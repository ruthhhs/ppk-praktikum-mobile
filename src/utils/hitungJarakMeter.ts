import type { TitikKoordinat } from "@/data/lokasi";

const RADIUS_BUMI_METER = 6_371_000;

export function hitungJarakMeter(
  titikA: TitikKoordinat,
  titikB: TitikKoordinat,
): number {
  const koordinatValid =
    Number.isFinite(titikA.lat) &&
    Number.isFinite(titikA.lng) &&
    Number.isFinite(titikB.lat) &&
    Number.isFinite(titikB.lng) &&
    titikA.lat >= -90 &&
    titikA.lat <= 90 &&
    titikB.lat >= -90 &&
    titikB.lat <= 90 &&
    titikA.lng >= -180 &&
    titikA.lng <= 180 &&
    titikB.lng >= -180 &&
    titikB.lng <= 180;

  // Jarak tak hingga membuat pemeriksaan radius gagal dengan aman
  // jika salah satu koordinat tidak valid.
  if (!koordinatValid) {
    return Number.POSITIVE_INFINITY;
  }

  const keRadian = (derajat: number) => (derajat * Math.PI) / 180;

  const latA = keRadian(titikA.lat);
  const latB = keRadian(titikB.lat);
  const selisihLat = keRadian(titikB.lat - titikA.lat);
  const selisihLng = keRadian(titikB.lng - titikA.lng);

  const nilaiHaversine =
    Math.sin(selisihLat / 2) ** 2 +
    Math.cos(latA) *
      Math.cos(latB) *
      Math.sin(selisihLng / 2) ** 2;

  const nilaiAman = Math.min(1, Math.max(0, nilaiHaversine));

  return (
    2 *
    RADIUS_BUMI_METER *
    Math.atan2(Math.sqrt(nilaiAman), Math.sqrt(1 - nilaiAman))
  );
}