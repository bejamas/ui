import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const sourceFile = path.resolve(import.meta.dir, "./ThemeEditorPanel.astro");

describe("theme editor theme choice runtime", () => {
  test("delegates global theme changes to the shared setter", () => {
    const source = fs.readFileSync(sourceFile, "utf8");

    expect(source).toContain('import { setThemeChoice } from "starlight-theme-bejamas/lib/theme-choice";');
    expect(source).toContain("setThemeChoice(mode);");
    expect(source).not.toContain('localStorage.setItem("starlight-theme", mode);');
    expect(source).not.toContain("document.documentElement.dataset.themeChoice = mode;");
    expect(source).not.toContain("'starlight-theme-select [data-slot=\"tabs\"]'");
  });
});

