// Mirrors PasswordPolicy in the backend; the backend remains the authority.
export const USERNAME_MAX = 40;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 12;

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
    test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { label: 'Al menos una letra mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { label: 'Al menos un número', test: (p) => /\d/.test(p) },
  { label: 'Al menos un carácter especial (! @ # $ % *)', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) },
  { label: 'Sin espacios', test: (p) => p.length > 0 && !/\s/.test(p) },
];

export const USERNAME_PATTERN = /^(?=.{3,40}$)[A-Za-z0-9._-]+(@[A-Za-z0-9.-]+)?$/;

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

// Mirrors ContactPolicy in the backend.
export const EMAIL_MAX = 120;
export const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const isEmail = (value: string) => value.trim().length <= EMAIL_MAX && EMAIL_PATTERN.test(value.trim());

/** Same reading as the backend: digits with an optional +; a 10-digit Colombian mobile gets +57. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s().-]/g, '');
  const international = /^3\d{9}$/.test(digits) ? `+57${digits}` : digits;
  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}
