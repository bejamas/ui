import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  encodePreset,
  getRadiusValue,
  isInvertedMenuColor,
  isTranslucentMenuColor,
  normalizeDesignSystemConfig,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import {
  buildCreatePreviewUrl,
  parseCreateSearchParams,
  CREATE_PREVIEW_COMMAND_VALUE,
  resolveCreatePreviewTarget,
} from "@/utils/create";
import { getKitchenSinkCreateItemId } from "@/utils/kitchen-sink";
import {
  applyCreateDocsRootState,
  cleanupCreateDocsRootState,
} from "@/utils/create-docs-shell";
import {
  buildDesignSystemThemeCss,
  resolveDesignSystemTheme,
} from "@/utils/themes/design-system-adapter";
import {
  getThemeChoiceFromRoot,
  getThemeModeFromRoot,
  resolveThemeMode as resolveGlobalThemeMode,
  setGlobalThemeChoice,
} from "@/utils/themes/iframe-theme-sync";
import { normalizeThemeTokenValue } from "@/utils/themes/theme-tokens";
import { setStoredPreset } from "@/utils/themes/preset-store";
import {
  createCustomThemeRef,
  createThemeName,
  emptyThemeOverrides,
  getCreateThemeSeedGroups,
  getCreateThemeSeedOption,
  hasThemeOverrides,
  normalizeThemeOverrides,
  type CreateThemeSeedOption,
  type ThemeMode,
  type ThemeOverrides,
} from "@/utils/themes/create-theme";
import { parseCssVariables } from "@/components/theme-editor/utils/themeEditorUtils";
import {
  CREATE_PICKER_MARKERS,
  type CreateFontGroup,
  type CreateLockableParam,
  createRandomDesignSystemConfig,
  getCreatePickerOptionsByName,
  isCreatePickerDisabled,
  getCreatePickerSelectedOption,
  hasCreateLockableParam,
  isCreateFontGroup,
  type CreatePickerMarkerKind,
  type CreatePickerName,
  type CreatePickerOption,
} from "@/utils/create-sidebar";
import { incrementShuffleCountRequest } from "@/utils/shuffles";
import {
  buildCreateProjectCommand,
  CREATE_PROJECT_PACKAGE_MANAGERS,
  CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY,
  getCreateProjectTemplateValue,
  type CreateProjectPackageManager,
} from "@/utils/create-project-dialog";

type CreateConfig = DesignSystemConfig;
type CreatePresetConfig = Omit<
  CreateConfig,
  "template" | "rtl" | "rtlLanguage"
>;
type HistoryMode = "push" | "replace";
type PreviewMessage = {
  type: "bejamas:create-preview";
  config: CreateConfig;
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
};

type PreviewShortcutMessage = {
  type: "bejamas:create-navigate-open";
};

type ColorInputElement = HTMLElement & {
  dataset: DOMStringMap & {
    createThemeMode?: ThemeMode;
    token?: string;
  };
  setColor?: (value: string) => void;
};

declare global {
  interface Window {
    __BEJAMAS_CREATE__?: {
      styleCssByStyle: Record<string, string>;
      initialThemeRef?: string | null;
      initialThemeOverrides?: Partial<ThemeOverrides> | null;
    };
  }
}

const PICKER_NAMES = [
  "style",
  "baseColor",
  "iconLibrary",
  "fontHeading",
  "font",
  "radius",
  "menuColor",
  "menuAccent",
] satisfies CreatePickerName[];

const PRESET_CONFIG_NAMES = [
  "style",
  "baseColor",
  "theme",
  "iconLibrary",
  "fontHeading",
  "font",
  "radius",
  "menuColor",
  "menuAccent",
] as const satisfies readonly (keyof CreatePresetConfig)[];

