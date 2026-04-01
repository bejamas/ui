import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const registryRoot = path.resolve(repoRoot, "packages/registry/src/ui");

type RegistryItem = {
  files?: Array<{
    path?: string;
    content?: string;
  }>;
};

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(registryRoot, relativePath), "utf8");
}

function getRegistryContent(relativeJsonPath: string, pathname: string) {
  const source = fs.readFileSync(
    path.resolve(repoRoot, relativeJsonPath),
    "utf8",
  );
  const item = JSON.parse(source) as RegistryItem;
  const file = item.files?.find((entry) => entry.path === pathname);

  expect(file?.content).toBeString();
  return file?.content ?? "";
}

describe("menu surface hooks", () => {
  test("registry source matches the upstream menu surface hook contract", () => {
    const dropdown = readSource("dropdown-menu/DropdownMenuContent.astro");
    const select = readSource("select/SelectContent.astro");
    const combobox = readSource("combobox/ComboboxContent.astro");
    const popover = readSource("popover/PopoverContent.astro");
    const navigationMenu = readSource("navigation-menu/NavigationMenuContent.astro");
    const hoverCard = readSource("hover-card/HoverCardContent.astro");

    expect(dropdown).toContain("cn-menu-target");
    expect(dropdown).toContain("cn-menu-translucent");
    expect(select).toContain("cn-menu-target");
    expect(select).toContain("cn-menu-translucent");
    expect(combobox).toContain("cn-menu-target");
    expect(combobox).toContain("cn-menu-translucent");
    expect(popover).not.toContain("cn-menu-target");
    expect(navigationMenu).not.toContain("cn-menu-target");
    expect(hoverCard).not.toContain("cn-menu-target");
  });

  test("style registry payload preserves the upstream menu surface hook contract", () => {
    const dropdown = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/dropdown-menu.json",
      "ui/dropdown-menu/DropdownMenuContent.astro",
    );
    const select = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/select.json",
      "ui/select/SelectContent.astro",
    );
    const combobox = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/combobox.json",
      "ui/combobox/ComboboxContent.astro",
    );
    const popover = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/popover.json",
      "ui/popover/PopoverContent.astro",
    );
    const navigationMenu = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/navigation-menu.json",
      "ui/navigation-menu/NavigationMenuContent.astro",
    );
    const hoverCard = getRegistryContent(
      "apps/web/public/r/styles/bejamas-juno/hover-card.json",
      "ui/hover-card/HoverCardContent.astro",
    );

    expect(dropdown).toContain("cn-menu-target");
    expect(dropdown).toContain("cn-menu-translucent");
    expect(select).toContain("cn-menu-target");
    expect(select).toContain("cn-menu-translucent");
    expect(combobox).toContain("cn-menu-target");
    expect(combobox).toContain("cn-menu-translucent");
    expect(popover).not.toContain("cn-menu-target");
    expect(navigationMenu).not.toContain("cn-menu-target");
    expect(hoverCard).not.toContain("cn-menu-target");
  });

  test("published registry payload preserves the upstream menu surface hook contract", () => {
    const dropdown = getRegistryContent(
      "apps/web/public/r/dropdown-menu.json",
      "../../packages/ui/src/components/dropdown-menu/DropdownMenuContent.astro",
    );
    const select = getRegistryContent(
      "apps/web/public/r/select.json",
      "../../packages/ui/src/components/select/SelectContent.astro",
    );
    const combobox = getRegistryContent(
      "apps/web/public/r/combobox.json",
      "../../packages/ui/src/components/combobox/ComboboxContent.astro",
    );
    const popover = getRegistryContent(
      "apps/web/public/r/popover.json",
      "../../packages/ui/src/components/popover/PopoverContent.astro",
    );
    const navigationMenu = getRegistryContent(
      "apps/web/public/r/navigation-menu.json",
      "../../packages/ui/src/components/navigation-menu/NavigationMenuContent.astro",
    );
    const hoverCard = getRegistryContent(
      "apps/web/public/r/hover-card.json",
      "../../packages/ui/src/components/hover-card/HoverCardContent.astro",
    );

    expect(dropdown).toContain("cn-menu-target");
    expect(dropdown).toContain("cn-menu-translucent");
    expect(select).toContain("cn-menu-target");
    expect(select).toContain("cn-menu-translucent");
    expect(combobox).toContain("cn-menu-target");
    expect(combobox).toContain("cn-menu-translucent");
    expect(popover).not.toContain("cn-menu-target");
    expect(navigationMenu).not.toContain("cn-menu-target");
    expect(hoverCard).not.toContain("cn-menu-target");
  });
});
