import {
  createContext,
  useReducer,
  type ReactNode,
} from 'react';

import {
  dummyPresensi,
  dummySesi,
  dummyUsers,
} from '../data/dummy';

import {
  AppReducer,
  type AppReducerState,
} from './AppReducer';

export type AppContextValue = {
  state: AppReducerState;
  dispatch: React.Dispatch<
    Parameters<typeof AppReducer>[1]
  >;
};

export const AppContext =
  createContext<AppContextValue | undefined>(undefined);

type AppProviderProps = {
  children: ReactNode;
};

const initialState: AppReducerState = {
  currentUser: null,
  sesi: dummySesi,
  presensi: dummyPresensi,
  lastResult: null,
};

export function AppProvider({
  children,
}: AppProviderProps) {
  const [state, dispatch] = useReducer(
    AppReducer,
    initialState,
  );

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