const form = document.querySelector(
  "[data-create-form]",
) as HTMLFormElement | null;
const iframe = document.querySelector(
  "[data-preview-frame]",
) as HTMLIFrameElement | null;
const presetNode = document.querySelector(
  "[data-preset-code]",
) as HTMLElement | null;
const presetButton = document.querySelector(
  "[data-create-copy-preset]",
) as HTMLButtonElement | null;
const randomizeButtons = Array.from(
  document.querySelectorAll("[data-create-randomize]"),
) as HTMLButtonElement[];
const headerNavigateButtons = Array.from(
  document.querySelectorAll("[data-create-header-navigate]"),
) as HTMLButtonElement[];
const headerShuffleButtons = Array.from(
  document.querySelectorAll("[data-create-header-shuffle]"),
) as HTMLButtonElement[];
const headerSearchButtons = Array.from(
  document.querySelectorAll("[data-create-header-search]"),
) as HTMLButtonElement[];
const sidebarTitle = document.querySelector(
  "[data-create-sidebar-title]",
) as HTMLElement | null;
const headerThemeLock = document.querySelector(
  "[data-create-header-theme-lock]",
) as HTMLElement | null;
const createProjectDialog = document.querySelector(
  "[data-create-project-dialog]",
) as HTMLElement | null;
const navigateDialog = document.querySelector(
  "[data-create-navigate-dialog]",
) as HTMLElement | null;
const navigateCommand = document.querySelector(
  "[data-create-navigate-command]",
) as HTMLElement | null;
const navigateInput = document.querySelector(
  "[data-create-navigate-input]",
) as HTMLInputElement | null;
const createProjectPackageTabs = document.querySelector(
  "[data-create-project-package-tabs]",
) as HTMLElement | null;
const createProjectPackageManagerInput = document.querySelector(
  "[data-create-project-package-manager]",
) as HTMLInputElement | null;
const createProjectCommandNodes = Object.fromEntries(
  CREATE_PROJECT_PACKAGE_MANAGERS.map((packageManager) => [
    packageManager,
    document.querySelector(
      `[data-create-project-command="${packageManager}"]`,
    ) as HTMLElement | null,
  ]),
) as Record<CreateProjectPackageManager, HTMLElement | null>;
const createProjectCopyCommandButton = document.querySelector(
  "[data-create-project-copy-command]",
) as HTMLButtonElement | null;
const createProjectCopyCommandLabel = document.querySelector(
  "[data-create-project-copy-command-label]",
) as HTMLElement | null;
const createProjectMonorepoField = document.querySelector(
  "[data-create-project-monorepo]",
) as HTMLElement | null;
const themeStyleNode = document.getElementById("create-page-theme-css");
const styleStyleNode = document.getElementById("create-page-style-css");
const docsRoot = document.documentElement;
const themeMainPanel = document.querySelector(
  "[data-create-form-main]",
) as HTMLElement | null;
const themeListPanel = document.querySelector(
  "[data-create-theme-list-panel]",
) as HTMLElement | null;
const palettePanel = document.querySelector(
  "[data-create-palette-panel]",
) as HTMLElement | null;
const themeTrigger = document.querySelector(
  "[data-create-theme-trigger]",
) as HTMLButtonElement | null;
const themeListBackButton = document.querySelector(
  "[data-create-theme-list-back]",
) as HTMLButtonElement | null;
const paletteBackButton = document.querySelector(
  "[data-create-palette-back]",
) as HTMLButtonElement | null;
const paletteCancelButton = document.querySelector(
  "[data-create-palette-cancel]",
) as HTMLButtonElement | null;
const paletteSaveButton = document.querySelector(
  "[data-create-palette-save]",
) as HTMLButtonElement | null;
const paletteThemeLabel = document.querySelector(
  "[data-palette-theme-label]",
) as HTMLElement | null;
const paletteThemeSwatch = document.querySelector(
  "[data-palette-theme-swatch]",
) as HTMLElement | null;
const actionsDefault = document.querySelector(
  "[data-actions-default]",
) as HTMLElement | null;
const actionsPalette = document.querySelector(
  "[data-actions-palette]",
) as HTMLElement | null;
const themeStatusNode = document.querySelector(
  "[data-create-theme-status]",
) as HTMLElement | null;
const themeSeedContainer = document.querySelector(
  "[data-create-theme-seeds]",
) as HTMLElement | null;
const themeTabButtons = Array.from(
  document.querySelectorAll("[data-create-theme-tab]"),
) as HTMLButtonElement[];
const themeModePanels = Array.from(
  document.querySelectorAll("[data-create-theme-mode-panel]"),
) as HTMLElement[];
const themeImportButton = document.querySelector(
  "[data-create-theme-import]",
) as HTMLButtonElement | null;
const themeImportDialogTrigger = document.getElementById(
  "import-dialog-trigger",
) as HTMLButtonElement | null;
const themeImportConfirmButton = document.getElementById(
  "import-confirm-btn",
) as HTMLButtonElement | null;
const themeImportTextarea = document.getElementById(
  "import-css-textarea",
) as HTMLTextAreaElement | null;
const themeRefHiddenInput = document.querySelector(
  "[data-create-theme-ref-input]",
) as HTMLInputElement | null;

if (!form || !iframe || !presetNode) {
  throw new Error("Create page is missing required form elements.");
}

const createForm = form;
const previewFrame = iframe;
const presetCodeNode = presetNode;

let activeThemeMode: ThemeMode = getThemeModeFromRoot(
  docsRoot,
  resolveGlobalThemeMode(
    getThemeChoiceFromRoot(docsRoot),
    window.matchMedia("(prefers-color-scheme: light)").matches,
  ),
);
let themeRef = window.__BEJAMAS_CREATE__?.initialThemeRef ?? null;
let themeOverrides = normalizeThemeOverrides(
  window.__BEJAMAS_CREATE__?.initialThemeOverrides,
);
let themeSyncTimer = 0;
let themeStatusMessage = "";
const initialSearchParams = new URLSearchParams(window.location.search);
let currentPreviewTarget = resolveCreatePreviewTarget(initialSearchParams);
type CreateSidebarPanel = "main" | "theme-list" | "palette-editor";
let activePanel: CreateSidebarPanel = "main";
let themePanelTransitionToken = 0;
let paletteSnapshot: {
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
} | null = null;
const lockedParams = new Set<CreateLockableParam>();
let lockedFontGroup: CreateFontGroup | null = null;
const initialPresetResult = parseCreateSearchParams(initialSearchParams);
const preservedPreset =
  initialPresetResult.success && initialPresetResult.preset
    ? {
        code: initialPresetResult.preset,
        config: toPresetConfig(initialPresetResult.data),
      }
    : null;

const CREATE_PREVIEW_DEFAULT_KEY = CREATE_PREVIEW_COMMAND_VALUE;
const THEME_PANEL_TRANSITION_DURATION = 350;

previewFrame.dataset.previewKey =
  previewFrame.dataset.previewKey ??
  currentPreviewTarget ??
  CREATE_PREVIEW_DEFAULT_KEY;

function getField(name: string) {
  return createForm.elements.namedItem(name) as HTMLInputElement | null;
}

function isParamLocked(param: CreateLockableParam) {
  return lockedParams.has(param);
}

function syncLockButtons(param?: CreateLockableParam) {
  const selector = param
    ? `[data-create-lock-param="${param}"]`
    : "[data-create-lock-button]";

  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    const buttonParam = button.dataset.createLockParam;
    if (!buttonParam || !hasCreateLockableParam(buttonParam)) {
      return;
    }

    const locked = isParamLocked(buttonParam);
    button.dataset.locked = String(locked);
    button.title = locked ? "Unlock" : "Lock";
    button.setAttribute("aria-label", locked ? "Unlock" : "Lock");
  });
}

function toggleLockedParam(param: CreateLockableParam) {
  if (lockedParams.has(param)) {
    lockedParams.delete(param);
  } else {
    lockedParams.add(param);
  }

  syncLockButtons(param);
}

function syncFontGroupLockButtons() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-create-font-group-lock-button]")
    .forEach((button) => {
      const group = button.dataset.createFontGroup;
      if (!group || !isCreateFontGroup(group)) {
        return;
      }

      const locked = lockedFontGroup === group;
      button.dataset.locked = String(locked);
      button.title = locked ? "Unlock font group" : "Lock font group";
      button.setAttribute(
        "aria-label",
        locked ? "Unlock font group" : "Lock font group",
      );
    });
}

function toggleLockedFontGroup(group: CreateFontGroup) {
  lockedFontGroup = lockedFontGroup === group ? null : group;
  syncFontGroupLockButtons();
}

