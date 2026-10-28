import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";
import { findActiveUserById, type SessionUser } from "../modules/auth/users.repository.js";
import type { UserRole } from "../shared/plan-access.js";
import { HttpError } from "./errors.js";

/*
 * Session = signed JWT in an httpOnly cookie (JavaScript in the page can't
 * read it). The user is re-read from the database on every request, so a
 * deactivated account or a changed role takes effect immediately.
 */

const COOKIE_NAME = "inkflow_session";
const MAX_AGE_MS = env.SESSION_DAYS * 24 * 60 * 60 * 1000;

export function startSession(res: Response, userId: string): void {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${env.SESSION_DAYS}d`,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function endSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function readUserId(req: Request): string | null {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token !== "string") return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null; // expired or tampered
  }
}

/** Requires a logged-in, active user; optionally restricted to some profiles. */
export function requireUser(...roles: UserRole[]): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = readUserId(req);
    const user = userId ? await findActiveUserById(userId) : null;
    if (!user) throw new HttpError(401, "Sessão expirada. Entre novamente.");
    if (roles.length > 0 && !roles.includes(user.role)) {
      throw new HttpError(403, "Seu perfil não tem acesso a este recurso.");
    }
    req.user = user;
    next();
  };
}

/** The user attached by requireUser (use only on routes behind it). */
export function currentUser(req: Request): SessionUser {
  if (!req.user) throw new HttpError(401, "Sessão expirada. Entre novamente.");
  return req.user;
}
