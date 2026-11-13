/** Same rules as the web forms and the API (auth.routes.ts registerSchema). */
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
export const MIN_PASSWORD = 6;
export const MIN_NAME = 2;

export function emailError(email: string): string | null {
  return EMAIL_PATTERN.test(email.trim()) ? null : "Informe um e-mail válido.";
}

export function passwordError(password: string): string | null {
  return password.length >= MIN_PASSWORD ? null : `Sua senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
}

export function nameError(name: string): string | null {
  return name.trim().length >= MIN_NAME ? null : "Informe seu nome completo.";
}
