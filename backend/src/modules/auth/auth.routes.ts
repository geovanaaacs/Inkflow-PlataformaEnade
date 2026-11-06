import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { currentUser, endSession, issueToken, requireUser, startSession } from "../../http/session.js";
import {
  createUser,
  emailInUse,
  findActiveUserById,
  findCredentialsByEmail,
  toPublicUser,
  type SessionUser,
} from "./users.repository.js";

/*
 * Front: src/features/auth/api.ts (session in an httpOnly cookie)
 *   login() → POST /api/auth/login        signup() → POST /api/auth/register
 *   logout() → POST /api/auth/logout      getSessionUser() → GET /api/me
 *
 * Mobile app (no cookies): same rules, the token comes in the body and goes
 * back as `Authorization: Bearer <token>`; logging out = discarding it.
 *   POST /api/auth/mobile/login           POST /api/auth/mobile/register
 */

const BCRYPT_ROUNDS = 10;

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.");

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(150),
  email,
  password: z.string().min(6, "Sua senha deve ter pelo menos 6 caracteres.").max(128),
  role: z.enum(["aluno", "professor"], { message: "Escolha o perfil aluno ou professor." }),
});

async function authenticate(body: unknown): Promise<SessionUser> {
  const input = loginSchema.parse(body);
  const credentials = await findCredentialsByEmail(input.email);
  // Same message for unknown e-mail and wrong password (don't reveal which accounts exist).
  const valid = credentials && (await bcrypt.compare(input.password, credentials.passwordHash));
  if (!credentials || !valid) throw new HttpError(401, "E-mail ou senha inválidos.");
  if (!credentials.isActive) {
    throw new HttpError(403, "Esta conta está desativada. Fale com a administração do Inkflow.");
  }

  const user = await findActiveUserById(credentials.id);
  if (!user) throw new HttpError(401, "E-mail ou senha inválidos.");
  return user;
}

async function register(body: unknown): Promise<SessionUser> {
  const input = registerSchema.parse(body);
  if (await emailInUse(input.email)) throw new HttpError(409, "Já existe uma conta com este e-mail.");

  const id = await createUser({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    role: input.role,
  });
  const user = await findActiveUserById(id);
  if (!user) throw new HttpError(500, "Não foi possível concluir o cadastro.");
  return user;
}

/** Body of the mobile login/register: the token plus the same public user. */
function tokenResponse(user: SessionUser) {
  return { ...issueToken(user.id), user: toPublicUser(user) };
}

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res) => {
  const user = await authenticate(req.body);
  startSession(res, user.id);
  res.json(toPublicUser(user));
});

authRouter.post("/auth/register", async (req, res) => {
  const user = await register(req.body);
  startSession(res, user.id);
  res.status(201).json(toPublicUser(user));
});

authRouter.post("/auth/mobile/login", async (req, res) => {
  res.json(tokenResponse(await authenticate(req.body)));
});

authRouter.post("/auth/mobile/register", async (req, res) => {
  res.status(201).json(tokenResponse(await register(req.body)));
});

authRouter.post("/auth/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireUser(), (req, res) => {
  res.json(toPublicUser(currentUser(req)));
});
