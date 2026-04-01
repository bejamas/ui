import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const gitHubLinkFile = path.resolve(import.meta.dir, "./GitHubLink.astro");
const presetSwitcherIslandFile = path.resolve(
  import.meta.dir,
  "./PresetSwitcherIsland.astro",
);
const presetSwitcherTriggerIslandFile = path.resolve(
  import.meta.dir,
  "./PresetSwitcherTriggerIsland.astro",
);

describe("server island cache headers", () => {
  test("caches the public GitHub stars island and keeps cookie-driven islands private", () => {
    const gitHubLinkSource = fs.readFileSync(gitHubLinkFile, "utf8");
    const presetSwitcherIslandSource = fs.readFileSync(
      presetSwitcherIslandFile,
      "utf8",
    );
    const presetSwitcherTriggerIslandSource = fs.readFileSync(
      presetSwitcherTriggerIslandFile,
      "utf8",
    );

    expect(gitHubLinkSource).toContain('NO_STORE_CACHE_CONTROL');
    expect(gitHubLinkSource).toContain('SHARED_DYNAMIC_CACHE_CONTROL');
    expect(gitHubLinkSource).toContain(
      'Astro.response.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);',
    );
    expect(gitHubLinkSource).toContain(
      'Astro.response.headers.set(',
    );
    expect(gitHubLinkSource).toContain(
      '"Cache-Control",\n      SHARED_DYNAMIC_CACHE_CONTROL,',
    );

    for (const source of [
      presetSwitcherIslandSource,
      presetSwitcherTriggerIslandSource,
    ]) {
      expect(source).toContain("PRIVATE_NO_STORE_CACHE_CONTROL");
      expect(source).toContain(
        'Astro.response.headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL);',
      );
      expect(source).toContain('Astro.response.headers.append("Vary", "Cookie");');
    }
  });
});