function getPicker(name: CreatePickerName) {
  return document.querySelector(
    `[data-create-picker="${name}"]`,
  ) as HTMLElement | null;
}

function getPickerContent(name: CreatePickerName) {
  return document.querySelector(
    `[data-create-picker-content="${name}"]`,
  ) as HTMLElement | null;
}

function collectConfig(): CreateConfig {
  const formData = new FormData(createForm);

  return normalizeDesignSystemConfig({
    style: String(formData.get("style")) as CreateConfig["style"],
    baseColor: String(formData.get("baseColor")) as CreateConfig["baseColor"],
    theme: String(formData.get("theme")) as CreateConfig["theme"],
    font: String(formData.get("font")) as CreateConfig["font"],
    fontHeading: String(
      formData.get("fontHeading") ?? DEFAULT_DESIGN_SYSTEM_CONFIG.fontHeading,
    ) as CreateConfig["fontHeading"],
    iconLibrary: String(
      formData.get("iconLibrary"),
    ) as CreateConfig["iconLibrary"],
    radius: String(formData.get("radius")) as CreateConfig["radius"],
    menuAccent: String(
      formData.get("menuAccent"),
    ) as CreateConfig["menuAccent"],
    menuColor: String(formData.get("menuColor")) as CreateConfig["menuColor"],
    template: DEFAULT_DESIGN_SYSTEM_CONFIG.template,
    rtl: false,
    rtlLanguage: DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage,
  });
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [data-slot="combobox-input"]',
    ),
  );
}

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

