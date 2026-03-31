import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const registryRoot = path.resolve(repoRoot, "packages/registry");
const shadcnRoot = path.resolve(repoRoot, "packages/registry/upstream/shadcn");

function readRegistry(...segments: string[]) {
  return fs.readFileSync(path.resolve(registryRoot, ...segments), "utf8");
}

function readShadcn(...segments: string[]) {
  return fs.readFileSync(path.resolve(shadcnRoot, ...segments), "utf8");
}

function extractNavigationMenuBlock(source: string) {
  const match = source.match(
    /\/\* MARK: Navigation Menu \*\/[\s\S]*?(?=\n\s*\/\* MARK:|\s*$)/,
  );

  expect(match?.[0]).toBeString();

  return match?.[0].trim() ?? "";
}

function stripIndicatorExtensionRules(source: string) {
  return source
    .replace(/\n\s*\.cn-navigation-menu-indicator\s*\{[\s\S]*?\n\s*\}\n/g, "\n")
    .replace(
      /\n\s*\.cn-navigation-menu-indicator-surface\s*\{[\s\S]*?\n\s*\}\n/g,
      "\n",
    )
    .replace(
      /\n\s*\.cn-navigation-menu-indicator-arrow\s*\{[\s\S]*?\n\s*\}\n/g,
      "\n",
    )
    .replace(
      /\n\s*\[data-slot="navigation-menu-list"\]:has\(> \[data-slot="navigation-menu-indicator"\]\) \.cn-navigation-menu-trigger\s*\{[\s\S]*?\n\s*\}\n/g,
      "\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

describe("navigation-menu registry parity", () => {
  test("registry source mirrors the base-ui structure without local compatibility shims", () => {
    const root = readRegistry("src/ui/navigation-menu/NavigationMenu.astro");
    const list = readRegistry(
      "src/ui/navigation-menu/NavigationMenuList.astro",
    );
    const trigger = readRegistry(
      "src/ui/navigation-menu/NavigationMenuTrigger.astro",
    );
    const content = readRegistry(
      "src/ui/navigation-menu/NavigationMenuContent.astro",
    );
    const positioner = readRegistry(
      "src/ui/navigation-menu/NavigationMenuPositioner.astro",
    );
    const viewport = readRegistry(
      "src/ui/navigation-menu/NavigationMenuViewport.astro",
    );
    const indicator = readRegistry(
      "src/ui/navigation-menu/NavigationMenuIndicator.astro",
    );

    expect(root).toContain(
      'import NavigationMenuPositioner from "./NavigationMenuPositioner.astro";',
    );
    expect(root).toContain('align?: "start" | "center" | "end";');
    expect(root).toContain(
      "{viewport && <NavigationMenuPositioner align={align} />}",
    );
    expect(root).toContain("createNavigationMenu(el);");
    expect(root).not.toContain("syncNavigationMenuTriggerBooleans");
    expect(root).not.toContain("bindNavigationMenuTriggerCompatibility");
    expect(root).not.toContain("<style is:global>");

    expect(list).toContain(
      'class={cn(\n    "cn-navigation-menu-list group flex flex-1 list-none items-center justify-center relative",',
    );
    expect(list).toContain("relative");

    expect(trigger).toContain(
      '  "cn-navigation-menu-trigger group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center outline-none disabled:pointer-events-none",',
    );
    expect(trigger).not.toContain("navigation-menu-trigger-surface");
    expect(trigger).not.toContain("relative z-1");

    expect(content).toContain(
      "cn-navigation-menu-content data-[ending-style]:data-[activation-direction=left]:translate-x-[50%]",
    );
    expect(content).toContain("data-align={align}");
    expect(content).toContain("data-side-offset={sideOffset}");
    expect(content).not.toContain("absolute");
    expect(content).not.toContain("data-[motion=");

    expect(positioner).toContain('data-slot="navigation-menu-portal"');
    expect(positioner).toContain('data-slot="navigation-menu-positioner"');
    expect(positioner).toContain('data-slot="navigation-menu-popup"');
    expect(positioner).toContain("data-side={side}");
    expect(positioner).toContain("data-align={align}");
    expect(positioner).toContain(
      "cn-navigation-menu-positioner isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-[0.35s] data-instant:transition-none",
    );
    expect(positioner).toContain(
      'class="cn-navigation-menu-popup data-[ending-style]:easing-[ease] xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) transition-[opacity,transform,width,height,scale,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)]"',
    );
    expect(positioner).not.toContain("popupClass");
    expect(positioner).not.toContain("viewportClass");

    expect(viewport).toContain(
      'class={cn(\n    "cn-navigation-menu-viewport relative size-full overflow-hidden",',
    );
    expect(viewport).not.toContain("navigation-menu-viewport-positioner");

    expect(indicator).toContain(
      '"cn-navigation-menu-indicator absolute left-0 top-0 z-0 pointer-events-none opacity-0 transition-[translate,width,height,opacity] duration-150 ease data-instant:transition-none data-[state=visible]:opacity-100"',
    );
    expect(indicator).toContain("cn-navigation-menu-indicator-surface");
    expect(indicator).toContain("cn-navigation-menu-indicator-arrow");
    expect(indicator).toContain("translate-x-(--indicator-left,0px)");
    expect(indicator).toContain("translate-y-(--indicator-top,0px)");
    expect(indicator).toContain("w-(--indicator-width,0)");
    expect(indicator).toContain("h-(--indicator-height,0)");
  });

  test("shared registry themes keep the shadcn base selectors after stripping local indicator extensions", () => {
    const themes = ["luma", "lyra", "maia", "mira", "nova", "vega"] as const;

    for (const theme of themes) {
      const registryBlock = extractNavigationMenuBlock(
        readRegistry("src/styles", `style-${theme}.css`),
      );
      const shadcnBlock = extractNavigationMenuBlock(
        readShadcn("styles", `style-${theme}.css`),
      );

      expect(stripIndicatorExtensionRules(registryBlock)).toBe(
        stripIndicatorExtensionRules(shadcnBlock),
      );
    }
  });

  test("theme blocks include the additive subtle indicator extension", () => {
    const themes = ["juno", "luma", "lyra", "maia", "mira", "nova", "vega"] as const;

    for (const theme of themes) {
      const block = extractNavigationMenuBlock(
        readRegistry("src/styles", `style-${theme}.css`),
      );

      expect(block).toContain(".cn-navigation-menu-indicator-surface");
      expect(block).toContain("bg-muted/60 ring-border/40 ring-1");
      expect(block).toContain("hidden bg-border");
      expect(block).toContain('[data-slot="navigation-menu-list"]');
      expect(block).toContain('[data-slot="navigation-menu-indicator"]');
      expect(block).toContain(".cn-navigation-menu-trigger");
      expect(block).toContain(
        "bg-transparent hover:bg-transparent focus:bg-transparent",
      );
      expect(block).toContain("relative z-1");
    }
  });

  test("juno uses the same selector ownership as the shadcn themes", () => {
    const block = extractNavigationMenuBlock(
      readRegistry("src/styles/style-juno.css"),
    );

    expect(block).toContain(".cn-navigation-menu-content");
    expect(block).toContain("data-[motion=from-start]:slide-in-from-left-52");
    expect(block).toContain(".cn-navigation-menu-viewport");
    expect(block).toContain("bg-popover text-popover-foreground");
    expect(block).toContain("data-open:animate-in");
    expect(block).toContain(".cn-navigation-menu-popup");
    expect(block).toContain("data-ending-style:scale-90");
    expect(block).toContain(".cn-navigation-menu-indicator-surface");
    expect(block).toContain("rounded-md data-[state=visible]");
    expect(block).not.toContain("relative size-full overflow-hidden");
  });
});
