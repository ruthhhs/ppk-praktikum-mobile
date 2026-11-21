import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { colors } from "@/constants/theme";
import type {
  Koordinat,
  LaboratoriumDenganId,
  StatusLokasi,
  TitikKoordinat,
} from "@/data/lokasi";
import KondisiLokasi from "./KondisiLokasi";

// Komponen peta bersama (B2). Murni presentasional: tidak memanggil useLokasi()
// maupun Firestore. Data lab, koordinat pengguna, dan status datang dari props,
// sehingga B1 (Kelola Laboratorium) dan B3 (Maps) memakai komponen yang sama.
//
// Dua mode yang bisa dipakai bersamaan atau terpisah:
// - Mode lihat: marker lab + ketuk marker/chip memanggil onPilihLab.
// - Mode pilih titik (B1): ketuk peta atau seret marker memanggil onPilihTitik.

export type LabPeta = Pick<
  LaboratoriumDenganId,
  "id" | "nama" | "lat" | "lng" | "radiusMeter" | "aktif"
>;

type EventKoordinat = {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
};

export interface PetaLabProps {
  daftarLab: readonly LabPeta[];
  /** Koordinat pengguna dari useLokasi(); null bila belum ada. */
  koordinatPengguna?: Koordinat | null;
  /** Bila diisi, banner kondisi lokasi tampil di atas peta (tidak tampil saat 'siap'). */
  statusLokasi?: StatusLokasi;
  onMintaIzin?: () => void;
  onSegarkan?: () => void;
  labTerpilihId?: string | null;
  onPilihLab?: (labId: string) => void;
  /** Titik baru yang sedang dipilih (mode pilih titik). */
  titikPilihan?: TitikKoordinat | null;
  /** Radius pratinjau (meter) di sekitar titikPilihan. */
  radiusPratinjau?: number;
  onPilihTitik?: (titik: TitikKoordinat) => void;
  /** Data lab sedang dimuat. */
  memuat?: boolean;
  /** Pesan galat saat data lab gagal dimuat. */
  pesanGalat?: string;
  style?: StyleProp<ViewStyle>;
}

// Area FSM UNDIP, dipakai bila belum ada lab untuk dijadikan pusat awal.
const PUSAT_BAWAAN = { latitude: -7.0486, longitude: 110.4412 };
const DELTA_BAWAAN = 0.01;
const DELTA_MINIMUM = 0.006;
const METER_PER_DERAJAT = 111_000;

const WARNA_LINGKARAN_LAB = "rgba(181, 24, 95, 0.12)";
const WARNA_LINGKARAN_PENGGUNA = "rgba(37, 99, 235, 0.12)";
const WARNA_GARIS_PENGGUNA = "rgba(37, 99, 235, 0.5)";
const WARNA_LINGKARAN_PILIHAN = "rgba(53, 193, 194, 0.18)";

function hitungRegion(daftar: readonly LabPeta[]) {
  if (daftar.length === 0) {
    return {
      ...PUSAT_BAWAAN,
      latitudeDelta: DELTA_BAWAAN,
      longitudeDelta: DELTA_BAWAAN,
    };
  }
  const lats = daftar.map((lab) => lab.lat);
  const lngs = daftar.map((lab) => lab.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, DELTA_MINIMUM),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, DELTA_MINIMUM),
  };
}

function TombolBulat({
  ikon,
  label,
  onPress,
  disabled,
}: {
  ikon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tombolBulat, disabled && styles.tombolMati]}
    >
      <Ionicons name={ikon} size={20} color={colors.text} />
    </Pressable>
  );
}

