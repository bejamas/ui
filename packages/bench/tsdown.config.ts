import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  sourcemap: true,
  minify: false,
  dts: true,
  fixedExtension: false,
});
