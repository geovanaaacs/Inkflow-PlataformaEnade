import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate from vite.config.ts so the tests don't depend on backend/.env (ports, proxy).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
