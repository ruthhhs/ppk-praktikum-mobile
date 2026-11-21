import { useRef, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { LaboratoriumDenganId, Koordinat } from '@/data/lokasi';

export interface PetaLabProps {
  labs: LaboratoriumDenganId[];
  posisiPengguna: Koordinat | null;
  labTerpilihId: string | null;
  onMarkerPress: (labId: string) => void;
}

const REGION_AWAL = {
  latitude: -7.0482,
  longitude: 110.4408,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

const WARNA_RADIUS = 'rgba(37, 99, 235, 0.12)';
const WARNA_RADIUS_GARIS = 'rgba(37, 99, 235, 0.35)';
const WARNA_RADIUS_TERPILIH = 'rgba(37, 99, 235, 0.22)';
const WARNA_RADIUS_GARIS_TERPILIH = 'rgba(37, 99, 235, 0.6)';
const WARNA_PENGGUNA = '#2563EB';

export default function PetaLab({
  labs,
  posisiPengguna,
  labTerpilihId,
  onMarkerPress,
}: PetaLabProps) {
  const mapRef = useRef<MapView>(null);

  const handleMarkerPress = useCallback(
    (labId: string) => {
      onMarkerPress(labId);
      const lab = labs.find((l) => l.id === labId);
      if (lab && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: lab.lat,
            longitude: lab.lng,
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          },
          400,
        );
      }
    },
    [labs, onMarkerPress],
  );

  return (
    <View style={styles.wadah}>
      <MapView
        ref={mapRef}
        style={styles.peta}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={REGION_AWAL}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {labs.map((lab) => {
          const terpilih = lab.id === labTerpilihId;
          return (
            <View key={lab.id}>
              <Marker
                coordinate={{ latitude: lab.lat, longitude: lab.lng }}
                title={lab.nama}
                description={lab.deskripsi}
                pinColor={terpilih ? '#1D4ED8' : '#EF4444'}
                onPress={() => handleMarkerPress(lab.id)}
              />
              <Circle
                center={{ latitude: lab.lat, longitude: lab.lng }}
                radius={lab.radiusMeter}
                fillColor={terpilih ? WARNA_RADIUS_TERPILIH : WARNA_RADIUS}
                strokeColor={terpilih ? WARNA_RADIUS_GARIS_TERPILIH : WARNA_RADIUS_GARIS}
                strokeWidth={1.5}
              />
            </View>
          );
        })}

        {posisiPengguna ? (
          <Marker
            coordinate={{
              latitude: posisiPengguna.lat,
              longitude: posisiPengguna.lng,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.titikPengguna}>
              <View style={styles.titikPenggunaDalam} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 280,
  },
  peta: {
    flex: 1,
  },
  titikPengguna: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titikPenggunaDalam: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: WARNA_PENGGUNA,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
