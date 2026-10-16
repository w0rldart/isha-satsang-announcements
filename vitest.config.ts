import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests run in plain Node without the Cloudflare and React Router plugins.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    environment: "node",
  },
});
