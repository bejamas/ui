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
  "font",
  "radius",
  "menuColor",
  "menuAccent",
  "rtlLanguage",
] satisfies CreatePickerName[];

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
const mainMenu = document.querySelector(
  "[data-create-main-menu]",
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
) as HTMLInputElement | null;
const createProjectDocsField = document.querySelector(
  "[data-create-project-docs]",
) as HTMLInputElement | null;
const createProjectRtlField = document.querySelector(
  "[data-create-project-rtl]",
) as HTMLInputElement | null;
const createProjectRtlLanguageRow = document.querySelector(
  "[data-create-project-rtl-language-row]",
) as HTMLElement | null;
const createProjectRtlLanguageSeparator = document.querySelector(
  "[data-create-project-rtl-language-separator]",
) as HTMLElement | null;
const createProjectRtlLanguageSelect = document.querySelector(
  "[data-create-project-rtl-language-select]",
) as HTMLElement | null;
const themeStyleNode = document.getElementById("create-page-theme-css");
const styleStyleNode = document.getElementById("create-page-style-css");
const docsRoot = document.documentElement;
const themeMainPanel = document.querySelector(
  "[data-create-form-main]",
) as HTMLElement | null;
const themeEditorPanel = document.querySelector(
  "[data-create-theme-panel]",
) as HTMLElement | null;
const themeTrigger = document.querySelector(
  "[data-create-theme-trigger]",
) as HTMLButtonElement | null;
const themeBackButton = document.querySelector(
  "[data-create-theme-back]",
) as HTMLButtonElement | null;
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
const rtlLanguagePicker = document.querySelector(
  "[data-create-rtl-language]",
) as HTMLElement | null;

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
let currentPreviewTarget = resolveCreatePreviewTarget(
  new URLSearchParams(window.location.search),
);
let themePanelOpen = false;
let themePanelTransitionToken = 0;
const lockedParams = new Set<CreateLockableParam>();
let lockedFontGroup: CreateFontGroup | null = null;

const CREATE_PREVIEW_DEFAULT_KEY = CREATE_PREVIEW_COMMAND_VALUE;
const THEME_PANEL_EXIT_DURATION = 80;
const THEME_PANEL_ENTER_DURATION = 100;

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
    iconLibrary: String(
      formData.get("iconLibrary"),
    ) as CreateConfig["iconLibrary"],
    radius: String(formData.get("radius")) as CreateConfig["radius"],
    menuAccent: String(
      formData.get("menuAccent"),
    ) as CreateConfig["menuAccent"],
    menuColor: String(formData.get("menuColor")) as CreateConfig["menuColor"],
    template: DEFAULT_DESIGN_SYSTEM_CONFIG.template,
    rtl: formData.get("rtl") === "on",
    rtlLanguage: String(
      formData.get("rtlLanguage") ?? DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage,
    ) as CreateConfig["rtlLanguage"],
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
          class="cn-dropdown-menu-item group/dropdown-menu-item relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 create-picker-item !gap-2.5 !rounded-[12px] !px-3 !py-2 !text-[14px] !font-medium !text-white/86 data-[highlighted]:!bg-white/[0.06] data-[highlighted]:!text-white/92"
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

