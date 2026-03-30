import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const headerFile = path.resolve(import.meta.dir, "./Header.astro");
const switcherFile = path.resolve(
  import.meta.dir,
  "./HeaderPresetSwitcher.astro",
);
const scriptFile = path.resolve(
  import.meta.dir,
  "../../scripts/header-preset-switcher.ts",
);

describe("header preset switcher", () => {
  test("renders beside Search without a deferred server island", () => {
    const source = fs.readFileSync(headerFile, "utf8");

    expect(source).toContain(
      'import HeaderPresetSwitcher from "@/components/starlight/HeaderPresetSwitcher.astro";',
    );
    expect(source).toContain("<Search />");
    expect(source).toContain("<HeaderPresetSwitcher />");
    expect(source).not.toContain("server:defer");
    expect(source).toContain('import "@/scripts/header-preset-switcher.ts";');
    expect(source).toContain('<div class="header-mobile-stars">');
    expect(source).not.toContain("transition:persist");
  });

  test("uses the curated dropdown contract and static fallback state", () => {
    const source = fs.readFileSync(switcherFile, "utf8");
    const scriptSource = fs.readFileSync(scriptFile, "utf8");

    expect(source).toContain(
      'import { buildHeaderPresetSwitcherState } from "@/utils/themes/header-preset-switcher";',
    );
    expect(source).toContain(
      "const state = buildHeaderPresetSwitcherState({});",
    );
    expect(source).not.toContain("Astro.cookies");
    expect(source).toContain("data-header-preset-switcher");
    expect(source).toContain("data-current={JSON.stringify(state.current)}");
    expect(source).toContain("data-presets={JSON.stringify(state.presets)}");
    expect(source).toContain('class="header-preset-switcher-trigger');
    expect(source).toContain("max-w-[11.75rem]");
    expect(source).toContain("text-sm");
    expect(source).toContain("<DropdownMenuLabel>Presets</DropdownMenuLabel>");
    expect(source).toContain("value={preset.id}");
    expect(source).toContain("data-header-preset-id={preset.id}");
    expect(source).toContain("<DropdownMenuRadioItem");
    expect(source).toContain("Create your own");
    expect(scriptSource).toContain(
      'this.addEventListener("dropdown-menu:value-change", this.onValueChange)',
    );
    expect(scriptSource).toContain('new CustomEvent("dropdown-menu:set", {');
    expect(scriptSource).not.toContain("data-selected");
    expect(scriptSource).toContain(
      'window.addEventListener("storage", this.onStorage)',
    );
    expect(scriptSource).toContain(
      "window.addEventListener(PRESET_CHANGE_EVENT, this.onPresetChange)",
    );
    expect(scriptSource).toContain(
      'document.addEventListener("astro:after-swap", this.onAfterSwap)',
    );
    expect(scriptSource).toContain(
      'import { applyDocsPreset } from "@/utils/themes/apply-docs-preset";',
    );
    expect(scriptSource).toContain(
      'import { getCustomPresets } from "@/utils/themes/custom-presets-store";',
    );
    expect(scriptSource).toContain("resolveHeaderPresetSelection({");
    expect(scriptSource).toContain("applyDocsPreset({");
    expect(scriptSource).not.toContain("window.history.pushState");
    expect(scriptSource).not.toContain("window.location.assign");
  });
});
