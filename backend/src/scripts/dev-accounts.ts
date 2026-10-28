/*
 * npm run db:dev-accounts — DEVELOPMENT ONLY.
 *
 * 1. The seed (05/07) stores a placeholder instead of password hashes. This
 *    replaces it with real bcrypt hashes of the test passwords the front shows
 *    in "Contas de teste", so those accounts can log in through the API.
 *    Accounts whose password was already set are left untouched.
 * 2. Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (.env), if
 *    both are set and the e-mail is free. No password lives in the code.
 */
import bcrypt from "bcryptjs";
import { env, isProduction } from "../config/env.js";
import { closePool, query } from "../db/pool.js";

const PLACEHOLDER_HASH = "SEED-HASH-FICTICIO-NAO-USAR-EM-PRODUCAO";

/** Same e-mails/passwords as src/features/auth/data.ts in the front. */
const SEED_PASSWORDS: Record<string, string> = {
  "maria.clara@email.com": "aluno123",
  "paula.cunha@email.com": "aluno123",
  "nicole.silva@email.com": "aluno123",
  "rafael.nunes@email.com": "aluno123",
  "marcela.guedes@email.com": "prof123",
  "ricardo.alves@email.com": "prof123",
};

async function main() {
  if (isProduction) {
    console.error("Este script é só para desenvolvimento.");
    process.exit(1);
  }

  for (const [email, password] of Object.entries(SEED_PASSWORDS)) {
    const hash = await bcrypt.hash(password, 10);
    const rows = await query<{ Email: string }>(
      `UPDATE dbo.Users SET PasswordHash = @hash, UpdatedAt = SYSUTCDATETIME()
       OUTPUT inserted.Email
       WHERE Email = @email AND PasswordHash = @placeholder`,
      { hash, email, placeholder: PLACEHOLDER_HASH }
    );
    console.log(rows.length ? `senha de teste definida: ${email}` : `sem alteração: ${email}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!adminEmail || !adminPassword) {
    console.log("Admin: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env para criar a conta.");
  } else if (adminPassword.length < 8) {
    console.log("Admin: ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
  } else {
    const created = await query<{ Email: string }>(
      `INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
       OUTPUT inserted.Email
       SELECT N'Administração Inkflow', @email, @hash, N'admin'
       WHERE NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @email AND DeletedAt IS NULL)`,
      { email: adminEmail, hash: await bcrypt.hash(adminPassword, 10) }
    );
    console.log(created.length ? `admin criado: ${adminEmail}` : `admin já existe: ${adminEmail}`);
  }

  console.log(`\nBanco: ${env.DB_CONNECTION_STRING.match(/Database=([^;]+)/i)?.[1] ?? "?"}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
