
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp harus digunakan di dalam AppProvider.',
    );
  }

  const { state, dispatch } = context;

  return {
    // State
    currentUser: state.currentUser,
    sesi: state.sesi,
    presensi: state.presensi,
    lastResult: state.lastResult,

    // Aksi pengguna
    setUser: (user: typeof state.currentUser) =>
      dispatch({
        type: 'SET_USER',
        payload: user,
      }),

    // Aksi sesi
    bukaSesi: (sesiId: string, kodePresensi: string) =>
      dispatch({
        type: 'BUKA_SESI',
        payload: { sesiId, kodePresensi },
      }),

    tutupSesi: (sesiId: string) =>
      dispatch({
        type: 'TUTUP_SESI',
        payload: { sesiId },
      }),

    // Aksi presensi
    lakukanPresensi: (
      sesiId: string,
      praktikanId: string,
      kodePresensi: string,
    ) =>
      dispatch({
        type: 'PRESENSI',
        payload: {
          sesiId,
          praktikanId,
          kodePresensi,
          waktuHadir: new Date().toISOString(),
        },
      }),
  };
}
