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
  test("renders beside Search as a deferred server component", () => {
    const source = fs.readFileSync(headerFile, "utf8");

    expect(source).toContain(
      'import HeaderPresetSwitcher from "@/components/starlight/HeaderPresetSwitcher.astro";',
    );
    expect(source).toContain("<Search />");
    expect(source).toContain("<HeaderPresetSwitcher server:defer>");
    expect(source).toContain('slot="fallback"');
    expect(source).toContain('import "@/scripts/header-preset-switcher.ts";');
    expect(source).toContain(
      'class="h-10 max-w-[11.75rem] min-w-0 justify-between gap-2 px-2.5 text-sm text-muted-foreground"',
    );
  });

  test("uses the curated dropdown contract and create CTA", () => {
    const source = fs.readFileSync(switcherFile, "utf8");
    const scriptSource = fs.readFileSync(scriptFile, "utf8");

    expect(source).toContain("data-header-preset-switcher");
    expect(source).toContain("data-current={JSON.stringify(state.current)}");
    expect(source).toContain("data-presets={JSON.stringify(state.presets)}");
    expect(source).toContain('class="header-preset-switcher-trigger');
    expect(source).toContain("max-w-[11.75rem]");
    expect(source).toContain("text-sm");
    expect(source).toContain("<DropdownMenuLabel>Presets</DropdownMenuLabel>");
    expect(source).toContain("value={preset.id}");
    expect(source).toContain("data-header-preset-id={preset.id}");
    expect(source).toContain("Create your own");
    expect(scriptSource).toContain(
      'this.addEventListener("dropdown-menu:select", this.onSelect)',
    );
    expect(scriptSource).toContain(
      'window.addEventListener("storage", this.onStorage)',
    );
    expect(scriptSource).toContain(
      'window.addEventListener("theme-toggle-changed", this.onThemeToggle)',
    );
    expect(scriptSource).toContain(
      "window.addEventListener(PRESET_CHANGE_EVENT, this.onPresetChange)",
    );
    expect(scriptSource).toContain(
      'document.addEventListener("astro:after-swap", this.onAfterSwap)',
    );
    expect(scriptSource).toContain("this.applyPresetToDocument(preset)");
  });
});
