import type { AuthUser } from "./auth-context";

/**
 * Mock accounts (same people as the database seed). Passwords are stored in
 * plain text only because this is a frontend mock — the real API will keep
 * password hashes server-side.
 */
export interface MockUserRecord extends AuthUser {
  password: string;
}

export interface TestAccount {
  email: string;
  password: string;
  description: string;
}

export const mockUsers: MockUserRecord[] = [
  {
    id: "u-maria",
    name: "Maria Clara Silva",
    email: "maria.clara@email.com",
    password: "aluno123",
    role: "aluno",
    plan: "basico",
    course: "Análise e Desenvolvimento de Sistemas",
  },
  {
    id: "u-paula",
    name: "Paula Cunha",
    email: "paula.cunha@email.com",
    password: "aluno123",
    role: "aluno",
    plan: "avancado",
    course: "Ciência da Computação",
  },
  {
    id: "u-nicole",
    name: "Nicole Silva",
    email: "nicole.silva@email.com",
    password: "aluno123",
    role: "aluno",
    plan: "premium",
    course: "Análise e Desenvolvimento de Sistemas",
  },
  {
    id: "u-rafael",
    name: "Rafael Nunes",
    email: "rafael.nunes@email.com",
    password: "aluno123",
    role: "aluno",
    plan: "basico",
    course: "Sistemas de Informação",
  },
  {
    id: "u-marcela",
    name: "Marcela Guedes",
    email: "marcela.guedes@email.com",
    password: "prof123",
    role: "professor",
    plan: null,
    course: "Engenharia de Software",
  },
];

/** Shown on the login screen in development so each plan/role can be tested quickly. */
export const testAccounts: TestAccount[] = [
  { email: "maria.clara@email.com", password: "aluno123", description: "Aluna · Básico (gratuito)" },
  { email: "paula.cunha@email.com", password: "aluno123", description: "Aluna · Avançado" },
  { email: "nicole.silva@email.com", password: "aluno123", description: "Aluna · Premium" },
  { email: "marcela.guedes@email.com", password: "prof123", description: "Professora" },
];