function renderMarkerHtml(
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
      option.value as CreateConfig["menuColor"],
    );
    const isTranslucent = isTranslucentMenuColor(
      option.value as CreateConfig["menuColor"],
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

function renderPickerItems(
  name: CreatePickerName,
  options: CreatePickerOption[],
  selectedValue: string,
) {
  const markerKind = CREATE_PICKER_MARKERS[name];

  return options
    .map((option) => {
      const selected = option.value === selectedValue;

      return `
        <div
          role="menuitem"
          tabindex="0"
          data-slot="dropdown-menu-item"
          data-create-picker-item
          data-value="${escapeHtml(option.value)}"
          ${selected ? 'data-selected=""' : ""}
          class="cn-dropdown-menu-item group/dropdown-menu-item relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 create-picker-item !gap-2.5 !rounded-[12px] !px-3 !py-2 !text-[14px] !font-medium !text-white/86 data-[highlighted]:!bg-white/[0.06] data-[highlighted]:!text-white/92 focus:**:!text-inherit"
        >
          <span class="truncate" data-create-picker-item-label>${escapeHtml(option.label)}</span>
          <span class="ml-auto flex shrink-0 items-center gap-2">
            <span data-create-picker-item-marker>${renderMarkerHtml(markerKind, option)}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              data-create-picker-item-check
              aria-hidden="true"
              class="size-4 text-white/78 transition-opacity ${selected ? "opacity-100" : "opacity-0"}"
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
          </span>
        </div>
      `;
    })
    .join("");
}

function setInputValue(name: string, value: string, shouldDispatch = true) {
  const field = getField(name);
  if (!field || field.value === value) {
    return;
  }

  field.value = value;

  if (shouldDispatch) {
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setThemeRefValue(value: string | null) {
  if (themeRefHiddenInput) {
    themeRefHiddenInput.value = value ?? "";
  }
}

function getMergedThemeStyles(config: CreateConfig) {
  return resolveDesignSystemTheme(config, themeOverrides).styles;
}

function getBaselineThemeStyles(config: CreateConfig) {
  return resolveDesignSystemTheme(config).styles;
}

function syncThemeSelection(config: CreateConfig) {
  const themeOptions = getCreatePickerOptionsByName("theme", {
    baseColor: config.baseColor,
    style: config.style,
  });
  const nextTheme =
    themeOptions.find((option) => option.value === config.theme)?.value ??
    themeOptions[0]?.value ??
    config.theme;

  setInputValue("theme", nextTheme, false);
  syncThemeSeedButtons(config.baseColor, nextTheme);
  return nextTheme;
}

function getCurrentPreset(config: CreateConfig) {
  const presetConfig = toPresetConfig(config);

  if (
    preservedPreset &&
    isSamePresetConfig(presetConfig, preservedPreset.config)
  ) {
    return preservedPreset.code;
  }

  return encodePreset(presetConfig as Parameters<typeof encodePreset>[0]);
}

function toPresetConfig(config: CreateConfig): CreatePresetConfig {
  const {
    template: _template,
    rtl: _rtl,
    rtlLanguage: _rtlLanguage,
    ...presetConfig
  } = config;

  return presetConfig;
}

function isSamePresetConfig(
  left: CreatePresetConfig,
  right: CreatePresetConfig,
) {
  return PRESET_CONFIG_NAMES.every((name) => left[name] === right[name]);
}

function syncNavigateDialogSelection() {
  navigateCommand?.dispatchEvent(
    new CustomEvent("command:set", {
      detail: {
        search: "",
        value: currentPreviewTarget ?? CREATE_PREVIEW_COMMAND_VALUE,
      },
    }),
  );
}

function setNavigateDialogOpen(open: boolean) {
  navigateDialog?.dispatchEvent(
    new CustomEvent("dialog:set", {
      detail: {
        open,
      },
    }),
  );
}

function selectNavigatePreviewTarget(nextPreviewTarget: string | null) {
  setNavigateDialogOpen(false);

  if (nextPreviewTarget === currentPreviewTarget) {
    return;
  }

  updateUi({
    history: "push",
    previewTarget: nextPreviewTarget,
    forceIframeReload: true,
  });
}

function syncRadiusPicker(config: CreateConfig) {
  const itemsContainer = getPickerContent("radius")?.querySelector(
    "[data-create-picker-items]",
  ) as HTMLElement | null;
  const radiusOptions = getCreatePickerOptionsByName("radius", {
    baseColor: config.baseColor,
    style: config.style,
  });

  if (itemsContainer) {
    itemsContainer.innerHTML = renderPickerItems(
      "radius",
      radiusOptions,
      config.radius,
    );
  }
}

function syncFontHeadingPicker(config: CreateConfig) {
  const inheritOption = getCreatePickerSelectedOption("fontHeading", {
    ...config,
    fontHeading: "inherit",
  });
  const inheritItem = getPickerContent("fontHeading")?.querySelector(
    '[data-create-picker-item][data-value="inherit"]',
  ) as HTMLElement | null;

  if (!inheritOption || !inheritItem) {
    return;
  }

  const labelNode = inheritItem.querySelector(
    "[data-create-picker-item-label]",
  ) as HTMLElement | null;
  if (labelNode) {
    labelNode.textContent = inheritOption.label;
  }

  const markerNode = inheritItem.querySelector(
    "[data-create-picker-item-marker]",
  ) as HTMLElement | null;
  if (markerNode) {
    markerNode.innerHTML = renderMarkerHtml("font", inheritOption);
  }
}

function syncPickerUi(
  name: CreatePickerName,
  value: string,
  config: CreateConfig,
) {
  const picker = getPicker(name);
  if (!picker) {
    return;
  }

  const content = getPickerContent(name);
  const selectedOption = getCreatePickerSelectedOption(name, config);
  const disabled = isCreatePickerDisabled(name, config);

  picker.dataset.value = value;

  const trigger = picker.querySelector(
    "[data-create-picker-trigger]",
  ) as HTMLButtonElement | null;
  if (trigger) {
    trigger.disabled = disabled;
  }

  const lockButton = picker.parentElement?.querySelector(
    `[data-create-lock-param="${name}"]`,
  ) as HTMLButtonElement | null;
  if (lockButton) {
    lockButton.disabled = disabled;
    lockButton.classList.toggle("hidden", disabled);
    lockButton.setAttribute("aria-hidden", disabled ? "true" : "false");
  }

  content?.querySelectorAll("[data-create-picker-item]").forEach((item) => {
    if (!(item instanceof HTMLElement)) {
      return;
    }

    const isSelected = item.dataset.value === value;
    if (isSelected) {
      item.setAttribute("data-selected", "");
    } else {
      item.removeAttribute("data-selected");
    }

    const check = item.querySelector(
      "[data-create-picker-item-check]",
    ) as HTMLElement | null;
    if (check) {
      check.classList.toggle("opacity-100", isSelected);
      check.classList.toggle("opacity-0", !isSelected);
    }
  });

  const labelNode = picker.querySelector(
    "[data-create-picker-current-label]",
  ) as HTMLElement | null;
  const markerNode = picker.querySelector(
    "[data-create-picker-current-marker]",
  ) as HTMLElement | null;

  if (labelNode) {
    labelNode.textContent = selectedOption?.label ?? value;
  }

  if (markerNode) {
    markerNode.replaceChildren();

    if (selectedOption) {
      markerNode.innerHTML = renderMarkerHtml(
        CREATE_PICKER_MARKERS[name],
        selectedOption,
      );
    }
  }
}

function syncThemeTrigger(config: CreateConfig) {
  const labelNode = document.querySelector(
    "[data-create-theme-current-label]",
  ) as HTMLElement | null;
  const markerNode = document.querySelector(
    "[data-create-theme-current-marker]",
  ) as HTMLElement | null;
  const selectedTheme = getCreateThemeSeedOption(
    config.baseColor,
    config.theme,
  );
  const mergedStyles = getMergedThemeStyles(config);
  const label = hasThemeOverrides(themeOverrides)
    ? "Custom"
    : (selectedTheme?.label ?? config.theme);

  if (labelNode) {
    labelNode.textContent = label;
  }

  if (markerNode) {
    markerNode.innerHTML = renderMarkerHtml("swatch", {
      value: config.theme,
      label,
      color:
        mergedStyles.light.primary ?? selectedTheme?.color ?? "oklch(0.72 0 0)",
    });
  }
}

function syncThemeSeedButtons(
  baseColor: CreateConfig["baseColor"],
  selectedTheme: CreateConfig["theme"],
) {
  if (!themeSeedContainer) {
    return;
  }

  const groups = getCreateThemeSeedGroups(baseColor);
  themeSeedContainer.innerHTML = groups
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

function renderThemeSeedButton(
  option: CreateThemeSeedOption,
  selectedTheme: CreateConfig["theme"],
) {
  const selected = option.value === selectedTheme;

  return `
    <button
      type="button"
      class="group/seed flex items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors ${selected ? "border-white/16 bg-white/[0.08] text-white" : "border-white/0 bg-transparent text-white/78 hover:bg-white/[0.05]"}"
      data-create-theme-option
      data-value="${escapeHtml(option.value)}"
      ${selected ? 'data-selected=""' : ""}
    >
      <span class="inline-flex size-6 shrink-0 rounded-full border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" style="background:${escapeHtml(option.color)};"></span>
      <span class="flex-1 truncate text-sm font-medium tracking-[-0.01em]">${escapeHtml(option.label)}</span>
      <span class="shrink-0 text-white/30 opacity-0 transition-opacity group-hover/seed:opacity-100 ${selected ? "opacity-100" : ""}" data-create-palette-open data-value="${escapeHtml(option.value)}" ${selected ? 'data-selected=""' : ""}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
    </button>
  `;
}

function syncThemeTabs() {
  themeTabButtons.forEach((button) => {
    const selected = button.dataset.value === activeThemeMode;
    button.toggleAttribute("data-selected", selected);
    button.classList.toggle("bg-white/[0.09]", selected);
    button.classList.toggle("text-white", selected);
    button.classList.toggle("text-white/62", !selected);
  });

  themeModePanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.mode !== activeThemeMode);
  });
}

function syncActiveThemeMode() {
  activeThemeMode = getThemeModeFromRoot(
    docsRoot,
    resolveGlobalThemeMode(
      getThemeChoiceFromRoot(docsRoot),
      window.matchMedia("(prefers-color-scheme: light)").matches,
    ),
  );
  syncThemeTabs();
}

function syncThemeInputs(config: CreateConfig) {
  const styles = getMergedThemeStyles(config);

  document
    .querySelectorAll<ColorInputElement>("[data-create-theme-input]")
    .forEach((node) => {
      const mode = node.dataset.createThemeMode;
      const token = node.dataset.token as keyof typeof styles.light | undefined;
      if (!mode || !token) {
        return;
      }

      node.setColor?.(styles[mode][token] ?? "");
    });
}

type ThemePanelVisualState = "active" | "entering" | "exiting" | "inactive";

function prefersReducedThemePanelMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function waitForThemePanelTransition(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function waitForThemePanelFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

const PANEL_ORDER: CreateSidebarPanel[] = [
  "main",
  "theme-list",
  "palette-editor",
];

function getPanelDirection(
  from: CreateSidebarPanel,
  to: CreateSidebarPanel,
): "forward" | "back" {
  return PANEL_ORDER.indexOf(to) > PANEL_ORDER.indexOf(from)
    ? "forward"
    : "back";
}

function setThemePanelElementState(
  element: HTMLElement | null,
  state: ThemePanelVisualState,
  hidden: boolean,
) {
  if (!element) {
    return;
  }

  element.dataset.panelState = state;
  element.hidden = hidden;
}

const panelElements: Record<CreateSidebarPanel, HTMLElement | null> = {
  main: themeMainPanel,
  "theme-list": themeListPanel,
  "palette-editor": palettePanel,
};

const SIDEBAR_PANEL_TITLES: Record<CreateSidebarPanel, string> = {
  main: "Create",
  "theme-list": "Theme",
  "palette-editor": "Palette",
};

function syncSidebarTitle(target: CreateSidebarPanel) {
  if (sidebarTitle) sidebarTitle.textContent = SIDEBAR_PANEL_TITLES[target];
  if (headerThemeLock) {
    headerThemeLock.hidden = target === "main";
  }
}

function applyPanelStateImmediately(target: CreateSidebarPanel) {
  activePanel = target;
  for (const [panel, element] of Object.entries(panelElements)) {
    setThemePanelElementState(
      element,
      panel === target ? "active" : "inactive",
      panel !== target,
    );
  }
  syncActionBarVisibility();
  syncSidebarTitle(target);
}

function syncActionBarVisibility() {
  if (actionsDefault) actionsDefault.hidden = activePanel === "palette-editor";
  if (actionsPalette) actionsPalette.hidden = activePanel !== "palette-editor";
}

function syncPaletteHeader() {
  const config = collectConfig();
  const selectedTheme = getCreateThemeSeedOption(
    config.baseColor,
    config.theme,
  );
  const mergedStyles = getMergedThemeStyles(config);
  const label = hasThemeOverrides(themeOverrides)
    ? "Custom"
    : (selectedTheme?.label ?? config.theme);
  const color =
    mergedStyles.light.primary ?? selectedTheme?.color ?? "oklch(0.72 0 0)";

  if (paletteThemeLabel) paletteThemeLabel.textContent = label;
  if (paletteThemeSwatch) paletteThemeSwatch.style.background = color;
}

function getFocusTargetForPanel(panel: CreateSidebarPanel): HTMLElement | null {
  switch (panel) {
    case "main":
      return themeTrigger;
    case "theme-list":
      return themeListBackButton;
    case "palette-editor":
      return paletteBackButton;
  }
}

async function setActivePanel(target: CreateSidebarPanel) {
  const currentElement = panelElements[activePanel];
  const targetElement = panelElements[target];

  if (!currentElement || !targetElement) {
    applyPanelStateImmediately(target);
    return;
  }

  if (activePanel === target && themePanelTransitionToken === 0) {
    return;
  }

  const transitionToken = ++themePanelTransitionToken;

  if (prefersReducedThemePanelMotion()) {
    applyPanelStateImmediately(target);
    themePanelTransitionToken = 0;
    getFocusTargetForPanel(target)?.focus();
    return;
  }

  // Determine slide direction
  const previousPanel = activePanel;
  const direction = getPanelDirection(previousPanel, target);
  activePanel = target;
  syncActionBarVisibility();
  syncSidebarTitle(target);

  // Set direction on both panels
  if (currentElement) currentElement.dataset.panelDirection = direction;
  if (targetElement) targetElement.dataset.panelDirection = direction;

  // Place target at its entering position instantly (no transition)
  if (targetElement) {
    targetElement.classList.add("create-panel-no-transition");
    targetElement.dataset.panelState = "entering";
    targetElement.hidden = false;
  }

  // Double rAF: paint entering position, then start transition
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  if (transitionToken !== themePanelTransitionToken) return;

  // Cross-fade both simultaneously
  if (targetElement)
    targetElement.classList.remove("create-panel-no-transition");
  if (currentElement) {
    currentElement.dataset.panelState = "exiting";
  }
  if (targetElement) {
    targetElement.dataset.panelState = "active";
  }

  await waitForThemePanelTransition(THEME_PANEL_TRANSITION_DURATION);
  if (transitionToken !== themePanelTransitionToken) return;

  // Clean up: fully hide exited panels
  for (const [panel, element] of Object.entries(panelElements)) {
    if (panel !== target && element) {
      element.dataset.panelState = "inactive";
      element.hidden = true;
      delete element.dataset.panelDirection;
    }
  }

  getFocusTargetForPanel(target)?.focus();
  themePanelTransitionToken = 0;
}

function cancelPalette() {
  if (paletteSnapshot) {
    themeRef = paletteSnapshot.themeRef;
    themeOverrides = paletteSnapshot.themeOverrides;
    paletteSnapshot = null;
    updateUi();
  }
  setActivePanel("theme-list");
}

function setThemeStatus(message: string) {
  themeStatusMessage = message;
  if (themeStatusNode) {
    themeStatusNode.textContent = message;
  }
}

function clearThemeOverrides(options?: { message?: string }) {
  themeOverrides = emptyThemeOverrides();
  themeRef = null;
  setThemeRefValue(null);
  setThemeStatus(
    options?.message ??
      "Pick a seed theme, then adjust tokens in light and dark modes.",
  );
}

function getThemeModeOverrides(mode: ThemeMode) {
  return themeOverrides[mode] ?? {};
}

function setThemeTokenValue(
  config: CreateConfig,
  mode: ThemeMode,
  token: string,
  value: string,
) {
  const baseline = getBaselineThemeStyles(config);
  const overrides = normalizeThemeOverrides(themeOverrides);
  const nextValue = normalizeThemeTokenValue(token, value);
  const baselineValue = normalizeThemeTokenValue(
    token,
    baseline[mode][token as keyof typeof baseline.light] ?? "",
  );

  if (!nextValue || nextValue === baselineValue) {
    delete overrides[mode][token as keyof typeof overrides.light];
  } else {
    overrides[mode][token as keyof typeof overrides.light] = nextValue;
  }

  themeOverrides = overrides;
  if (!hasThemeOverrides(themeOverrides)) {
    themeRef = null;
    setThemeRefValue(null);
    setThemeStatus("Theme matches the selected seed.");
  } else {
    setThemeStatus("Saving custom theme...");
  }
}

async function syncThemeRef(config: CreateConfig) {
  window.clearTimeout(themeSyncTimer);

  if (!hasThemeOverrides(themeOverrides)) {
    themeRef = null;
    setThemeRefValue(null);
    updateUi();
    return;
  }

  const nextThemeRef = themeRef ?? createCustomThemeRef();
  const now = new Date().toISOString();
  const response = await fetch("/api/themes/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "save",
      theme: {
        id: nextThemeRef,
        name: createThemeName(config),
        styles: {
          light: getThemeModeOverrides("light"),
          dark: getThemeModeOverrides("dark"),
        },
        createdAt: now,
        modifiedAt: now,
      },
    }),
  });

  if (!response.ok) {
    themeRef = null;
    setThemeRefValue(null);
    setThemeStatus("Theme saved locally only. Server sync is unavailable.");
    updateUi();
    return;
  }

  themeRef = nextThemeRef;
  setThemeRefValue(themeRef);
  setThemeStatus("Custom theme saved.");
  updateUi();
}

