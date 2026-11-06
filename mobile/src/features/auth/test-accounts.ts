/**
 * Shown on the login screen in development only (__DEV__) so each plan and
 * profile can be tested quickly — same list as frontend/src/features/auth/data.ts.
 * Passwords set by `npm run db:dev-accounts` (backend); the admin comes from
 * ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env.
 */
export const testAccounts = [
  { email: "maria.clara@email.com", password: "aluno123", description: "Aluna · Básico" },
  { email: "paula.cunha@email.com", password: "aluno123", description: "Aluna · Avançado" },
  { email: "nicole.silva@email.com", password: "aluno123", description: "Aluna · Premium" },
  { email: "marcela.guedes@email.com", password: "prof123", description: "Professora" },
  { email: "admin@inkflow.com", password: "admin123", description: "Administrador" },
];
