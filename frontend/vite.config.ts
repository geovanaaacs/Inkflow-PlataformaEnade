import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // /api vai para o backend (npm run dev na raiz sobe os dois). Mesma origem
    // no navegador, então o cookie de sessão funciona sem configurar CORS.
    proxy: {
      "/api": "http://localhost:3333",
    },
  },
});
