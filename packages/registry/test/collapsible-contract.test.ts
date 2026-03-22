import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const packageRoot = path.resolve(repoRoot, "packages/registry");
const collapsibleFile = path.resolve(
  packageRoot,
  "src/ui/collapsible/Collapsible.astro",
);
const collapsibleContentFile = path.resolve(
  packageRoot,
  "src/ui/collapsible/CollapsibleContent.astro",
);
const uiPackageRoot = path.resolve(repoRoot, "packages/ui");
const uiCollapsibleFile = path.resolve(
  uiPackageRoot,
  "src/components/collapsible/Collapsible.astro",
);
const uiCollapsibleContentFile = path.resolve(
  uiPackageRoot,
  "src/components/collapsible/CollapsibleContent.astro",
);
const registryFile = path.resolve(repoRoot, "apps/web/public/r/collapsible.json");
const styleRegistryFile = path.resolve(
  repoRoot,
  "apps/web/public/r/styles/bejamas-juno/collapsible.json",
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

describe("collapsible compatibility contract", () => {
  test("registry source relies on @data-slot root parsing", () => {
    const source = fs.readFileSync(collapsibleFile, "utf8");

    expect(source).toContain("open?: boolean");
    expect(source).toContain('data-default-open={open ? true : undefined}');
    expect(source).toContain('data-hidden-until-found={hiddenUntilFound ? "" : undefined}');
    expect(source).toContain(
      'data-[state=closed]:[&_[data-slot=collapsible-content]]:hidden',
    );
    expect(source).toContain("createCollapsible(el);");
    expect(source).not.toContain("parseBooleanDataAttribute");
    expect(source).not.toContain("data-enhanced");
  });

  test("collapsible content keeps the size-animation hooks", () => {
    const registryContent = fs.readFileSync(collapsibleContentFile, "utf8");
    const uiContent = fs.readFileSync(uiCollapsibleContentFile, "utf8");

    expect(registryContent).toContain('data-slot="collapsible-content"');
    expect(registryContent).toContain("overflow-hidden");
    expect(registryContent).toContain("h-(--collapsible-panel-height)");

    expect(uiContent).toContain('data-slot="collapsible-content"');
    expect(uiContent).toContain("overflow-hidden");
    expect(uiContent).toContain("h-(--collapsible-panel-height)");
  });

  test("generated and published outputs stay aligned with the collapsible contract", () => {
    const uiSource = fs.readFileSync(uiCollapsibleFile, "utf8");
    const registryCollapsible = getRegistryContent(
      registryFile,
      "ui/collapsible/Collapsible.astro",
    );
    const styleCollapsible = getRegistryContent(
      styleRegistryFile,
      "ui/collapsible/Collapsible.astro",
    );

    expect(uiSource).toContain("createCollapsible(el);");
    expect(uiSource).not.toContain("data-enhanced");
    expect(uiSource).toContain(
      'data-[state=closed]:[&_[data-slot=collapsible-content]]:hidden',
    );

    expect(registryCollapsible).toContain("createCollapsible(el);");
    expect(registryCollapsible).not.toContain("parseBooleanDataAttribute");
    expect(registryCollapsible).not.toContain("data-enhanced");
    expect(registryCollapsible).toContain(
      'data-[state=closed]:[&_[data-slot=collapsible-content]]:hidden',
    );

    expect(styleCollapsible).toContain("createCollapsible(el);");
    expect(styleCollapsible).not.toContain("parseBooleanDataAttribute");
    expect(styleCollapsible).not.toContain("data-enhanced");
    expect(styleCollapsible).toContain(
      'data-[state=closed]:[&_[data-slot=collapsible-content]]:hidden',
    );
  });
});
