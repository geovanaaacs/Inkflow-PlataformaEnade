import type { SessionUser } from "../modules/auth/users.repository.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireUser(). */
      user?: SessionUser;
    }
  }
}

export {};
