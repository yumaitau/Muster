import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@muster/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@muster/db": new URL("./packages/db/src/index.ts", import.meta.url).pathname,
      "@muster/connector-sdk": new URL("./packages/connector-sdk/src/index.ts", import.meta.url).pathname,
      "@muster/connector-xero": new URL("./packages/connector-xero/src/index.ts", import.meta.url).pathname
    }
  }
});