function scheduleThemeSync(config: CreateConfig) {
  window.clearTimeout(themeSyncTimer);
  themeSyncTimer = window.setTimeout(() => {
    void syncThemeRef(config);
  }, 280);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function flashButtonLabel(
  button: HTMLButtonElement | null,
  labelNode: HTMLElement | null,
  copiedLabel: string,
) {
  if (!button || !labelNode) {
    return;
  }

  const idleLabel = button.dataset.idleLabel ?? labelNode.textContent ?? "";
  labelNode.textContent = copiedLabel;

  window.setTimeout(() => {
    labelNode.textContent = button.dataset.idleLabel ?? idleLabel;
  }, 1400);
}

function getStoredCreateProjectPackageManager(): CreateProjectPackageManager {
  try {
    const value = window.localStorage.getItem(
      CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY,
    );

    if (
      value &&
      CREATE_PROJECT_PACKAGE_MANAGERS.includes(
        value as CreateProjectPackageManager,
      )
    ) {
      return value as CreateProjectPackageManager;
    }
  } catch {
    // Ignore storage access failures.
  }

  return "bun";
}

function setStoredCreateProjectPackageManager(
  packageManager: CreateProjectPackageManager,
) {
  try {
    window.localStorage.setItem(
      CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY,
      packageManager,
    );
  } catch {
    // Ignore storage access failures.
  }
}

function getSelectedCreateProjectPackageManager(): CreateProjectPackageManager {
  const value = createProjectPackageManagerInput?.value;

  if (
    value &&
    CREATE_PROJECT_PACKAGE_MANAGERS.includes(
      value as CreateProjectPackageManager,
    )
  ) {
    return value as CreateProjectPackageManager;
  }

  return "bun";
}

function getCreateProjectSwitchChecked(field: HTMLElement | null) {
  return (
    field?.hasAttribute("data-checked") ||
    field?.getAttribute("aria-checked") === "true"
  );
}

function setCreateProjectSwitchChecked(
  field: HTMLElement | null,
  checked: boolean,
) {
  if (!field || getCreateProjectSwitchChecked(field) === checked) {
    return;
  }

  field.dispatchEvent(
    new CustomEvent("switch:set", {
      detail: {
        checked,
      },
    }),
  );
}

function setSelectedCreateProjectPackageManager(
  packageManager: CreateProjectPackageManager,
  options: { persist?: boolean; syncTabs?: boolean } = {},
) {
  if (createProjectPackageManagerInput) {
    createProjectPackageManagerInput.value = packageManager;
  }

  if (options.syncTabs ?? true) {
    createProjectPackageTabs?.dispatchEvent(
      new CustomEvent("tabs:set", {
        detail: {
          value: packageManager,
        },
      }),
    );
  }

  if (options.persist ?? true) {
    setStoredCreateProjectPackageManager(packageManager);
  }
}

function getCreateProjectTemplate() {
  return getCreateProjectTemplateValue({
    monorepo: getCreateProjectSwitchChecked(createProjectMonorepoField),
    withDocs: false,
  });
}

function syncCreateProjectCommands(config: CreateConfig, preset: string) {
  const template = getCreateProjectTemplate();

  for (const packageManager of CREATE_PROJECT_PACKAGE_MANAGERS) {
    const command = buildCreateProjectCommand({
      packageManager,
      template,
      preset,
      themeRef,
    });

    const node = createProjectCommandNodes[packageManager];
    if (node) {
      node.textContent = command;
    }
  }

  if (createProjectCopyCommandButton) {
    const activePackageManager = getSelectedCreateProjectPackageManager();
    createProjectCopyCommandButton.dataset.copyText =
      createProjectCommandNodes[activePackageManager]?.textContent ?? "";
    createProjectCopyCommandButton.dataset.idleLabel = "Copy Command";
  }

  if (createProjectCopyCommandLabel) {
    createProjectCopyCommandLabel.textContent = "Copy Command";
  }
}

async function handleCopyPreset() {
  if (!presetButton) {
    return;
  }

  const text = presetButton.dataset.copyText ?? "";
  if (!text) {
    return;
  }

  const didCopy = await copyText(text);
  if (didCopy) {
    flashButtonLabel(presetButton, presetCodeNode, "Copied");
  }
}

async function handleCopyCreateProjectCommand() {
  if (!createProjectCopyCommandButton) {
    return;
  }

  const text = createProjectCopyCommandButton.dataset.copyText ?? "";
  if (!text) {
    return;
  }

  const didCopy = await copyText(text);
  if (didCopy) {
    flashButtonLabel(
      createProjectCopyCommandButton,
      createProjectCopyCommandLabel,
      "Copied",
    );
  }
}

function applyConfig(
  config: CreateConfig,
  options: { clearCustomTheme?: boolean } = {},
) {
  for (const name of PICKER_NAMES) {
    setInputValue(name, config[name], false);
  }

  setInputValue("theme", config.theme, false);

  if (options.clearCustomTheme) {
    clearThemeOverrides();
  }

  updateUi();
}

function updateUi(
  options: {
    history?: HistoryMode;
    previewTarget?: string | null;
    forceIframeReload?: boolean;
  } = {},
) {
  if (options.previewTarget !== undefined) {
    currentPreviewTarget = options.previewTarget;
  }

  const config = collectConfig();
  config.theme = syncThemeSelection(config) as CreateConfig["theme"];
  for (const name of PICKER_NAMES) {
    setInputValue(name, config[name], false);
  }
  setInputValue("theme", config.theme, false);
  syncRadiusPicker(config);
  syncFontHeadingPicker(config);
  syncThemeTabs();
  syncThemeInputs(config);
  syncThemeTrigger(config);

  for (const name of PICKER_NAMES) {
    syncPickerUi(name, config[name], config);
  }

  const preset = getCurrentPreset(config);
  const params = new URLSearchParams({
    preset,
  });

  if (themeRef) {
    params.set("themeRef", themeRef);
  }

  if (currentPreviewTarget) {
    const currentPreviewItem = getKitchenSinkCreateItemId(currentPreviewTarget);
    if (currentPreviewItem) {
      params.set("item", currentPreviewItem);
    }
  }

  presetCodeNode.textContent = `--preset ${preset}`;

  if (presetButton) {
    presetButton.dataset.copyText = `--preset ${preset}`;
    presetButton.dataset.idleLabel = `--preset ${preset}`;
  }

  syncCreateProjectCommands(config, preset);

  setStoredPreset(preset, undefined, undefined, themeRef);

  window.history[options.history === "push" ? "pushState" : "replaceState"](
    {},
    "",
    `/create?${params.toString()}`,
  );

  if (themeStyleNode) {
    themeStyleNode.textContent = buildDesignSystemThemeCss(
      config,
      themeOverrides,
    );
  }

  if (styleStyleNode) {
    styleStyleNode.textContent =
      window.__BEJAMAS_CREATE__?.styleCssByStyle?.[config.style] ?? "";
  }

  applyCreateDocsRootState(docsRoot, config.style);

  const nextPreviewUrl = buildCreatePreviewUrl(config, preset, {
    previewTarget: currentPreviewTarget,
    themeRef,
  });
  const nextPreviewKey = currentPreviewTarget ?? CREATE_PREVIEW_DEFAULT_KEY;
  const shouldReloadIframe =
    options.forceIframeReload ||
    previewFrame.dataset.previewKey !== nextPreviewKey;

  if (shouldReloadIframe) {
    previewFrame.dataset.previewKey = nextPreviewKey;
    previewFrame.setAttribute("src", nextPreviewUrl);
    syncNavigateDialogSelection();
    return;
  }

  const message: PreviewMessage = {
    type: "bejamas:create-preview",
    config,
    themeRef,
    themeOverrides,
  };

  previewFrame.contentWindow?.postMessage(message, window.location.origin);
  syncNavigateDialogSelection();
}

function handleThemeImport() {
  themeImportDialogTrigger?.click();
}

function handleThemeImportConfirm(event?: Event) {
  event?.preventDefault();
  event?.stopPropagation();

  const config = collectConfig();
  const css = themeImportTextarea?.value?.trim() ?? "";
  if (!css) {
    setThemeStatus("Paste CSS variables to import a custom theme.");
    return;
  }

  const parsed = parseCssVariables(css);
  const baseline = getBaselineThemeStyles(config);
  const overrides = normalizeThemeOverrides(themeOverrides);

  (["light", "dark"] as const).forEach((mode) => {
    Object.entries(parsed[mode]).forEach(([token, value]) => {
      const baselineValue =
        baseline[mode][token as keyof typeof baseline.light] ?? "";
      if (!value || value === baselineValue) {
        delete overrides[mode][token as keyof typeof overrides.light];
      } else {
        overrides[mode][token as keyof typeof overrides.light] = value;
      }
    });
  });

  themeOverrides = overrides;
  if (!hasThemeOverrides(themeOverrides)) {
    themeRef = null;
    setThemeRefValue(null);
    setThemeStatus("Imported theme matches the selected seed.");
  } else {
    setThemeStatus("Imported theme. Saving custom theme...");
  }

  const closeButton = document.querySelector(
    "#import-dialog [data-slot='dialog-close']",
  ) as HTMLElement | null;
  closeButton?.click();

  updateUi();
  scheduleThemeSync(config);
}

function handleThemeSeedSelect(value: string) {
  setInputValue("theme", value, false);
  clearThemeOverrides({
    message: "Seed theme selected. Edit tokens below to customize it.",
  });
  updateUi();
}

function handleRandomize() {
  const currentConfig = collectConfig();
  const preserveCustomTheme = isParamLocked("theme");

  applyConfig(
    createRandomDesignSystemConfig(currentConfig, {
      locked: lockedParams,
      lockedFontGroup: isParamLocked("font") ? null : lockedFontGroup,
      hasCustomTheme:
        preserveCustomTheme &&
        (themeRef !== null || hasThemeOverrides(themeOverrides)),
    }),
    {
      clearCustomTheme: !preserveCustomTheme,
    },
  );

  void incrementShuffleCountRequest();
}

for (const name of PICKER_NAMES) {
  const picker = getPicker(name);
  picker?.addEventListener("dropdown-menu:select", (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;

    if (name === "baseColor") {
      clearThemeOverrides({
        message: "Base color changed. Pick a seed theme or edit tokens below.",
      });
    }

    setInputValue(name, value);
  });
}

headerNavigateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setNavigateDialogOpen(true);
  });
});

headerShuffleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleRandomize();
  });
});

headerSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setNavigateDialogOpen(true);
  });
});

navigateDialog?.addEventListener("dialog:change", (event) => {
  const open = (event as CustomEvent<{ open: boolean }>).detail.open;

  if (open) {
    syncNavigateDialogSelection();
    window.requestAnimationFrame(() => {
      navigateInput?.focus();
      navigateInput?.select();
    });
    return;
  }

  syncNavigateDialogSelection();
});

navigateCommand?.addEventListener("command:select", (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;

  if (value === CREATE_PREVIEW_COMMAND_VALUE) {
    selectNavigatePreviewTarget(null);
    return;
  }

  const previewTarget = resolveCreatePreviewTarget(
    new URLSearchParams({ item: value }),
  );
  if (!previewTarget) {
    return;
  }

  selectNavigatePreviewTarget(previewTarget);
});

createProjectDialog?.addEventListener("dialog:change", (event) => {
  const open = (event as CustomEvent<{ open: boolean }>).detail.open;
  if (!open) {
    return;
  }

  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

presetButton?.addEventListener("click", () => {
  void handleCopyPreset();
});

randomizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleRandomize();
  });
});

document
  .querySelectorAll<HTMLButtonElement>("[data-create-lock-button]")
  .forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const param = button.dataset.createLockParam;
      if (!param || !hasCreateLockableParam(param)) {
        return;
      }

      toggleLockedParam(param);
    });
  });

