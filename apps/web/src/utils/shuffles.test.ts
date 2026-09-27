import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { formatShuffleCount } from "./shuffles";

const shufflesFile = path.resolve(import.meta.dir, "./shuffles.ts");
const apiRouteFile = path.resolve(import.meta.dir, "../pages/api/shuffles.ts");
const presetApplyFile = path.resolve(
  import.meta.dir,
  "./themes/apply-docs-preset.ts",
);

describe("shuffle utilities", () => {
  test("formats counts with locale separators", () => {
    expect(formatShuffleCount(0)).toBe("0");
    expect(formatShuffleCount(12345)).toBe("12,345");
  });

  test("posts shuffle increments to the dedicated API route", () => {
    const source = fs.readFileSync(shufflesFile, "utf8");

    expect(source).toContain('fetch("/api/shuffles"');
    expect(source).toContain("keepalive: true");
  });

  test("updates the document theme when applying docs presets", () => {
    const source = fs.readFileSync(presetApplyFile, "utf8");

    expect(source).toContain("style[data-docs-preset-theme]");
    expect(source).toContain("stylesheet.textContent = css;");
    expect(source).toContain("document.head.appendChild(stylesheet);");
    expect(source).toContain("setStoredPreset(");
    expect(source).toContain(
      "applyThemeToDocument(options.id, options.styles);",
    );
  });

  test("increments the Redis-backed counter through the API route", () => {
    const source = fs.readFileSync(apiRouteFile, "utf8");

    expect(source).toContain(
      'import { getShuffleCount, incrementShuffleCount } from "../../lib/redis";',
    );
    expect(source).toContain("export const GET: APIRoute = async () => {");
    expect(source).toContain("const count = await getShuffleCount();");
    expect(source).toContain('"Cache-Control": SHORT_SHARED_CACHE_CONTROL');
    expect(source).toContain("export const POST: APIRoute = async () => {");
    expect(source).toContain("const count = await incrementShuffleCount();");
    expect(source).toContain('"Cache-Control": NO_STORE_CACHE_CONTROL');
    expect(source).toContain("JSON.stringify({ count })");
  });
});
