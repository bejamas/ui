import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const read = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("hamburger menu distribution", () => {
  test("each style publishes a panel that hides when closed and stays within the viewport", () => {
    for (const style of STYLES) {
      const item = JSON.parse(
        read(`apps/web/public/r/styles/${style.id}/hamburger-menu.json`),
      ) as { files: { path: string; content: string }[] };
      const source = new Map(
        item.files.map((file) => [file.path, file.content]),
      );
      const menu = source.get("ui/hamburger-menu/HamburgerMenu.astro")!;
      const menuItem = source.get("ui/hamburger-menu/MenuItem.astro")!;
      const bar = source.get("ui/hamburger-menu/HamburgerMenuBar.astro")!;
      const panel = source.get("ui/hamburger-menu/HamburgerMenuPanel.astro")!;
      const group = source.get("ui/hamburger-menu/MenuGroup.astro")!;
      const section = source.get("ui/hamburger-menu/MenuSection.astro")!;
      const exports = source.get("ui/hamburger-menu/index.ts")!;

      expect(panel).toContain("--hamburger-menu-panel-height");
      expect(menu).not.toContain("data-variant");
      expect(menu).not.toContain("variant?:");
      expect(menu).not.toContain("isLegacy");
      expect(menu).toContain('panel.classList.toggle("hidden", !open)');
      expect(menu).toContain(
        'trigger.setAttribute("aria-expanded", String(open))',
      );
      expect(menu).toContain("closeOnFocusOutside?: boolean");
      expect(menu).toContain("data-close-on-focus-outside=");
      expect(menu).toContain('event.key !== "Escape"');
      expect(menu).toContain("<slot />");
      expect(bar).toContain('data-slot="hamburger-menu-bar"');
      expect(bar).toContain('data-slot="hamburger-menu-trigger"');
      expect(bar).toContain('aria-expanded={defaultOpen ? "true" : "false"}');
      expect(bar).toContain('name="trigger-open"');
      expect(bar).toContain('name="trigger-close"');
      expect(panel).toContain('data-slot="hamburger-menu-panel"');
      expect(panel).toContain("aria-label={label}");
      expect(panel).toContain('name="header"');
      expect(panel).toContain('name="footer"');
      expect(menuItem).not.toContain("py-1");
      expect(group).toContain('data-slot="hamburger-menu-group"');
      expect(section).toContain("aria-labelledby={headingId}");
      expect(exports).toContain("default as MenuItem");
      expect(exports).toContain("default as MenuGroup");
      expect(exports).toContain("default as MenuSection");
      expect(exports).toContain("default as HamburgerMenuLink");
      expect(exports).toContain("default as HamburgerMenuGroup");
      expect(exports).toContain("default as HamburgerMenuSection");
      expect(exports).toContain("default as HamburgerMenuBar");
      expect(exports).toContain("default as HamburgerMenuPanel");
    }
  });

  test("both examples include the wireframe states and local assets", () => {
    const kitchenSink = read(
      "apps/web/src/pages/kitchen-sink/hamburger-menu.astro",
    );
    const docs = read(
      "apps/web/src/content/docs/components/hamburger-menu.mdx",
    );
    const example = read("apps/web/src/components/HamburgerMenuExample.astro");

    for (const state of ["Closed", "Opened With Links", "Opened With Groups"]) {
      expect(kitchenSink).toContain(state);
      expect(docs).toContain(state);
    }
    expect(docs).toContain("<code>closeOnFocusOutside</code>");
    expect(docs).toContain("MenuSection");
    expect(docs).toContain("<HamburgerMenuBar>");
    expect(docs).toContain("<HamburgerMenuPanel>");
    expect(docs).not.toContain('<HamburgerMenuBar slot="bar">');
    expect(docs).not.toContain('<HamburgerMenuPanel slot="panel">');
    expect(kitchenSink).toContain("Customized Content");
    expect(kitchenSink).toContain("<HamburgerMenuBar");
    expect(kitchenSink).toContain("<HamburgerMenuPanel");
    expect(example).toContain("closeOnFocusOutside={closeOnFocusOutside}");
    expect(example).toContain("<HamburgerMenuBar");
    expect(example).toContain('slot="footer"');
    for (const asset of [
      "theme",
      "github-header",
      "social-x",
      "github-footer",
    ]) {
      expect(example).toContain(`/figma/hamburger-menu/${asset}.svg`);
      expect(
        statSync(
          path.join(
            repoRoot,
            `apps/web/public/figma/hamburger-menu/${asset}.svg`,
          ),
        ).size,
      ).toBeGreaterThan(0);
    }
  });
});