document
  .querySelectorAll<HTMLButtonElement>("[data-create-font-group-lock-button]")
  .forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const group = button.dataset.createFontGroup;
      if (!group || !isCreateFontGroup(group)) {
        return;
      }

      toggleLockedFontGroup(group);
    });
  });

themeTrigger?.addEventListener("click", () => {
  setActivePanel("theme-list");
});

themeListBackButton?.addEventListener("click", () => {
  setActivePanel("main");
});

paletteBackButton?.addEventListener("click", () => {
  cancelPalette();
});

paletteCancelButton?.addEventListener("click", () => {
  cancelPalette();
});

paletteSaveButton?.addEventListener("click", () => {
  paletteSnapshot = null;
  setActivePanel("theme-list");
});

themeTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = (button.dataset.value as ThemeMode) ?? "light";
    setGlobalThemeChoice(nextMode, {
      root: docsRoot,
      syncPickers: (themeChoice) =>
        window.StarlightThemeProvider?.updatePickers?.(themeChoice),
      dispatchChange: (effectiveTheme, themeChoice) => {
        window.dispatchEvent(
          new CustomEvent("theme-toggle-changed", {
            detail: { theme: effectiveTheme, themeChoice },
          }),
        );
      },
    });
  });
});

themeSeedContainer?.addEventListener("click", (event) => {
  const gear = (event.target as HTMLElement).closest(
    "[data-create-palette-open]",
  );
  if (gear) {
    event.stopPropagation();
    const value = (gear as HTMLElement).dataset.value;
    if (value) handleThemeSeedSelect(value);
    paletteSnapshot = {
      themeRef,
      themeOverrides: structuredClone(themeOverrides),
    };
    syncPaletteHeader();
    syncThemeTabs();
    syncThemeInputs(collectConfig());
    setActivePanel("palette-editor");
    return;
  }

  const button = (event.target as HTMLElement).closest(
    "[data-create-theme-option]",
  ) as HTMLButtonElement | null;

  if (!button?.dataset.value) {
    return;
  }

  handleThemeSeedSelect(button.dataset.value);
});

