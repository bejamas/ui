import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const registryRoot = path.resolve(repoRoot, "packages/registry");
const uiRoot = path.resolve(repoRoot, "packages/ui");

const registryNavigationMenuFile = path.resolve(
  registryRoot,
  "src/ui/navigation-menu/NavigationMenu.astro",
);
const registryNavigationMenuListFile = path.resolve(
  registryRoot,
  "src/ui/navigation-menu/NavigationMenuList.astro",
);
const registryNavigationMenuTriggerFile = path.resolve(
  registryRoot,
  "src/ui/navigation-menu/NavigationMenuTrigger.astro",
);
const registryNavigationMenuIndicatorFile = path.resolve(
  registryRoot,
  "src/ui/navigation-menu/NavigationMenuIndicator.astro",
);

const uiNavigationMenuFile = path.resolve(
  uiRoot,
  "src/components/navigation-menu/NavigationMenu.astro",
);
const uiNavigationMenuIndicatorFile = path.resolve(
  uiRoot,
  "src/components/navigation-menu/NavigationMenuIndicator.astro",
);

const rawRegistryFile = path.resolve(repoRoot, "apps/web/public/r/navigation-menu.json");
const styleRegistryFile = path.resolve(
  repoRoot,
  "apps/web/public/r/styles/bejamas-juno/navigation-menu.json",
);

type RegistryItem = {
  files?: Array<{
    path?: string;
    content?: string;
  }>;
};

function getRegistryContent(registryPath: string, pathname: string) {
  const source = fs.readFileSync(registryPath, "utf8");
  const item = JSON.parse(source) as RegistryItem;
  const file = item.files?.find((entry) => entry.path === pathname);

  expect(file?.content).toBeString();

  return file?.content ?? "";
}

describe("navigation-menu compatibility contract", () => {
  test("registry source keeps the shadcn-compatible structure and controller-driven indicator hooks", () => {
    const root = fs.readFileSync(registryNavigationMenuFile, "utf8");
    const list = fs.readFileSync(registryNavigationMenuListFile, "utf8");
    const trigger = fs.readFileSync(registryNavigationMenuTriggerFile, "utf8");
    const indicator = fs.readFileSync(registryNavigationMenuIndicatorFile, "utf8");

    expect(root).toContain(
      "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
    );
    expect(root).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface,',
    );
    expect(root).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface:hover',
    );
    expect(root).toContain(
      '.navigation-menu-trigger-surface[data-open]:not([data-open="false"])',
    );
    expect(root).toContain(
      '.navigation-menu-trigger-surface[data-popup-open]:not([data-popup-open="false"])',
    );
    expect(root).toContain("background-color: transparent;");
    expect(root).not.toContain(':has( class="cn-navigation-menu-indicator');

    expect(list).toContain(
      "group flex flex-1 list-none items-center justify-center relative",
    );

    expect(trigger).toContain("navigation-menu-trigger-surface");
    expect(trigger).toContain("relative z-1");

    expect(indicator).toContain('data-slot="navigation-menu-indicator"');
    expect(indicator).toContain("cn-navigation-menu-indicator-surface");
    expect(indicator).toContain("cn-navigation-menu-indicator-arrow");
    expect(indicator).toContain("translate-x-(--indicator-left,0px)");
    expect(indicator).toContain("translate-y-(--indicator-top,0px)");
    expect(indicator).toContain("w-(--indicator-width,0)");
    expect(indicator).toContain("h-(--indicator-height,0)");
    expect(indicator).not.toContain("bg-muted/50");
  });

  test("ui source keeps the subtle surface indicator defaults inline", () => {
    const root = fs.readFileSync(uiNavigationMenuFile, "utf8");
    const indicator = fs.readFileSync(uiNavigationMenuIndicatorFile, "utf8");

    expect(root).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface,',
    );
    expect(root).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface:hover',
    );
    expect(root).toContain(
      '.navigation-menu-trigger-surface[data-open]:not([data-open="false"])',
    );
    expect(root).toContain(
      '.navigation-menu-trigger-surface[data-popup-open]:not([data-popup-open="false"])',
    );
    expect(root).toContain("background-color: transparent;");
    expect(root).not.toContain(':has( class="cn-navigation-menu-indicator');

    expect(indicator).toContain("cn-navigation-menu-indicator-surface");
    expect(indicator).toContain("bg-muted/45");
    expect(indicator).toContain("ring-1 ring-border/40");
    expect(indicator).toContain("cn-navigation-menu-indicator-arrow");
    expect(indicator).toContain("opacity-0");
  });

  test("published raw and themed registry payloads stay aligned with the indicator contract", () => {
    const rawRoot = getRegistryContent(
      rawRegistryFile,
      "ui/navigation-menu/NavigationMenu.astro",
    );
    const rawIndicator = getRegistryContent(
      rawRegistryFile,
      "ui/navigation-menu/NavigationMenuIndicator.astro",
    );

    const styleRoot = getRegistryContent(
      styleRegistryFile,
      "ui/navigation-menu/NavigationMenu.astro",
    );
    const styleList = getRegistryContent(
      styleRegistryFile,
      "ui/navigation-menu/NavigationMenuList.astro",
    );
    const styleIndicator = getRegistryContent(
      styleRegistryFile,
      "ui/navigation-menu/NavigationMenuIndicator.astro",
    );

    expect(rawRoot).not.toContain(':has( class="cn-navigation-menu-indicator');
    expect(rawRoot).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface,',
    );
    expect(rawRoot).toContain(
      '.navigation-menu-trigger-surface[data-popup-open]:not([data-popup-open="false"])',
    );
    expect(rawIndicator).toContain("cn-navigation-menu-indicator-surface");
    expect(rawIndicator).toContain("bg-muted/45");
    expect(rawIndicator).toContain("translate-x-(--indicator-left,0px)");

    expect(styleRoot).not.toContain(':has( class="cn-navigation-menu-indicator');
    expect(styleRoot).toContain(
      '[data-slot="navigation-menu-list"]:has(> [data-slot="navigation-menu-indicator"]) .navigation-menu-trigger-surface,',
    );
    expect(styleRoot).toContain(
      '.navigation-menu-trigger-surface[data-popup-open]:not([data-popup-open="false"])',
    );
    expect(styleList).toContain("relative");
    expect(styleIndicator).toContain("translate-x-(--indicator-left,0px)");
    expect(styleIndicator).toContain("bg-muted/60 ring-border/40 ring-1");
    expect(styleIndicator).toContain("hidden bg-border");
    expect(styleIndicator).not.toContain("cn-navigation-menu-indicator-surface");
  });
});