function setCheckboxValue(
  name: string,
  checked: boolean,
  shouldDispatch = true,
) {
  const field = getField(name);
  if (!field || field.checked === checked) {
    return;
  }

  field.checked = checked;

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
  const {
    template: _template,
    rtl: _rtl,
    rtlLanguage: _rtlLanguage,
    ...presetConfig
  } = config;

  return encodePreset(presetConfig as Parameters<typeof encodePreset>[0]);
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
        <section class="space-y-2" data-create-theme-group="${escapeHtml(option.group)}">
          <header class="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">${escapeHtml(option.label)}</header>
          <div class="grid grid-cols-2 gap-2 rounded-[18px] border border-white/8 bg-white/[0.02] p-2">
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
      class="flex items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left transition-colors ${selected ? "border-white/16 bg-white/[0.08] text-white" : "border-white/0 bg-white/[0.02] text-white/78 hover:bg-white/[0.05]"}"
      data-create-theme-option
      data-value="${escapeHtml(option.value)}"
      ${selected ? 'data-selected=""' : ""}
    >
      <span class="inline-flex size-4 shrink-0 rounded-full border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" style="background:${escapeHtml(option.color)};"></span>
      <span class="truncate text-[13px] font-medium tracking-[-0.01em]">${escapeHtml(option.label)}</span>
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

function applyThemePanelStateImmediately(open: boolean) {
  themePanelOpen = open;
  setThemePanelElementState(themeMainPanel, open ? "inactive" : "active", open);
  setThemePanelElementState(
    themeEditorPanel,
    open ? "active" : "inactive",
    !open,
  );
}

async function setThemePanelOpen(open: boolean) {
  if (!themeMainPanel || !themeEditorPanel) {
    themePanelOpen = open;
    return;
  }

  if (themePanelOpen === open && themePanelTransitionToken === 0) {
    return;
  }

  const transitionToken = ++themePanelTransitionToken;

  if (prefersReducedThemePanelMotion()) {
    applyThemePanelStateImmediately(open);
    themePanelTransitionToken = 0;
    if (open) {
      themeBackButton?.focus();
    } else {
      themeTrigger?.focus();
    }
    return;
  }

  if (open) {
    themePanelOpen = true;
    setThemePanelElementState(themeEditorPanel, "inactive", true);
    setThemePanelElementState(themeMainPanel, "exiting", false);
    await waitForThemePanelTransition(THEME_PANEL_EXIT_DURATION);
    if (transitionToken !== themePanelTransitionToken) {
      return;
    }

    setThemePanelElementState(themeMainPanel, "inactive", true);
    setThemePanelElementState(themeEditorPanel, "entering", false);
    await waitForThemePanelFrame();
    if (transitionToken !== themePanelTransitionToken) {
      return;
    }

    setThemePanelElementState(themeEditorPanel, "active", false);
    await waitForThemePanelTransition(THEME_PANEL_ENTER_DURATION);
    if (transitionToken !== themePanelTransitionToken) {
      return;
    }

    themeBackButton?.focus();
    themePanelTransitionToken = 0;
    return;
  }

  themePanelOpen = false;
  setThemePanelElementState(themeMainPanel, "inactive", true);
  setThemePanelElementState(themeEditorPanel, "exiting", false);
  await waitForThemePanelTransition(THEME_PANEL_EXIT_DURATION);
  if (transitionToken !== themePanelTransitionToken) {
    return;
  }

  setThemePanelElementState(themeEditorPanel, "inactive", true);
  setThemePanelElementState(themeMainPanel, "entering", false);
  await waitForThemePanelFrame();
  if (transitionToken !== themePanelTransitionToken) {
    return;
  }

  setThemePanelElementState(themeMainPanel, "active", false);
  await waitForThemePanelTransition(THEME_PANEL_ENTER_DURATION);
  if (transitionToken !== themePanelTransitionToken) {
    return;
  }

  themeTrigger?.focus();
  themePanelTransitionToken = 0;
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
    monorepo: createProjectMonorepoField?.checked ?? false,
    withDocs: createProjectDocsField?.checked ?? false,
  });
}

function getCreateProjectDialogRtlSettings() {
  return {
    rtl: createProjectRtlField?.checked ?? false,
    rtlLanguage:
      (createProjectRtlLanguageSelect?.dataset.value as
        | CreateConfig["rtlLanguage"]
        | undefined) ?? DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage,
  };
}

function syncCreateProjectRtlControls(options: {
  rtl: boolean;
  rtlLanguage: CreateConfig["rtlLanguage"];
}) {
  if (createProjectRtlField) {
    createProjectRtlField.checked = options.rtl;
  }

  createProjectRtlLanguageRow?.classList.toggle("hidden", !options.rtl);
  createProjectRtlLanguageSeparator?.classList.toggle("hidden", !options.rtl);

  if (createProjectRtlLanguageSelect?.dataset.value !== options.rtlLanguage) {
    createProjectRtlLanguageSelect?.dispatchEvent(
      new CustomEvent("select:set", {
        detail: {
          value: options.rtlLanguage,
        },
      }),
    );
  }
}

