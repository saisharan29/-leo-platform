import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    environment: "node",
    // vite's builtin list predates node:sqlite — treat it as external
    server: { deps: { external: [/^node:sqlite$/] } },
  },
  ssr: { external: ["node:sqlite"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
