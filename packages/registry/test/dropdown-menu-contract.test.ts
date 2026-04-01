import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const packageRoot = path.resolve(repoRoot, "packages/registry");
const rootFile = path.resolve(packageRoot, "src/ui/dropdown-menu/DropdownMenu.astro");
const indexFile = path.resolve(packageRoot, "src/ui/dropdown-menu/index.ts");
const portalFile = path.resolve(
  packageRoot,
  "src/ui/dropdown-menu/DropdownMenuPortal.astro",
);
const radioGroupFile = path.resolve(
  packageRoot,
  "src/ui/dropdown-menu/DropdownMenuRadioGroup.astro",
);
const itemFile = path.resolve(packageRoot, "src/ui/dropdown-menu/DropdownMenuItem.astro");
const radioItemFile = path.resolve(
  packageRoot,
  "src/ui/dropdown-menu/DropdownMenuRadioItem.astro",
);
const checkboxItemFile = path.resolve(
  packageRoot,
  "src/ui/dropdown-menu/DropdownMenuCheckboxItem.astro",
);
const styleRegistryFile = path.resolve(
  repoRoot,
  "apps/web/public/r/styles/bejamas-juno/dropdown-menu.json",
);

type RegistryItem = {
  files?: Array<{
    path?: string;
    content?: string;
  }>;
};

function getRegistryContent(pathname: string) {
  const source = fs.readFileSync(styleRegistryFile, "utf8");
  const item = JSON.parse(source) as RegistryItem;
  const file = item.files?.find((entry) => entry.path === pathname);

  expect(file?.content).toBeString();

  return file?.content ?? "";
}

describe("dropdown-menu compatibility contract", () => {
  test("registry source exposes the runtime-owned selection surface", () => {
    const rootSource = fs.readFileSync(rootFile, "utf8");
    const indexSource = fs.readFileSync(indexFile, "utf8");
    const portalSource = fs.readFileSync(portalFile, "utf8");
    const radioGroupSource = fs.readFileSync(radioGroupFile, "utf8");
    const itemSource = fs.readFileSync(itemFile, "utf8");
    const radioItemSource = fs.readFileSync(radioItemFile, "utf8");
    const checkboxItemSource = fs.readFileSync(checkboxItemFile, "utf8");

    expect(rootSource).toContain("defaultValue?: string | null");
    expect(rootSource).toContain("defaultValues?: string[]");
    expect(rootSource).toContain("closeOnSelect?: boolean");
    expect(rootSource).toContain('data-default-value={defaultValue ?? undefined}');
    expect(rootSource).toContain("data-default-values={defaultValuesJson}");
    expect(rootSource).toContain('data-close-on-select={');
    expect(rootSource).toContain("dropdown-menu:open-change");
    expect(rootSource).toContain("dropdown-menu:value-change");
    expect(rootSource).toContain("dropdown-menu:values-change");
    expect(rootSource).toContain("DropdownMenuPortal");
    expect(rootSource).toContain("DropdownMenuRadioGroup");
    expect(rootSource).toContain("data-variant");

    expect(indexSource).toContain(
      'export { default as DropdownMenuPortal } from "./DropdownMenuPortal.astro";',
    );
    expect(indexSource).toContain(
      'export { default as DropdownMenuRadioGroup } from "./DropdownMenuRadioGroup.astro";',
    );
    expect(indexSource).toContain(
      'export { default as DropdownMenuRadioItem } from "./DropdownMenuRadioItem.astro";',
    );
    expect(indexSource).toContain(
      'export { default as DropdownMenuCheckboxItem } from "./DropdownMenuCheckboxItem.astro";',
    );

    expect(portalSource).toContain('data-slot="dropdown-menu-portal"');
    expect(radioGroupSource).toContain('data-slot="dropdown-menu-radio-group"');
    expect(itemSource).toContain('variant?: "default" | "destructive"');
    expect(itemSource).toContain("data-variant={variant}");
    expect(radioItemSource).toContain('data-slot="dropdown-menu-radio-item"');
    expect(radioItemSource).toContain("defaultChecked?: boolean");
    expect(radioItemSource).toContain('data-default-checked={defaultChecked ? "" : undefined}');
    expect(radioItemSource).toContain(
      'data-slot="dropdown-menu-radio-item-indicator"',
    );

    expect(checkboxItemSource).toContain(
      'data-slot="dropdown-menu-checkbox-item"',
    );
    expect(checkboxItemSource).toContain("defaultChecked?: boolean");
    expect(checkboxItemSource).toContain(
      'data-default-checked={defaultChecked ? "" : undefined}',
    );
    expect(checkboxItemSource).toContain(
      'data-slot="dropdown-menu-checkbox-item-indicator"',
    );
  });

  test("style registry payload stays aligned with the dropdown selection contract", () => {
    const registryRoot = getRegistryContent("ui/dropdown-menu/DropdownMenu.astro");
    const registryIndex = getRegistryContent("ui/dropdown-menu/index.ts");
    const registryPortal = getRegistryContent(
      "ui/dropdown-menu/DropdownMenuPortal.astro",
    );
    const registryRadioGroup = getRegistryContent(
      "ui/dropdown-menu/DropdownMenuRadioGroup.astro",
    );
    const registryItem = getRegistryContent("ui/dropdown-menu/DropdownMenuItem.astro");
    const registryRadioItem = getRegistryContent(
      "ui/dropdown-menu/DropdownMenuRadioItem.astro",
    );
    const registryCheckboxItem = getRegistryContent(
      "ui/dropdown-menu/DropdownMenuCheckboxItem.astro",
    );

    expect(registryRoot).toContain('data-default-value={defaultValue ?? undefined}');
    expect(registryRoot).toContain("data-default-values={defaultValuesJson}");
    expect(registryRoot).toContain("dropdown-menu:value-change");
    expect(registryRoot).toContain("DropdownMenuPortal");
    expect(registryRoot).toContain("DropdownMenuRadioGroup");
    expect(registryIndex).toContain("DropdownMenuPortal");
    expect(registryIndex).toContain("DropdownMenuRadioGroup");
    expect(registryPortal).toContain('data-slot="dropdown-menu-portal"');
    expect(registryRadioGroup).toContain('data-slot="dropdown-menu-radio-group"');
    expect(registryItem).toContain("data-variant={variant}");
    expect(registryIndex).toContain("DropdownMenuRadioItem");
    expect(registryIndex).toContain("DropdownMenuCheckboxItem");
    expect(registryRadioItem).toContain('data-slot="dropdown-menu-radio-item"');
    expect(registryRadioItem).toContain(
      'data-slot="dropdown-menu-radio-item-indicator"',
    );
    expect(registryCheckboxItem).toContain(
      'data-slot="dropdown-menu-checkbox-item"',
    );
    expect(registryCheckboxItem).toContain(
      'data-slot="dropdown-menu-checkbox-item-indicator"',
    );
  });
});
