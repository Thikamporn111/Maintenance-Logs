import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src("./src"),
      // "server-only" throws outside the React server runtime; tests run plain Node.
      "server-only": src("./tests/stubs/empty.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
