import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ command, mode }) => {
  const backendEnv = loadEnv(mode, path.resolve(__dirname, "../backend"), "");
  const frontendPort = Number(backendEnv.FRONTEND_PORT ?? 5173);
  const apiPort = Number(backendEnv.API_PORT ?? 3333);

  if (!Number.isInteger(frontendPort) || frontendPort <= 0) {
    throw new Error("FRONTEND_PORT deve ser um número inteiro positivo.");
  }
  if (!Number.isInteger(apiPort) || apiPort <= 0) {
    throw new Error("API_PORT deve ser um número inteiro positivo.");
  }
  // Same port would make the proxy forward /api to Vite itself (requests hang, then 500).
  // Only the dev server proxies: `vite build` (npm start in production) may share the port.
  if (command === "serve" && apiPort === frontendPort) {
    throw new Error(`API_PORT e FRONTEND_PORT não podem ser iguais (${apiPort}) no backend/.env.`);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: frontendPort,
      strictPort: true,
      // Mantém /api na mesma origem no navegador para que o cookie de sessão funcione.
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
  };
});
