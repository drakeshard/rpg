import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

const foundation = (subpath: string) =>
  fileURLToPath(new URL(`./.foundation-src/packages/foundation/src/${subpath}`, import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/rpg/" : "/",
  resolve: {
    alias: {
      "@drakeshard/foundation/time": foundation("time/index.ts"),
      "@drakeshard/foundation/random": foundation("random/index.ts"),
      "@drakeshard/foundation/input/browser": foundation("input/browser/index.ts"),
      "@drakeshard/foundation/input": foundation("input/index.ts"),
    },
  },
});
