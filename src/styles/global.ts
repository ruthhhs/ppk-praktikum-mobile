import { StyleSheet } from 'react-native';

export const WARNA = {
  bg: '#FFFFFF',
  surface: '#FEFFE0',
  text: '#17454A',
  textMuted: 'rgba(23, 69, 74, 0.7)',
  primary: '#B5185F',
  highlight: '#D0E86E',
  accent: '#35C1C2',
  border: 'rgba(23, 69, 74, 0.15)',
  scrim: 'rgba(23, 69, 74, 0.5)',
};

export const globalStyles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  buttonPrimary: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.primary,
  },
  buttonDanger: {
    borderColor: WARNA.primary,
    backgroundColor: WARNA.bg,
  },
  buttonOutline: {
    borderColor: WARNA.border,
    backgroundColor: WARNA.bg,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  buttonTextPrimary: {
    color: WARNA.surface,
  },
  buttonTextOutline: {
    color: WARNA.text,
  },
  buttonTextDanger: {
    color: WARNA.primary,
  },
  buttonPressed: {
    opacity: 0.76,
  },
});