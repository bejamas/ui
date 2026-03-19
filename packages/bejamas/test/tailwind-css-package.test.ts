import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const bejamasPackageJson = readFileSync(
  path.resolve(repoRoot, "packages/bejamas/package.json"),
  "utf8",
);
const bejamasTailwindCss = readFileSync(
  path.resolve(repoRoot, "packages/bejamas/src/tailwind.css"),
  "utf8",
);
const shadcnTailwindCss = readFileSync(
  path.resolve(repoRoot, "tmp/shadcn-ui/packages/shadcn/src/tailwind.css"),
  "utf8",
);

describe("bejamas tailwind.css package asset", () => {
  test("exports the tailwind.css subpath", () => {
    expect(bejamasPackageJson).toContain('"./tailwind.css"');
    expect(bejamasPackageJson).toContain('"style": "./src/tailwind.css"');
    expect(bejamasPackageJson).toContain('"src/tailwind.css"');
  });

  test("matches the vendored shadcn tailwind.css source", () => {
    expect(bejamasTailwindCss).toBe(shadcnTailwindCss);
  });
});
