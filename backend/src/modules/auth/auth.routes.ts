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
  findPasswordHashById,
  findPhoto,
  toPublicUser,
  updatePhoto,
  updatePasswordHash,
  updateProfile,
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
 *
 * Own profile (any logged-in user, cookie or token):
 *   PATCH /api/me  { name, email, course }  → updated user
 *   POST  /api/me/password  { currentPassword, newPassword } → 204
 *   PUT   /api/me/photo  { photo: "data:image/jpeg;base64,..." } → updated user
 *   DELETE /api/me/photo → updated user (no photo)
 */

const BCRYPT_ROUNDS = 10;

const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.");

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});

const name = z.string().trim().min(2, "Informe seu nome completo.").max(150);
const newPassword = z.string().min(6, "Sua senha deve ter pelo menos 6 caracteres.").max(128);

const registerSchema = z.object({
  name,
  email,
  password: newPassword,
  role: z.enum(["aluno", "professor"], { message: "Escolha o perfil aluno ou professor." }),
});

const profileSchema = z.object({
  name,
  email,
  course: z
    .string()
    .trim()
    .max(150)
    .nullish()
    .transform((value) => value || null),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword,
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  });

// The app sends a 256 x 256 JPEG (about 20–40 KB); the limit leaves room for PNG.
const MAX_PHOTO_LENGTH = 400_000;
const photoSchema = z.object({
  photo: z
    .string()
    .max(MAX_PHOTO_LENGTH, "A foto é grande demais. Escolha outra imagem.")
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/, "Envie uma imagem JPEG, PNG ou WebP."),
});

/** Public user plus the photo (the session user doesn't carry it). */
async function publicUser(user: SessionUser) {
  return toPublicUser(user, await findPhoto(user.id));
}

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
async function tokenResponse(user: SessionUser) {
  return { ...issueToken(user.id), user: await publicUser(user) };
}

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res) => {
  const user = await authenticate(req.body);
  startSession(res, user.id);
  res.json(await publicUser(user));
});

authRouter.post("/auth/register", async (req, res) => {
  const user = await register(req.body);
  startSession(res, user.id);
  res.status(201).json(toPublicUser(user));
});

authRouter.post("/auth/mobile/login", async (req, res) => {
  res.json(await tokenResponse(await authenticate(req.body)));
});

authRouter.post("/auth/mobile/register", async (req, res) => {
  res.status(201).json(await tokenResponse(await register(req.body)));
});

authRouter.post("/auth/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireUser(), async (req, res) => {
  res.json(await publicUser(currentUser(req)));
});

authRouter.patch("/me", requireUser(), async (req, res) => {
  const me = currentUser(req);
  const input = profileSchema.parse(req.body);
  if (await emailInUse(input.email, me.id)) throw new HttpError(409, "Já existe uma conta com este e-mail.");

  await updateProfile(me.id, input);
  const updated = await findActiveUserById(me.id);
  if (!updated) throw new HttpError(404, "Conta não encontrada.");
  res.json(await publicUser(updated));
});

authRouter.put("/me/photo", requireUser(), async (req, res) => {
  const me = currentUser(req);
  const { photo } = photoSchema.parse(req.body);
  await updatePhoto(me.id, photo);
  res.json(toPublicUser(me, photo));
});

authRouter.delete("/me/photo", requireUser(), async (req, res) => {
  const me = currentUser(req);
  await updatePhoto(me.id, null);
  res.json(toPublicUser(me, null));
});

authRouter.post("/me/password", requireUser(), async (req, res) => {
  const me = currentUser(req);
  const input = passwordChangeSchema.parse(req.body);
  const hash = await findPasswordHashById(me.id);
  if (!hash || !(await bcrypt.compare(input.currentPassword, hash))) {
    throw new HttpError(400, "A senha atual está incorreta.");
  }
  await updatePasswordHash(me.id, await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS));
  res.status(204).end();
});
