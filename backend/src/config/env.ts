import "dotenv/config";
import { z } from "zod";

/** Environment variables, validated once at startup (see .env.example). */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    FRONTEND_PORT: z.coerce.number().int().positive().default(5173),
    // API_PORT (not PORT): tools like the dev preview set PORT for the whole process tree.
    API_PORT: z.coerce.number().int().positive().default(3333),
    DB_CONNECTION_STRING: z.string().min(1, "Defina DB_CONNECTION_STRING no .env"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres"),
    SESSION_DAYS: z.coerce.number().int().positive().default(30),
    // Optional: explanation of questions by AI (Google Gemini, free key from aistudio.google.com).
    GEMINI_API_KEY: z.string().trim().optional(),
    GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.5-flash-lite"),
  })
  // In development Vite owns FRONTEND_PORT and proxies /api to API_PORT: the same
  // port makes the proxy call itself (every request hangs ~15 s and fails).
  .refine((value) => value.NODE_ENV === "production" || value.API_PORT !== value.FRONTEND_PORT, {
    path: ["API_PORT"],
    message: "em desenvolvimento precisa ser diferente de FRONTEND_PORT (o Vite usa essa porta)",
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(`Configuração inválida no .env:\n${problems.join("\n")}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
