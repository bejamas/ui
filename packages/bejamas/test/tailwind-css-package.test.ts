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
const bejamasPackageTailwindCss = readFileSync(
  path.resolve(repoRoot, "packages/bejamas/tailwind.css"),
  "utf8",
);
const shadcnTailwindCss = readFileSync(
  path.resolve(repoRoot, "tmp/shadcn-ui/packages/shadcn/src/tailwind.css"),
  "utf8",
);

describe("bejamas tailwind.css package asset", () => {
  test("exports the tailwind.css subpath", () => {
    expect(bejamasPackageJson).toContain('"./tailwind.css"');
    expect(bejamasPackageJson).toContain('"./tailwind.css": "./tailwind.css"');
    expect(bejamasPackageJson).toContain('"tailwind.css"');
    expect(bejamasPackageJson).toContain('"src/tailwind.css"');
  });

  test("publishes a root tailwind.css entrypoint", () => {
    expect(bejamasPackageTailwindCss.trim()).toBe('@import "./src/tailwind.css";');
  });

  test("preserves the vendored shadcn tailwind.css source and appends Bejamas additions", () => {
    expect(bejamasTailwindCss.startsWith(shadcnTailwindCss.trimEnd())).toBe(
      true,
    );
    expect(bejamasTailwindCss).toContain("@custom-variant slot-siblings");
  });
});