themeImportButton?.addEventListener("click", handleThemeImport);
themeImportConfirmButton?.addEventListener("click", handleThemeImportConfirm);

createProjectPackageTabs?.addEventListener("tabs:change", (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;

  if (
    !CREATE_PROJECT_PACKAGE_MANAGERS.includes(
      value as CreateProjectPackageManager,
    )
  ) {
    return;
  }

  setSelectedCreateProjectPackageManager(value as CreateProjectPackageManager, {
    persist: true,
    syncTabs: false,
  });

  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectMonorepoField?.addEventListener("switch:change", (event) => {
  const monorepo = (event as CustomEvent<{ checked: boolean }>).detail.checked;
  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectCopyCommandButton?.addEventListener("click", () => {
  void handleCopyCreateProjectCommand();
});

palettePanel?.addEventListener("color-change", (event) => {
  const target = event.target as ColorInputElement | null;
  if (!target) {
    return;
  }

  const detail = (event as CustomEvent<{ token: string; value: string }>)
    .detail;
  const mode = target.dataset.createThemeMode;
  if (!mode || !detail?.token) {
    return;
  }

  const config = collectConfig();
  setThemeTokenValue(config, mode, detail.token, detail.value);
  updateUi();
  scheduleThemeSync(config);
});

createForm.addEventListener("submit", (event) => {
  event.preventDefault();
});
createForm.addEventListener("change", updateUi);
previewFrame.addEventListener("load", updateUi);
window.addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.shiftKey ||
    !(event.metaKey || event.ctrlKey) ||
    event.key.toLowerCase() !== "p" ||
    isEditableTarget(event.target)
  ) {
    return;
  }

  event.preventDefault();
  setNavigateDialogOpen(true);
});
window.addEventListener(
  "message",
  (event: MessageEvent<PreviewShortcutMessage>) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== previewFrame.contentWindow ||
      event.data?.type !== "bejamas:create-navigate-open"
    ) {
      return;
    }

    setNavigateDialogOpen(true);
  },
);
window.addEventListener("popstate", () => {
  const searchParams = new URLSearchParams(window.location.search);
  currentPreviewTarget = resolveCreatePreviewTarget(searchParams);

  const result = parseCreateSearchParams(searchParams);
  if (result.success) {
    updateUi({
      previewTarget: currentPreviewTarget,
      forceIframeReload: true,
    });
  }
});
window.addEventListener("pagehide", () => {
  cleanupCreateDocsRootState(docsRoot);
});
window.addEventListener("theme-toggle-changed", () => {
  syncActiveThemeMode();
});
document.addEventListener("astro:before-swap", () => {
  cleanupCreateDocsRootState(docsRoot);
});

if (!themeStatusMessage) {
  setThemeStatus(
    themeRef
      ? "Custom theme loaded. Edit tokens or import CSS to update it."
      : "Pick a seed theme, then adjust tokens in light and dark modes.",
  );
}

setSelectedCreateProjectPackageManager(getStoredCreateProjectPackageManager(), {
  persist: false,
});
syncLockButtons();
syncFontGroupLockButtons();
syncActiveThemeMode();
applyPanelStateImmediately("main");
updateUi();