export default function PetaLab({
  daftarLab,
  koordinatPengguna = null,
  statusLokasi,
  onMintaIzin,
  onSegarkan,
  labTerpilihId = null,
  onPilihLab,
  titikPilihan = null,
  radiusPratinjau,
  onPilihTitik,
  memuat = false,
  pesanGalat,
  style,
}: PetaLabProps) {
  const petaRef = useRef<MapView>(null);
  const [petaSiap, setPetaSiap] = useState(false);
  const sudahFokusAwal = useRef(false);
  const [regionAwal] = useState(() => hitungRegion(daftarLab));

  const labTerpilih = daftarLab.find((lab) => lab.id === labTerpilihId) ?? null;
  const terpilihLat = labTerpilih?.lat;
  const terpilihLng = labTerpilih?.lng;
  const terpilihRadius = labTerpilih?.radiusMeter;
  const titikLat = titikPilihan?.lat;
  const titikLng = titikPilihan?.lng;

  function tampilkanSemuaLab() {
    if (daftarLab.length === 0) return;
    petaRef.current?.animateToRegion(hitungRegion(daftarLab), 400);
  }

  function pusatkanKePengguna() {
    if (!koordinatPengguna) return;
    petaRef.current?.animateToRegion(
      {
        latitude: koordinatPengguna.lat,
        longitude: koordinatPengguna.lng,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      400,
    );
  }

  // Data lab biasanya tiba setelah peta tampil: fokuskan ke semua lab sekali saja.
  useEffect(() => {
    if (!petaSiap || sudahFokusAwal.current) return;
    if (daftarLab.length === 0 || labTerpilihId || titikPilihan) return;
    sudahFokusAwal.current = true;
    petaRef.current?.animateToRegion(hitungRegion(daftarLab), 0);
  }, [petaSiap, daftarLab, labTerpilihId, titikPilihan]);

  // Lab dipilih (marker, chip, atau dari luar): pusatkan ke lab itu.
  useEffect(() => {
    if (
      !petaSiap ||
      terpilihLat === undefined ||
      terpilihLng === undefined ||
      terpilihRadius === undefined
    ) {
      return;
    }
    const delta = Math.max(0.004, (terpilihRadius * 4) / METER_PER_DERAJAT);
    petaRef.current?.animateToRegion(
      {
        latitude: terpilihLat,
        longitude: terpilihLng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400,
    );
  }, [petaSiap, terpilihLat, terpilihLng, terpilihRadius]);

  // Titik pilihan berubah (ketuk, seret, atau "lokasi saat ini"): geser tengah peta.
  useEffect(() => {
    if (!petaSiap || titikLat === undefined || titikLng === undefined) return;
    petaRef.current?.animateCamera(
      { center: { latitude: titikLat, longitude: titikLng } },
      { duration: 300 },
    );
  }, [petaSiap, titikLat, titikLng]);

  const tampilChip = !!onPilihLab && daftarLab.length > 1;
  const kosong = !memuat && !pesanGalat && daftarLab.length === 0;

  return (
    <View style={[styles.wadah, style]}>
      <MapView
        ref={petaRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={regionAwal}
        toolbarEnabled={false}
        onMapReady={() => setPetaSiap(true)}
        onPress={
          onPilihTitik
            ? (e: EventKoordinat) =>
                onPilihTitik({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })
            : undefined
        }
      >
        {daftarLab.map((lab) => {
          const terpilih = lab.id === labTerpilihId;
          return (
            <Marker
              key={lab.id}
              identifier={lab.id}
              coordinate={{ latitude: lab.lat, longitude: lab.lng }}
              title={lab.nama}
              pinColor={terpilih ? colors.primary : colors.accent}
              opacity={lab.aktif ? 1 : 0.5}
              zIndex={terpilih ? 2 : 1}
              onPress={() => onPilihLab?.(lab.id)}
            />
          );
        })}

        {labTerpilih ? (
          <Circle
            center={{ latitude: labTerpilih.lat, longitude: labTerpilih.lng }}
            radius={labTerpilih.radiusMeter}
            strokeColor={colors.primary}
            strokeWidth={2}
            fillColor={WARNA_LINGKARAN_LAB}
          />
        ) : null}

        {titikPilihan ? (
          <>
            <Marker
              coordinate={{
                latitude: titikPilihan.lat,
                longitude: titikPilihan.lng,
              }}
              title="Titik baru"
              pinColor={colors.highlight}
              zIndex={4}
              draggable={!!onPilihTitik}
              onDragEnd={(e: EventKoordinat) =>
                onPilihTitik?.({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })
              }
            />
            {radiusPratinjau ? (
              <Circle
                center={{
                  latitude: titikPilihan.lat,
                  longitude: titikPilihan.lng,
                }}
                radius={radiusPratinjau}
                strokeColor={colors.accent}
                strokeWidth={2}
                fillColor={WARNA_LINGKARAN_PILIHAN}
              />
            ) : null}
          </>
        ) : null}

        {koordinatPengguna ? (
          <>
            {koordinatPengguna.akurasi <= 200 ? (
              <Circle
                center={{
                  latitude: koordinatPengguna.lat,
                  longitude: koordinatPengguna.lng,
                }}
                radius={koordinatPengguna.akurasi}
                strokeColor={WARNA_GARIS_PENGGUNA}
                strokeWidth={1}
                fillColor={WARNA_LINGKARAN_PENGGUNA}
              />
            ) : null}
            <Marker
              coordinate={{
                latitude: koordinatPengguna.lat,
                longitude: koordinatPengguna.lng,
              }}
              title="Posisi Anda"
              pinColor="blue"
              zIndex={3}
            />
          </>
        ) : null}
      </MapView>

      <View pointerEvents="box-none" style={styles.atas}>
        {statusLokasi ? (
          <KondisiLokasi
            status={statusLokasi}
            onMintaIzin={onMintaIzin}
            onSegarkan={onSegarkan}
          />
        ) : null}
        {memuat ? (
          <View style={styles.info}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.infoTeks}>Memuat laboratorium...</Text>
          </View>
        ) : null}
        {pesanGalat ? (
          <View style={[styles.info, styles.infoGalat]}>
            <Text style={styles.infoTeks}>{pesanGalat}</Text>
          </View>
        ) : null}
        {kosong ? (
          <View style={styles.info}>
            <Text style={styles.infoTeks}>Belum ada data laboratorium.</Text>
          </View>
        ) : null}
      </View>

      <View pointerEvents="box-none" style={styles.kontrol}>
        <TombolBulat
          ikon="locate"
          label="Pusatkan ke lokasi saya"
          disabled={!koordinatPengguna}
          onPress={pusatkanKePengguna}
        />
        <TombolBulat
          ikon="resize"
          label="Tampilkan semua laboratorium"
          disabled={daftarLab.length === 0}
          onPress={tampilkanSemuaLab}
        />
      </View>

      {/* Pemilih lab cadangan: beberapa lab bisa berkoordinat sama sehingga marker menumpuk. */}
      {tampilChip ? (
        <View pointerEvents="box-none" style={styles.chip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipIsi}
          >
            {daftarLab.map((lab) => {
              const terpilih = lab.id === labTerpilihId;
              return (
                <Pressable
                  key={lab.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: terpilih }}
                  onPress={() => onPilihLab?.(lab.id)}
                  style={[styles.chipItem, terpilih && styles.chipTerpilih]}
                >
                  <Text
                    style={[
                      styles.chipTeks,
                      terpilih && styles.chipTeksTerpilih,
                    ]}
                  >
                    {lab.aktif ? lab.nama : `${lab.nama} (nonaktif)`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: {
    flex: 1,
    minHeight: 240,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  atas: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    gap: 8,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoGalat: { borderColor: colors.primary },
  infoTeks: { color: colors.text, fontSize: 13, flexShrink: 1 },
  kontrol: {
    position: "absolute",
    right: 10,
    bottom: 64,
    gap: 8,
  },
  tombolBulat: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tombolMati: { opacity: 0.45 },
  chip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
  },
  chipIsi: { gap: 8, paddingHorizontal: 10 },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTerpilih: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipTeks: { color: colors.text, fontSize: 12, fontWeight: "700" },
  chipTeksTerpilih: { color: colors.bg },
});