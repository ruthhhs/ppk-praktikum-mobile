
import type {
  Presensi,
  Sesi,
  User,
} from '../data/types';

export type AppState = {
  currentUser: User | null;
  sesi: Sesi[];
  presensi: Presensi[];
};

export type AppAction =
  | {
      type: 'SET_USER';
      payload: User | null;
    }
  | {
      type: 'BUKA_SESI';
      payload: {
        sesiId: string;
        kodePresensi: string;
      };
    }
  | {
      type: 'TUTUP_SESI';
      payload: {
        sesiId: string;
      };
    }
  | {
      type: 'PRESENSI';
      payload: {
        sesiId: string;
        praktikanId: string;
        kodePresensi: string;
        waktuHadir: string;
      };
    };

export type AppResult = {
  success: boolean;
  message: string;
};

export type AppReducerState = AppState & {
  lastResult: AppResult | null;
};

export type AppReducerAction = AppAction;

export function AppReducer(
  state: AppReducerState,
  action: AppAction,
): AppReducerState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        currentUser: action.payload,
        lastResult: null,
      };

    case 'BUKA_SESI': {
      const sesi = state.sesi.find(
        (item) => item.id === action.payload.sesiId,
      );

      if (!sesi) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Sesi tidak ditemukan.',
          },
        };
      }

      if (sesi.status !== 'belum_dibuka') {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Sesi tidak dapat dibuka dengan status saat ini.',
          },
        };
      }

      const kode = action.payload.kodePresensi.trim();

      if (!kode) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Kode presensi wajib diisi.',
          },
        };
      }

      return {
        ...state,
        sesi: state.sesi.map((item) =>
          item.id === sesi.id
            ? {
                ...item,
                status: 'dibuka',
                kodePresensi: kode,
              }
            : item,
        ),
        lastResult: {
          success: true,
          message: 'Sesi berhasil dibuka.',
        },
      };
    }

    case 'TUTUP_SESI': {
      const sesi = state.sesi.find(
        (item) => item.id === action.payload.sesiId,
      );

      if (!sesi) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Sesi tidak ditemukan.',
          },
        };
      }

      if (sesi.status !== 'dibuka') {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Hanya sesi yang sedang dibuka yang bisa ditutup.',
          },
        };
      }

      return {
        ...state,
        sesi: state.sesi.map((item) =>
          item.id === sesi.id
            ? { ...item, status: 'ditutup' }
            : item,
        ),
        lastResult: {
          success: true,
          message: 'Sesi berhasil ditutup.',
        },
      };
    }

    case 'PRESENSI': {
      const { sesiId, praktikanId, kodePresensi, waktuHadir } =
        action.payload;

      const sesi = state.sesi.find(
        (item) => item.id === sesiId,
      );

      if (!sesi) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Sesi tidak ditemukan.',
          },
        };
      }

      if (sesi.status !== 'dibuka') {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Presensi hanya bisa dilakukan saat sesi dibuka.',
          },
        };
      }

      if (!sesi.kodePresensi || sesi.kodePresensi !== kodePresensi.trim()) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Kode presensi tidak sesuai.',
          },
        };
      }

      const sudahPresensi = state.presensi.some(
        (item) =>
          item.sesiId === sesiId &&
          item.praktikanId === praktikanId,
      );

      if (sudahPresensi) {
        return {
          ...state,
          lastResult: {
            success: false,
            message: 'Kamu sudah melakukan presensi pada sesi ini.',
          },
        };
      }

      const presensiBaru: Presensi = {
        id: `presensi-${Date.now()}`,
        sesiId,
        praktikanId,
        waktuHadir,
      };

      return {
        ...state,
        presensi: [...state.presensi, presensiBaru],
        lastResult: {
          success: true,
          message: 'Presensi berhasil dicatat.',
        },
      };
    }

    default:
      return state;
  }
}