function syncCreateProjectCommands(config: CreateConfig, preset: string) {
  const dialogRtlSettings = getCreateProjectDialogRtlSettings();
  const template = getCreateProjectTemplate();

  for (const packageManager of CREATE_PROJECT_PACKAGE_MANAGERS) {
    const command = buildCreateProjectCommand({
      packageManager,
      template,
      preset,
      themeRef,
      rtl: dialogRtlSettings.rtl,
      rtlLanguage: dialogRtlSettings.rtlLanguage,
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
  setCheckboxValue("rtl", config.rtl, false);

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
  rtlLanguagePicker?.classList.toggle("hidden", !config.rtl);
  config.theme = syncThemeSelection(config) as CreateConfig["theme"];
  for (const name of PICKER_NAMES) {
    setInputValue(name, config[name], false);
  }
  setInputValue("theme", config.theme, false);
  setCheckboxValue("rtl", config.rtl, false);
  syncRadiusPicker(config);
  syncThemeTabs();
  syncThemeInputs(config);
  syncThemeTrigger(config);

  for (const name of PICKER_NAMES) {
    syncPickerUi(name, config[name], config);
  }

  const { rtl, rtlLanguage } = config;
  const preset = getCurrentPreset(config);
  const params = new URLSearchParams({
    preset,
  });

  if (rtl) {
    params.set("rtl", "true");
    params.set("lang", rtlLanguage);
  }

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

mainMenu?.addEventListener("dropdown-menu:select", (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  const currentConfig = collectConfig();

  if (value === "navigate") {
    setNavigateDialogOpen(true);
    return;
  }

  if (value === "shuffle") {
    handleRandomize();
    return;
  }

  if (value === "reset") {
    applyConfig(DEFAULT_DESIGN_SYSTEM_CONFIG, {
      clearCustomTheme: true,
    });
    return;
  }

  if (value === "create-project") {
    createProjectDialog?.dispatchEvent(
      new CustomEvent("dialog:set", {
        detail: {
          open: true,
        },
      }),
    );
  }
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
  syncCreateProjectRtlControls({
    rtl: config.rtl,
    rtlLanguage: config.rtlLanguage,
  });
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
  setThemePanelOpen(true);
});

themeBackButton?.addEventListener("click", () => {
  setThemePanelOpen(false);
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

createProjectMonorepoField?.addEventListener("change", () => {
  const monorepo = createProjectMonorepoField.checked;
  const withDocs = monorepo && (createProjectDocsField?.checked ?? false);

  if (!monorepo && createProjectDocsField) {
    createProjectDocsField.checked = false;
  }

  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectDocsField?.addEventListener("change", () => {
  const withDocs = createProjectDocsField.checked;

  if (withDocs && createProjectMonorepoField) {
    createProjectMonorepoField.checked = true;
  }

  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectRtlField?.addEventListener("change", () => {
  syncCreateProjectRtlControls({
    rtl: createProjectRtlField.checked,
    rtlLanguage: getCreateProjectDialogRtlSettings().rtlLanguage,
  });
  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectRtlLanguageSelect?.addEventListener("select:change", (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  if (!value) {
    return;
  }

  syncCreateProjectRtlControls({
    rtl: createProjectRtlField?.checked ?? false,
    rtlLanguage: value as CreateConfig["rtlLanguage"],
  });
  const config = collectConfig();
  syncCreateProjectCommands(config, getCurrentPreset(config));
});

createProjectCopyCommandButton?.addEventListener("click", () => {
  void handleCopyCreateProjectCommand();
});

themeEditorPanel?.addEventListener("color-change", (event) => {
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
setThemePanelOpen(false);
updateUi();
