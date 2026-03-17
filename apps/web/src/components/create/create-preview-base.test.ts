// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("create preview base layer", () => {
  it("renders the preview as a seven-column shadcn-style board", () => {
    const previewSurface = read(
      "apps/web/src/components/create/CreatePreviewSurface.astro",
    );
    const columnMatches = previewSurface.match(
      /<div class="flex flex-col gap-4 md:gap-6">/g,
    );

    expect(previewSurface).toContain('data-slot="capture-target"');
    expect(previewSurface).toContain("grid-cols-7");
    expect(previewSurface).toContain('w-[2400px]');
    expect(previewSurface).toContain('md:w-[3000px]');
    expect(columnMatches?.length).toBe(7);
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

  it("includes the exact non-chart preview card set and excludes chart cards", () => {
    const previewSurface = read(
      "apps/web/src/components/create/CreatePreviewSurface.astro",
    );
    const styleOverview = read(
      "apps/web/src/components/create/preview-cards/StyleOverview.astro",
    );
    const iconGrid = read(
      "apps/web/src/components/create/preview-cards/IconPreviewGrid.astro",
    );
    const previewScript = read("apps/web/src/scripts/create-preview.ts");

    expect(previewSurface).toContain('import StyleOverview');
    expect(previewSurface).toContain('import CodespacesCard');
    expect(previewSurface).toContain('import Invoice');
    expect(previewSurface).toContain('import IconPreviewGrid');
    expect(previewSurface).toContain('import UIElements');
    expect(previewSurface).toContain('import ObservabilityCard');
    expect(previewSurface).toContain('import Shortcuts');
    expect(previewSurface).toContain('import EnvironmentVariables');
    expect(previewSurface).toContain('import InviteTeam');
    expect(previewSurface).toContain('import ActivateAgentDialog');
    expect(previewSurface).toContain('import SkeletonLoading');
    expect(previewSurface).toContain('import NoTeamMembers');
    expect(previewSurface).toContain('import ReportBug');
    expect(previewSurface).toContain('import Contributors');
    expect(previewSurface).toContain('import FeedbackForm');
    expect(previewSurface).toContain('import BookAppointment');
    expect(previewSurface).toContain('import GithubProfile');
    expect(previewSurface).toContain('import AssignIssue');
    expect(previewSurface).toContain('import WeeklyFitnessSummary');
    expect(previewSurface).toContain('import FileUpload');
    expect(previewSurface).toContain('import UsageCard');
    expect(previewSurface).toContain('import ContributionsActivity');
    expect(previewSurface).toContain('import AnomalyAlert');
    expect(previewSurface).toContain('import ShippingAddress');
    expect(previewSurface).toContain('import NotFound');

    expect(previewSurface).not.toContain("AnalyticsCard");
    expect(previewSurface).not.toContain("BarChartCard");
    expect(previewSurface).not.toContain("PieChartCard");
    expect(previewSurface).not.toContain("SleepReport");
    expect(previewSurface).not.toContain("Visitors");
    expect(previewSurface).not.toContain("BarVisualizer");
    expect(previewSurface).not.toContain("LiveWaveform");
    expect(previewSurface).not.toContain("quickActions.title");
    expect(previewSurface).not.toContain("structured.title");
    expect(previewSurface).not.toContain("people.title");
    expect(previewSurface).not.toContain("hero.title");

    expect(styleOverview).toContain("data-create-style-font-summary");
    expect(styleOverview).toContain('"--background"');
    expect(styleOverview).toContain('"--ring"');
    expect(styleOverview).not.toContain('"--chart-1"');
    expect(styleOverview).not.toContain('"--chart-5"');
    expect(iconGrid).toContain("<SemanticIcon");
    expect(iconGrid).toContain('"alert-circle"');
    expect(iconGrid).toContain('"shopping-bag"');
    expect(iconGrid).toContain('"settings"');
    expect(iconGrid).not.toContain("IconPlaceholder");
    expect(previewScript).toContain("[data-create-style-font-summary]");
    expect(previewScript).toContain('].join(" - ")');
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
    const selectContent = read(
      "packages/registry/src/ui/select/SelectContent.astro",
    );
    const selectItem = read(
      "packages/registry/src/ui/select/SelectItem.astro",
    );
    const selectValue = read(
      "packages/registry/src/ui/select/SelectValue.astro",
    );
    const selectGroup = read(
      "packages/registry/src/ui/select/SelectGroup.astro",
    );
    const selectLabel = read(
      "packages/registry/src/ui/select/SelectLabel.astro",
    );
    const selectSeparator = read(
      "packages/registry/src/ui/select/SelectSeparator.astro",
    );

    expect(selectTrigger).toContain("cn-select-trigger");
    expect(selectTrigger).not.toContain("border-input");
    expect(selectTrigger).not.toContain("rounded-lg border bg-transparent");
    expect(selectValue).toContain('class={cn("cn-select-value", className)}');
    expect(selectValue).not.toContain("flex flex-1 text-left");
    expect(selectContent).toContain("cn-select-content");
    expect(selectContent).toContain("cn-select-content-logical");
    expect(selectContent).not.toContain("bg-popover text-popover-foreground");
    expect(selectContent).not.toContain("rounded-lg shadow-md ring-1");
    expect(selectItem).toContain('data-slot="select-item-text"');
    expect(selectItem).toContain("cn-select-item");
    expect(selectItem).not.toContain("gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm");
    expect(selectItem).not.toContain("focus:bg-accent");
    expect(selectGroup).toContain('class={cn("cn-select-group", className)}');
    expect(selectGroup).not.toContain("scroll-my-1 p-1");
    expect(selectLabel).toContain('class={cn("cn-select-label", className)}');
    expect(selectLabel).not.toContain("text-muted-foreground px-1.5 py-1 text-xs");
    expect(selectSeparator).toContain("cn-select-separator pointer-events-none");
    expect(selectSeparator).not.toContain("bg-border -mx-1 my-1 h-px");
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
    const createBaseDropdownItem = read(
      "apps/web/src/components/create/base/ui/dropdown-menu/DropdownMenuItem.astro",
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
    expect(dropdownItem).toContain("value?: string");
    expect(dropdownItem).toContain("data-value={value}");
    expect(dropdownItem).toContain('data-inset={inset ? "" : undefined}');
    expect(dropdownItem).not.toContain('inset && "pl-8"');
    expect(createBaseDropdownItem).toContain("value?: string");
    expect(createBaseDropdownItem).toContain("data-value={value}");
    expect(dropdownLabel).toContain('data-inset={inset ? "" : undefined}');
    expect(dropdownLabel).not.toContain("px-2 py-1.5 text-sm font-medium");
  });

  it("keeps tooltip markup aligned across registry and create preview copies", () => {
    const registryTooltipContent = read(
      "packages/registry/src/ui/tooltip/TooltipContent.astro",
    );
    const createBaseTooltipContent = read(
      "apps/web/src/components/create/base/ui/tooltip/TooltipContent.astro",
    );

    expect(registryTooltipContent).toContain('data-slot="tooltip-arrow"');
    expect(registryTooltipContent).toContain("cn-tooltip-arrow cn-tooltip-arrow-logical");
    expect(registryTooltipContent).toContain('side?: TooltipSide;');
    expect(registryTooltipContent).toContain('"inline-start"');
    expect(registryTooltipContent).toContain('"inline-end"');
    expect(registryTooltipContent).not.toContain('data-slot="tooltip-indicator"');
    expect(registryTooltipContent).not.toContain("data-[state=delayed-open]");
    expect(registryTooltipContent).not.toContain('class="cn-tooltip-portal"');
    expect(registryTooltipContent).toContain("data-[side=top]:-bottom-1");
    expect(registryTooltipContent).toContain("data-[side=bottom]:-top-1");
    expect(registryTooltipContent).not.toContain("top-1/2!");
    expect(registryTooltipContent).not.toContain("translate-y-[calc(-50%-2px)]");
    expect(registryTooltipContent).not.toContain("pointer-events-none absolute cn-tooltip-arrow");

    expect(createBaseTooltipContent).toContain('data-slot="tooltip-arrow"');
    expect(createBaseTooltipContent).toContain("cn-tooltip-arrow cn-tooltip-arrow-logical");
    expect(createBaseTooltipContent).toContain('side?: TooltipSide;');
    expect(createBaseTooltipContent).toContain('"inline-start"');
    expect(createBaseTooltipContent).toContain('"inline-end"');
    expect(createBaseTooltipContent).not.toContain('data-slot="tooltip-indicator"');
    expect(createBaseTooltipContent).not.toContain("data-[state=delayed-open]");
    expect(createBaseTooltipContent).not.toContain('class="cn-tooltip-portal"');
    expect(createBaseTooltipContent).toContain("data-[side=top]:-bottom-1");
    expect(createBaseTooltipContent).toContain("data-[side=bottom]:-top-1");
    expect(createBaseTooltipContent).not.toContain("top-1/2!");
    expect(createBaseTooltipContent).not.toContain("translate-y-[calc(-50%-2px)]");
    expect(createBaseTooltipContent).not.toContain("pointer-events-none absolute cn-tooltip-arrow");
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
