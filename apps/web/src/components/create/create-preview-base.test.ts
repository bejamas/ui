// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("create preview base layer", () => {
  it("renders the preview surface from the registry source package", () => {
    const previewSurface = read(
      "apps/web/src/components/create/CreatePreviewSurface.astro",
    );

    expect(previewSurface).toContain("@bejamas/registry/ui/button");
    expect(previewSurface).toContain("@bejamas/registry/ui/select");
    expect(previewSurface).toContain("@bejamas/registry/ui/tabs");
    expect(previewSurface).not.toContain("@bejamas/ui/components/");
  });

  it("keeps placeholder styling scoped to the create preview surface", () => {
    const previewSurface = read(
      "apps/web/src/components/create/CreatePreviewSurface.astro",
    );

    expect(previewSurface).toContain("data-create-preview-surface");
    expect(previewSurface).toContain(
      "[data-create-preview-placeholder]::placeholder",
    );
    expect(previewSurface).toContain("color: var(--muted-foreground);");
    expect(previewSurface).toContain("opacity: 1;");
  });

  it("keeps button visuals in the style layer", () => {
    const button = read("packages/registry/src/ui/button/Button.astro");

    expect(button).toContain("cn-button-variant-default");
    expect(button).toContain("cn-button-size-default");
    expect(button).not.toContain("bg-primary text-primary-foreground");
    expect(button).not.toContain("h-9 px-3 py-2");
  });

  it("keeps card visuals in the style layer", () => {
    const card = read("packages/registry/src/ui/card/Card.astro");

    expect(card).toContain('class={cn("cn-card"');
    expect(card).not.toContain("bg-card overflow-clip text-card-foreground");
    expect(card).not.toContain("rounded-xl ring-1 ring-border py-6 shadow-sm");
  });

  it("keeps select visuals in the style layer", () => {
    const selectTrigger = read(
      "packages/registry/src/ui/select/SelectTrigger.astro",
    );

    expect(selectTrigger).toContain("cn-select-trigger");
    expect(selectTrigger).not.toContain("border-input");
    expect(selectTrigger).not.toContain("rounded-lg border bg-transparent");
  });

  it("keeps tabs on the shared variant contract", () => {
    const registryTabsList = read(
      "packages/registry/src/ui/tabs/TabsList.astro",
    );
    const registryTabsTrigger = read(
      "packages/registry/src/ui/tabs/TabsTrigger.astro",
    );
    const createBaseTabsList = read(
      "apps/web/src/components/create/base/ui/tabs/TabsList.astro",
    );
    const createBaseTabsTrigger = read(
      "apps/web/src/components/create/base/ui/tabs/TabsTrigger.astro",
    );

    expect(registryTabsList).toContain("cn-tabs-list-variant-indicator");
    expect(registryTabsList).toContain("cn-tabs-list-variant-default");
    expect(registryTabsList).toContain("cn-tabs-list-variant-line");
    expect(registryTabsList).toContain("cn-tabs-list-variant-line-animated");
    expect(registryTabsList).toContain("cn-tabs-list-size-default");
    expect(registryTabsList).toContain("cn-tabs-list-size-sm");
    expect(registryTabsList).toContain("cn-tabs-list-size-lg");
    expect(registryTabsList).toContain('data-slot="tabs-indicator"');
    expect(registryTabsList).toContain('variant === "indicator"');
    expect(registryTabsList).toContain('variant === "line-animated"');

    expect(registryTabsTrigger).toContain("cn-tabs-trigger");
    expect(registryTabsTrigger).toContain("text-foreground/60");
    expect(registryTabsTrigger).toContain("focus-visible:outline-ring");
    expect(registryTabsTrigger).toContain(
      "group-data-[variant=indicator]/tabs-list:data-[state=active]:bg-transparent",
    );
    expect(registryTabsTrigger).toContain(
      "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
    );
    expect(registryTabsTrigger).toContain(
      "group-data-[variant=line-animated]/tabs-list:after:hidden",
    );

    expect(createBaseTabsList).toContain("cn-tabs-list-variant-indicator");
    expect(createBaseTabsList).toContain("cn-tabs-list-variant-line-animated");
    expect(createBaseTabsList).toContain('data-slot="tabs-indicator"');

    expect(createBaseTabsTrigger).toContain("text-foreground/60");
    expect(createBaseTabsTrigger).toContain("focus-visible:outline-ring");
    expect(createBaseTabsTrigger).toContain(
      "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
    );
  });

  it("keeps dialog and dropdown visuals in the style layer", () => {
    const dialogContent = read(
      "packages/registry/src/ui/dialog/DialogContent.astro",
    );
    const dialogTitle = read(
      "packages/registry/src/ui/dialog/DialogTitle.astro",
    );
    const dropdownContent = read(
      "packages/registry/src/ui/dropdown-menu/DropdownMenuContent.astro",
    );
    const dropdownItem = read(
      "packages/registry/src/ui/dropdown-menu/DropdownMenuItem.astro",
    );
    const dropdownLabel = read(
      "packages/registry/src/ui/dropdown-menu/DropdownMenuLabel.astro",
    );

    expect(dialogContent).toContain("cn-dialog-content");
    expect(dialogContent).not.toContain("bg-background");
    expect(dialogTitle).toContain('class={cn("cn-dialog-title", className)}');
    expect(dialogTitle).not.toContain("text-xl");

    expect(dropdownContent).toContain("cn-dropdown-menu-content");
    expect(dropdownContent).not.toContain("min-w-32 overflow-hidden");
    expect(dropdownItem).toContain('data-inset={inset ? "" : undefined}');
    expect(dropdownItem).not.toContain('inset && "pl-8"');
    expect(dropdownLabel).toContain('data-inset={inset ? "" : undefined}');
    expect(dropdownLabel).not.toContain("px-2 py-1.5 text-sm font-medium");
  });

  it("keeps table, field, native select, and toggle visuals in the style layer", () => {
    const tableRow = read("packages/registry/src/ui/table/TableRow.astro");
    const tableHead = read("packages/registry/src/ui/table/TableHead.astro");
    const fieldError = read("packages/registry/src/ui/field/FieldError.astro");
    const nativeSelect = read(
      "packages/registry/src/ui/native-select/NativeSelect.astro",
    );
    const toggle = read("packages/registry/src/ui/toggle/Toggle.astro");
    const toggleShared = read("packages/registry/src/lib/toggle-shared.ts");

    expect(tableRow).toContain('class={cn("cn-table-row", className)}');
    expect(tableRow).not.toContain("hover:bg-muted/50");
    expect(tableHead).toContain('class={cn("cn-table-head", className)}');
    expect(tableHead).not.toContain("h-10 px-2");

    expect(fieldError).toContain("cn-field-error font-normal");
    expect(fieldError).not.toContain("text-destructive text-sm");

    expect(nativeSelect).toContain("cn-native-select");
    expect(nativeSelect).not.toContain("border-input");
    expect(nativeSelect).not.toContain("right-2.5");

    expect(toggle).toContain("toggleVariants({ variant, size })");
    expect(toggleShared).toContain("cn-toggle-variant-outline");
    expect(toggle).not.toContain("data-[state=on]:bg-muted");
    expect(toggle).not.toContain("rounded-lg text-sm font-medium");
  });
});
