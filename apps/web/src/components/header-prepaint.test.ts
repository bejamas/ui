import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const switcherFile = path.resolve(
  import.meta.dir,
  "./starlight/HeaderPresetSwitcher.astro",
);
const gitHubStarsButtonFile = path.resolve(
  import.meta.dir,
  "./GitHubStarsButton.astro",
);
const gitHubLinkFile = path.resolve(import.meta.dir, "./GitHubLink.astro");

describe("header prepaint bootstrap", () => {
  test("patches the header preset switcher from cookie or localStorage before runtime boot", () => {
    const source = fs.readFileSync(switcherFile, "utf8");

    expect(source).toContain("<script is:inline>");
    expect(source).toContain('const root = script?.previousElementSibling;');
    expect(source).toContain('const themeCookie = readCookie("theme");');
    expect(source).toContain('const presetId = localStorage.getItem("theme-preset");');
    expect(source).toContain('const themeRef = readCookie("theme-ref");');
    expect(source).toContain("root.dataset.current = JSON.stringify(summary);");
    expect(source).toContain("root.dataset.selectedPresetId = selectedPresetId;");
    expect(source).toContain('createLink.href = summary.createHref;');
  });

  test("reuses a cached GitHub count until the server island response arrives", () => {
    const buttonSource = fs.readFileSync(gitHubStarsButtonFile, "utf8");
    const linkSource = fs.readFileSync(gitHubLinkFile, "utf8");

    expect(buttonSource).toContain("data-github-stars-button");
    expect(buttonSource).toContain('const STORAGE_KEY = "bejamas:github-stars";');
    expect(buttonSource).toContain("const observer = new MutationObserver(() => {");
    expect(buttonSource).toContain(
      'button\n        .querySelector("[data-github-stars-value]")',
    );
    expect(buttonSource).toContain('display.textContent = cachedValue;');
    expect(linkSource).toContain("data-github-stars-display");
    expect(linkSource).toContain(
      'data-github-stars-value={starCount !== null ? String(starCount) : undefined}',
    );
  });
});
