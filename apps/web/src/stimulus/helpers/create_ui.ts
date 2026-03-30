import {
  getRadiusValue,
  isInvertedMenuColor,
  isTranslucentMenuColor,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import {
  type CreatePickerMarkerKind,
  type CreatePickerOption,
} from "@/utils/create-sidebar";
import type {
  CreateSidebarPanel,
  CreateSidebarRenderState,
} from "@/stimulus/types/create";
import {
  getCreateThemeSeedGroups,
  type CreateThemeSeedOption,
} from "@/utils/themes/create-theme";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getIconLibraryAbbreviation(value: string, label: string) {
  const abbreviations: Record<string, string> = {
    lucide: "Lu",
    hugeicons: "Hu",
    tabler: "Tb",
    phosphor: "Ph",
    remixicon: "Ri",
  };

  return abbreviations[value] ?? label.slice(0, 2);
}

export function renderMarkerHtml(
  kind: CreatePickerMarkerKind,
  option: CreatePickerOption,
) {
  const markerValue = option.markerValue ?? option.value;

  if (kind === "swatch") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex size-4 shrink-0 rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" style="${option.color ? `background:${escapeHtml(option.color)};` : ""}"></span>`;
  }

  if (kind === "style") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[9px] font-semibold uppercase text-white/80">${escapeHtml(option.label.slice(0, 1).toUpperCase())}</span>`;
  }

  if (kind === "icon-library") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex min-w-4 shrink-0 items-center justify-center text-[10px] font-semibold tracking-[0.08em] text-white/80 uppercase">${escapeHtml(getIconLibraryAbbreviation(option.value, option.label))}</span>`;
  }

  if (kind === "font") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex min-w-5 shrink-0 items-center justify-center text-sm font-medium text-white/85" style="${option.family ? `font-family:${escapeHtml(option.family)};` : ""}">Aa</span>`;
  }

  if (kind === "radius") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-white/18 bg-white/4" style="border-radius:${escapeHtml(getRadiusValue(markerValue as Parameters<typeof getRadiusValue>[0]))};"><span class="size-1.5 rounded-full bg-white/55"></span></span>`;
  }

  if (kind === "menu-color") {
    const isInverted = isInvertedMenuColor(
      option.value as DesignSystemConfig["menuColor"],
    );
    const isTranslucent = isTranslucentMenuColor(
      option.value as DesignSystemConfig["menuColor"],
    );
    const startClass = isInverted ? "bg-neutral-950" : "bg-neutral-100";
    const endClass = isInverted ? "bg-neutral-100" : "bg-neutral-950";
    return `<span data-create-picker-marker aria-hidden="true" class="relative inline-flex h-4 w-5 shrink-0 overflow-hidden rounded-[6px] border border-white/18 bg-white/5"><span class="block h-full w-1/2 ${startClass}"></span><span class="block h-full w-1/2 ${endClass}"></span>${isTranslucent ? '<span class="absolute inset-x-0 top-0 h-[1px] bg-white/30"></span><span class="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-white/15"></span>' : ""}</span>`;
  }

  if (kind === "menu-accent") {
    const innerClass =
      option.value === "bold" ? "w-full bg-white/90" : "w-2 bg-white/55";
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex h-4 w-5 shrink-0 items-center rounded-full border border-white/18 px-0.5"><span class="block h-2.5 rounded-full transition-all ${innerClass}"></span></span>`;
  }

  if (kind === "language") {
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/4 px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/80">${escapeHtml(option.value.slice(0, 2))}</span>`;
  }

  return `<span data-create-picker-marker aria-hidden="true" class="inline-flex h-4 w-5 shrink-0 items-center justify-between rounded-[6px] border border-white/18 bg-white/4 p-0.5"><span class="h-full w-[34%] rounded-[4px] bg-white/55"></span><span class="flex h-full w-[56%] flex-col justify-between"><span class="h-[38%] rounded-[3px] bg-white/28"></span><span class="h-[38%] rounded-[3px] bg-white/18"></span></span></span>`;
}

function renderThemeSeedButton(
  option: CreateThemeSeedOption,
  selectedTheme: DesignSystemConfig["theme"],
) {
  const selected = option.value === selectedTheme;

  return `
    <button
      type="button"
      class="group/seed flex items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors ${selected ? "border-white/16 bg-white/[0.08] text-white" : "border-white/0 bg-transparent text-white/78 hover:bg-white/[0.05]"}"
      data-create-sidebar-target="themeOption"
      data-create-theme-option
      data-value="${escapeHtml(option.value)}"
      data-action="click->create-sidebar#selectThemeSeed"
      data-create-sidebar-theme-value-param="${escapeHtml(option.value)}"
      ${selected ? 'data-selected=""' : ""}
    >
      <span class="inline-flex size-6 shrink-0 rounded-full border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" style="background:${escapeHtml(option.color)};"></span>
      <span class="flex-1 truncate text-sm font-medium tracking-[-0.01em]">${escapeHtml(option.label)}</span>
      <span class="!hidden shrink-0 text-white/30 opacity-0 transition-opacity group-hover/seed:opacity-100 ${selected ? "opacity-100" : ""}" data-create-palette-open data-value="${escapeHtml(option.value)}" data-action="click->create-sidebar#openPaletteEditor" data-create-sidebar-theme-value-param="${escapeHtml(option.value)}" ${selected ? 'data-selected=""' : ""}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
    </button>
  `;
}

export function renderThemeSeedGroupsHtml(
  baseColor: DesignSystemConfig["baseColor"],
  selectedTheme: DesignSystemConfig["theme"],
) {
  const groups = getCreateThemeSeedGroups(baseColor);

  return groups
    .map((option) => {
      return `
        <section class="flex flex-col gap-2 pt-2" data-create-theme-group="${escapeHtml(option.group)}">
          <header class="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">${escapeHtml(option.label)}</header>
          <div class="flex flex-col">
            ${option.options.map((seedOption) => renderThemeSeedButton(seedOption, selectedTheme)).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

export const PANEL_ORDER: CreateSidebarPanel[] = [
  "main",
  "theme-list",
  "palette-editor",
];

export function getPanelDirection(
  from: CreateSidebarPanel,
  to: CreateSidebarPanel,
): "forward" | "back" {
  return PANEL_ORDER.indexOf(to) > PANEL_ORDER.indexOf(from)
    ? "forward"
    : "back";
}

export const SIDEBAR_PANEL_TITLES: Record<CreateSidebarPanel, string> = {
  main: "Create",
  "theme-list": "Theme",
  "palette-editor": "Palette",
};

export function getThemeModePanelHiddenState(
  mode: CreateSidebarRenderState["themeMode"],
  panelMode: CreateSidebarRenderState["themeMode"],
) {
  return panelMode !== mode;
}
