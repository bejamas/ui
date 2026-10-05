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
      ) as {
        dependencies?: string[];
        files: { path: string; content: string }[];
      };
      const source = new Map(
        item.files.map((file) => [file.path, file.content]),
      );
      const menu = source.get("ui/hamburger-menu/HamburgerMenu.astro")!;
      const menuItem = source.get("ui/hamburger-menu/HamburgerMenuItem.astro")!;
      const group = source.get("ui/hamburger-menu/HamburgerMenuGroup.astro")!;
      const exports = source.get("ui/hamburger-menu/index.ts")!;

      expect(item.dependencies).toEqual(["@data-slot/collapsible@^1.1.1"]);
      expect(menu).toContain(
        'import { createCollapsible } from "@data-slot/collapsible"',
      );
      expect(menu).toContain('data-slot="collapsible-trigger"');
      expect(menu).toContain('data-slot="collapsible-content"');
      expect(menu).toContain("hidden={!defaultOpen}");
      expect(menu).toContain("--hamburger-menu-panel-height");
      expect(menu).toContain("data-close-on-escape");
      expect(menu).toContain("data-close-on-click-outside");
      expect(menu).toContain("closeOnOutsideClick?: boolean");
      expect(menu).toContain("triggerLabel?: string");
      expect(menu).toContain("<nav");
      expect(menuItem).toContain('data-slot="hamburger-menu-link"');
      expect(group).toContain('data-slot="hamburger-menu-group"');
      expect(exports).toContain("default as HamburgerMenuItem");
      expect(exports).toContain("default as HamburgerMenuGroup");
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

    for (const state of ["Closed", "Opened Simple", "Opened Advanced"]) {
      expect(kitchenSink).toContain(state);
      expect(docs).toContain(state);
    }
    expect(example).toContain('slot="actions"');
    expect(example).toContain('slot="footer"');
    for (const source of [example, docs]) {
      expect(source).toContain('size="icon"');
      expect(source).toContain('aria-label="Toggle theme"');
      expect(source).toContain('<SemanticIcon name="sun" />');
    }
    for (const asset of [
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
