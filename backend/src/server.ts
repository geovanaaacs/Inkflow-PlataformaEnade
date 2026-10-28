import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, getPool } from "./db/pool.js";

const app = createApp();

const server = app.listen(env.API_PORT, async () => {
  console.log(`API do Inkflow em http://localhost:${env.API_PORT}/api`);
  try {
    await getPool();
    console.log("Conectado ao SQL Server.");
  } catch (error) {
    console.error("Não foi possível conectar ao SQL Server:", error);
  }
});

async function shutdown() {
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
