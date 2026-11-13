const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (v: string): string | null =>
  !v.trim() ? 'Email wajib diisi.' : !EMAIL_REGEX.test(v.trim()) ? 'Format email tidak valid.' : null;

export const validatePassword = (v: string): string | null =>
  !v ? 'Password wajib diisi.' : v.length < 8 ? 'Password minimal 8 karakter.' : null;

export const validateNama = (v: string): string | null =>
  !v.trim() ? 'Nama wajib diisi.' : null;

export const validateNim = (v: string): string | null =>
  !v.trim()
    ? 'NIM wajib diisi.'
    : !/^\d+$/.test(v.trim())
      ? 'NIM hanya boleh berisi angka.'
      : v.trim().length < 14
        ? 'NIM minimal 14 angka.'
        : null;