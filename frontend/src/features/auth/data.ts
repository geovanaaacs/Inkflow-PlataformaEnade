export interface TestAccount {
  email: string;
  password: string;
  description: string;
}

/**
 * Shown on the login screen in development so each plan/role can be tested
 * quickly. Passwords set by `npm run db:dev-accounts` (backend); the admin
 * comes from ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env.
 */
export const testAccounts: TestAccount[] = [
  { email: "maria.clara@email.com", password: "aluno123", description: "Aluna · Básico (gratuito)" },
  { email: "paula.cunha@email.com", password: "aluno123", description: "Aluna · Avançado" },
  { email: "nicole.silva@email.com", password: "aluno123", description: "Aluna · Premium" },
  { email: "marcela.guedes@email.com", password: "prof123", description: "Professora" },
  { email: "admin@inkflow.com", password: "admin123", description: "Administrador" },
];
