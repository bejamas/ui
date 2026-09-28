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
      const group = source.get("ui/hamburger-menu/MenuGroup.astro")!;
      const exports = source.get("ui/hamburger-menu/index.ts")!;

      expect(menu).toContain("--hamburger-menu-panel-height");
      expect(menu).toContain('!defaultOpen && "hidden"');
      expect(menu).toContain('panel.classList.toggle("hidden", !open)');
      expect(menu).toContain(
        'trigger.setAttribute("aria-expanded", String(open))',
      );
      expect(menu).toContain('if (event.key === "Escape" && !panel.hidden)');
      expect(menuItem).not.toContain("py-1");
      expect(group).toContain('data-slot="hamburger-menu-group"');
      expect(exports).toContain('default as MenuItem');
      expect(exports).toContain('default as MenuGroup');
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
