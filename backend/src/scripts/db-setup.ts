/*
 * npm run db:setup — creates/updates the tables and sample data in the
 * database of DB_CONNECTION_STRING (local SQL Server or Azure SQL).
 *
 * Runs database/02..10 in order, through the same connection as the API, so
 * no sqlcmd/SSMS is needed. The database itself must already exist (on Azure
 * it is created in the portal; locally, run 01_create_database.sql once).
 *
 * - `USE Inkflow;` lines are skipped: the connection already points to the
 *   database, and Azure SQL does not accept USE.
 * - Batches are split on `GO`, like sqlcmd does.
 * - The admin block of 06 (SQLCMD variables) is skipped; the admin and the
 *   test passwords come from `npm run db:dev-accounts` afterwards.
 *
 * Every script is idempotent, so running this again changes nothing.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, getPool, queryOne } from "../db/pool.js";

const DATABASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../database");

function batchesOf(script: string): string[] {
  const text = script
    .replace(/^﻿/, "")
    // Empty SQLCMD variables = "skip the admin account" in 06.
    .replace(/\$\((ADMIN_EMAIL|ADMIN_PASSWORD_HASH)\)/g, "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*USE\s+\[?\w+\]?\s*;?\s*$/i.test(line))
    .join("\n");
  return text
    .split(/^\s*GO\s*$/im)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

async function main() {
  const target = await queryOne<{ Name: string; Collation: string }>(
    "SELECT DB_NAME() AS Name, CAST(DATABASEPROPERTYEX(DB_NAME(), 'Collation') AS NVARCHAR(128)) AS Collation"
  );
  if (!target || target.Name === "master") {
    throw new Error("A conexão está no banco master. Inclua Database=Inkflow na DB_CONNECTION_STRING.");
  }
  console.log(`Banco: ${target.Name} (collation ${target.Collation})`);
  if (target.Collation !== "Latin1_General_CI_AI") {
    console.warn("Aviso: o projeto usa Latin1_General_CI_AI (busca sem acentos). Com outra collation, buscas com acento podem não achar resultados.");
  }

  // `--from=06`: continue a database that already ran the earlier scripts
  // (e.g. one created with 01-05 in a previous version of the project).
  const fromArg = process.argv.find((arg) => arg.startsWith("--from="))?.slice("--from=".length);
  if (fromArg !== undefined && !/^\d{2}$/.test(fromArg)) {
    throw new Error("Use --from com dois dígitos, por exemplo --from=06.");
  }

  // The sample data (05/07) is meant for a new database: on one already in use
  // (plans switched, accounts changed) it could clash with what users did.
  const hasUsersTable = await queryOne<{ Id: number | null }>("SELECT OBJECT_ID(N'dbo.Users', N'U') AS Id");
  const existing = hasUsersTable?.Id ? await queryOne<{ Users: number }>("SELECT COUNT(*) AS Users FROM dbo.Users") : null;
  if (existing?.Users && !fromArg) {
    throw new Error(
      `O banco ${target.Name} já tem dados (${existing.Users} usuários). O db:setup é para um banco novo e vazio.\n` +
        "Se ele parou num script antigo, continue a partir do próximo: npm run db:setup -- --from=NN"
    );
  }

  const files = (await readdir(DATABASE_DIR))
    .filter((name) => /^\d{2}_.+\.sql$/.test(name) && !name.startsWith("01_"))
    .filter((name) => !fromArg || name.slice(0, 2) >= fromArg)
    .sort();

  const pool = await getPool();
  for (const file of files) {
    const batches = batchesOf(await readFile(path.join(DATABASE_DIR, file), "utf8"));
    process.stdout.write(`${file} (${batches.length} blocos)… `);
    for (const [index, batch] of batches.entries()) {
      try {
        await pool.request().batch(batch);
      } catch (error) {
        console.log("erro");
        throw new Error(`${file}, bloco ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log("ok");
  }
  console.log("\nPronto. Agora rode `npm run db:dev-accounts` para as senhas de teste e a conta admin.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
