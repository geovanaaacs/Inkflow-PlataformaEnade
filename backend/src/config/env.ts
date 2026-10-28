import "dotenv/config";
import { z } from "zod";

/** Environment variables, validated once at startup (see .env.example). */
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_PORT: z.coerce.number().int().positive().default(5173),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DB_CONNECTION_STRING: z.string().min(1, "Defina DB_CONNECTION_STRING no .env"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres"),
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(`Configuração inválida no .env:\n${problems.join("\n")}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
