import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // ESM is fine for modern Node & Bun
  platform: "node", // covers Node + Bun
  sourcemap: true,
  minify: false,
  dts: false, // CLIs usually don't need types
});
