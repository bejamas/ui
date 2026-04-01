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
    const STYLE_ICON_PATHS: Record<string, { d: string; join?: string }> = {
      juno: { d: "M8 2H16L22 8V16L16 22H8L2 16V8L8 2Z" },
      vega: { d: "M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" },
      nova: { d: "M2 12C2 9.19974 2 7.79961 2.54497 6.73005C3.02433 5.78924 3.78924 5.02433 4.73005 4.54497C5.79961 4 7.19974 4 10 4H14C16.8003 4 18.2004 4 19.27 4.54497C20.2108 5.02433 20.9757 5.78924 21.455 6.73005C22 7.79961 22 9.19974 22 12C22 14.8003 22 16.2004 21.455 17.27C20.9757 18.2108 20.2108 18.9757 19.27 19.455C18.2004 20 16.8003 20 14 20H10C7.19974 20 5.79961 20 4.73005 19.455C3.78924 18.9757 3.02433 18.2108 2.54497 17.27C2 16.2004 2 14.8003 2 12Z", join: "round" },
      maia: { d: "M2 12A10 10 0 1 1 22 12A10 10 0 1 1 2 12Z", join: "round" },
      lyra: { d: "M7.84308 3.80211C9.8718 2.6007 10.8862 2 12 2C13.1138 2 14.1282 2.6007 16.1569 3.80211L16.8431 4.20846C18.8718 5.40987 19.8862 6.01057 20.4431 7C21 7.98943 21 9.19084 21 11.5937V12.4063C21 14.8092 21 16.0106 20.4431 17C19.8862 17.9894 18.8718 18.5901 16.8431 19.7915L16.1569 20.1979C14.1282 21.3993 13.1138 22 12 22C10.8862 22 9.8718 21.3993 7.84308 20.1979L7.15692 19.7915C5.1282 18.5901 4.11384 17.9894 3.55692 17C3 16.0106 3 14.8092 3 12.4063V11.5937C3 9.19084 3 7.98943 3.55692 7C4.11384 6.01057 5.1282 5.40987 7.15692 4.20846L7.84308 3.80211Z" },
      mira: { d: "M5.92089 5.92089C8.15836 3.68342 9.2771 2.56468 10.5857 2.19562C11.5105 1.93479 12.4895 1.93479 13.4143 2.19562C14.7229 2.56468 15.8416 3.68342 18.0791 5.92089C20.3166 8.15836 21.4353 9.2771 21.8044 10.5857C22.0652 11.5105 22.0652 12.4895 21.8044 13.4143C21.4353 14.7229 20.3166 15.8416 18.0791 18.0791C15.8416 20.3166 14.7229 21.4353 13.4143 21.8044C12.4895 22.0652 11.5105 22.0652 10.5857 21.8044C9.2771 21.4353 8.15836 20.3166 5.92089 18.0791C3.68342 15.8416 2.56468 14.7229 2.19562 13.4143C1.93479 12.4895 1.93479 11.5105 2.19562 10.5857C2.56468 9.2771 3.68342 8.15836 5.92089 5.92089Z", join: "round" },
      luma: { d: "M2 12C2 8.134 5.134 5 9 5H15C18.866 5 22 8.134 22 12C22 15.866 18.866 19 15 19H9C5.134 19 2 15.866 2 12Z", join: "round" },
    };
    const icon = STYLE_ICON_PATHS[option.value];
    if (icon) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${icon.join ? ` stroke-linejoin="${icon.join}"` : ""} class="size-4 shrink-0 text-white/80" data-create-picker-marker aria-hidden="true"><path d="${icon.d}" /></svg>`;
    }
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
