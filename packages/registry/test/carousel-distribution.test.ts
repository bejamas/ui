import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";
import { rewriteAstroIcons } from "../../bejamas/src/utils/icon-transform";
import { ICON_LIBRARY_COLLECTIONS } from "@bejamas/semantic-icons";

const repoRoot = path.resolve(import.meta.dir, "../../..");
type RegistryItem = {
  dependencies: string[];
  registryDependencies: string[];
  files: { path: string; content: string }[];
};

function readItem(relativePath: string): RegistryItem {
  return JSON.parse(readFileSync(path.resolve(repoRoot, relativePath), "utf8"));
}

describe("carousel distribution", () => {
  test("every style installs the runtime, Button dependency, and primitive slots", () => {
    const paths = [
      "apps/web/public/r/carousel.json",
      ...STYLES.map(
        (style) => `apps/web/public/r/styles/${style.id}/carousel.json`,
      ),
    ];
    for (const itemPath of paths) {
      const item = readItem(itemPath);
      expect(item.dependencies).toContain("@data-slot/carousel");
      expect(item.registryDependencies).toContain("button");
      const files = new Map(
        item.files.map((file) => [file.path, file.content]),
      );
      const carousel = files.get("ui/carousel/Carousel.astro")!;
      expect(carousel).toContain('from "./carousel"');
      expect(files.get("ui/carousel/carousel.ts")).toContain(
        'from "@data-slot/carousel"',
      );
      for (const slot of [
        "carousel",
        "carousel-content",
        "carousel-previous",
        "carousel-next",
      ]) {
        expect(carousel).toContain(`data-slot="${slot}"`);
      }
      expect(files.get("ui/carousel/CarouselSlide.astro")).toContain(
        'data-slot="carousel-item"',
      );
      const root = files.get("ui/carousel/CarouselRoot.astro")!;
      expect(root).toContain('data-slot="carousel"');
      expect(root).toContain('from "./carousel"');
      expect(root).not.toContain('data-slot="carousel-content"');
      expect(root).not.toContain("grid-cols-");
      const exports = files.get("ui/carousel/index.ts")!;
      for (const [part, slot] of [
        ["CarouselContent", "carousel-content"],
        ["CarouselPrevious", "carousel-previous"],
        ["CarouselNext", "carousel-next"],
      ]) {
        expect(exports).toContain(`default as ${part}`);
        expect(files.get(`ui/carousel/${part}.astro`)).toContain(
          `data-slot="${slot}"`,
        );
      }
      expect(exports).toContain("default as CarouselRoot");
      // Installer output must not retain source-workspace aliases.
      for (const file of item.files) {
        const runtime = file.content.replace(/\/\*[\s\S]*?\*\//g, "");
        expect(runtime).not.toContain("@bejamas/registry/");
        expect(runtime).not.toContain("@bejamas/ui/");
      }
      // The CLI removes SemanticIcon imports, so every icon must be rewritable.
      for (const library of Object.keys(ICON_LIBRARY_COLLECTIONS)) {
        const installed = rewriteAstroIcons(carousel, library);
        expect(installed).not.toContain("<SemanticIcon");
        expect(installed).not.toContain("SemanticIcon.astro");
        expect(installed.match(/<svg\b/g)).toHaveLength(2);
        for (const part of ["CarouselPrevious", "CarouselNext"]) {
          const installedPart = rewriteAstroIcons(
            files.get(`ui/carousel/${part}.astro`)!,
            library,
          );
          expect(installedPart).not.toContain("SemanticIcon");
          expect(installedPart.match(/<svg\b/g)).toHaveLength(1);
        }
      }
    }
  });

  test("docs and kitchen sink retain all four wireframe variants", () => {
    for (const file of [
      "apps/web/src/content/docs/components/carousel.mdx",
      "apps/web/src/pages/kitchen-sink/carousel.astro",
    ]) {
      const content = readFileSync(
        path.resolve(repoRoot, file),
        "utf8",
      ).toLowerCase();
      expect(content).toContain("header controls");
      expect(content).toContain("<carouselroot");
      expect(content).toContain("<carouselprevious");
      expect(content).toContain("<carouselnext");
      for (const orientation of ["horizontal", "vertical"]) {
        for (const variant of ["single", "multiple"]) {
          expect(content).toContain(`${orientation} ${variant}`);
        }
      }
    }
  });
});
