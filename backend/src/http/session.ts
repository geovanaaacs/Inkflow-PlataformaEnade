import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";
import { findActiveUserById, type SessionUser } from "../modules/auth/users.repository.js";
import type { UserRole } from "../shared/plan-access.js";
import { HttpError } from "./errors.js";

/*
 * Session = signed JWT. The web front gets it in an httpOnly cookie (JavaScript
 * in the page can't read it); the mobile app gets it in the response body and
 * sends it back as `Authorization: Bearer <token>`. Same token either way.
 * The user is re-read from the database on every request, so a deactivated
 * account or a changed role takes effect immediately.
 */

const COOKIE_NAME = "inkflow_session";
const MAX_AGE_MS = env.SESSION_DAYS * 24 * 60 * 60 * 1000;

function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${env.SESSION_DAYS}d`,
  });
}

/** Token for clients without cookies (mobile app). Logging out = discarding it. */
export function issueToken(userId: string): { token: string; expiresAt: string } {
  return {
    token: signToken(userId),
    expiresAt: new Date(Date.now() + MAX_AGE_MS).toISOString(),
  };
}

export function startSession(res: Response, userId: string): void {
  const token = signToken(userId);
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

/** Bearer token (mobile) when the header is sent, otherwise the session cookie (web). */
function readToken(req: Request): string | null {
  const header = req.get("authorization");
  if (header !== undefined) {
    const [scheme, value] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" && value ? value : null;
  }
  const cookie: unknown = req.cookies?.[COOKIE_NAME];
  return typeof cookie === "string" ? cookie : null;
}

function readUserId(req: Request): string | null {
  const token = readToken(req);
  if (!token) return null;
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
