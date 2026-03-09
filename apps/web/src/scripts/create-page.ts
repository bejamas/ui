import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  encodePreset,
  getRadiusValue,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import {
  applyCreateDocsRootState,
  cleanupCreateDocsRootState,
} from "@/utils/create-docs-shell";
import {
  buildDesignSystemThemeCss,
  resolveDesignSystemTheme,
} from "@/utils/themes/design-system-adapter";
import { setStoredPreset } from "@/utils/themes/preset-store";
import {
  createCustomThemeRef,
  createThemeName,
  emptyThemeOverrides,
  getCreateThemeSeedOptions,
  hasThemeOverrides,
  normalizeThemeOverrides,
  type ThemeMode,
  type ThemeOverrides,
} from "@/utils/themes/create-theme";
import { parseCssVariables } from "@/components/theme-editor/utils/themeEditorUtils";
import {
  CREATE_PICKER_MARKERS,
  createRandomDesignSystemConfig,
  getCreatePickerOptionsByName,
  getCreatePickerSelectedOption,
  type CreatePickerMarkerKind,
  type CreatePickerName,
  type CreatePickerOption,
} from "@/utils/create-sidebar";

type CreateConfig = DesignSystemConfig;
type PreviewMessage = {
  type: "bejamas:create-preview";
  config: CreateConfig;
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
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
  "template",
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
const commandNode = document.querySelector(
  "[data-command]",
) as HTMLElement | null;
const presetButton = document.querySelector(
  "[data-create-copy-preset]",
) as HTMLButtonElement | null;
const commandButton = document.querySelector(
  "[data-create-copy-command]",
) as HTMLButtonElement | null;
const randomizeButtons = Array.from(
  document.querySelectorAll("[data-create-randomize]"),
) as HTMLButtonElement[];
const mainMenu = document.querySelector(
  "[data-create-main-menu]",
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

if (!form || !iframe || !presetNode || !commandNode) {
  throw new Error("Create page is missing required form elements.");
}

const createForm = form;
const previewFrame = iframe;
const presetCodeNode = presetNode;
const commandCodeNode = commandNode;

let activeThemeMode: ThemeMode = "light";
let themeRef = window.__BEJAMAS_CREATE__?.initialThemeRef ?? null;
let themeOverrides = normalizeThemeOverrides(
  window.__BEJAMAS_CREATE__?.initialThemeOverrides,
);
let themeSyncTimer = 0;
let themeStatusMessage = "";

function getField(name: string) {
  return createForm.elements.namedItem(name) as HTMLInputElement | null;
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

  return {
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
    template: String(formData.get("template")) as CreateConfig["template"],
    rtl: formData.get("rtl") === "on",
    rtlLanguage: String(
      formData.get("rtlLanguage") ?? DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage,
    ) as CreateConfig["rtlLanguage"],
  };
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
    const startClass =
      option.value === "inverted" ? "bg-neutral-950" : "bg-neutral-100";
    const endClass =
      option.value === "inverted" ? "bg-neutral-100" : "bg-neutral-950";
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex h-4 w-5 shrink-0 overflow-hidden rounded-[6px] border border-white/18 bg-white/5"><span class="block h-full w-1/2 ${startClass}"></span><span class="block h-full w-1/2 ${endClass}"></span></span>`;
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

  picker.dataset.value = value;

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
  const selectedTheme = getCreatePickerSelectedOption("theme", config) as
    | CreatePickerOption
    | undefined;
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

  const options = getCreateThemeSeedOptions(baseColor);
  themeSeedContainer.innerHTML = options
    .map((option) => {
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
    })
    .join("");
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

function setThemePanelOpen(open: boolean) {
  themeMainPanel?.classList.toggle("hidden", open);
  themeEditorPanel?.classList.toggle("hidden", !open);
  themeEditorPanel?.classList.toggle("xl:flex", open);
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
  const baselineValue =
    baseline[mode][token as keyof typeof baseline.light] ?? "";

  if (!value || value === baselineValue) {
    delete overrides[mode][token as keyof typeof overrides.light];
  } else {
    overrides[mode][token as keyof typeof overrides.light] = value;
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

async function handleCopyCommand() {
  if (!commandButton) {
    return;
  }

  const text = commandButton.dataset.copyText ?? "";
  if (!text) {
    return;
  }

  const didCopy = await copyText(text);
  if (didCopy) {
    flashButtonLabel(commandButton, commandCodeNode, "Copied");
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

  const rtlField = getField("rtl");
  if (rtlField) {
    rtlField.checked = config.rtl;
  }

  if (options.clearCustomTheme) {
    clearThemeOverrides();
  }

  updateUi();
}

function updateUi() {
  const config = collectConfig();
  rtlLanguagePicker?.classList.toggle("hidden", !config.rtl);
  config.theme = syncThemeSelection(config) as CreateConfig["theme"];
  syncRadiusPicker(config);
  syncThemeTabs();
  syncThemeInputs(config);
  syncThemeTrigger(config);

  for (const name of PICKER_NAMES) {
    syncPickerUi(name, config[name], config);
  }

  const { template, rtl, rtlLanguage, ...presetConfig } = config;
  const preset = encodePreset(
    presetConfig as Parameters<typeof encodePreset>[0],
  );
  const params = new URLSearchParams({
    preset,
    template,
  });

  if (rtl) {
    params.set("rtl", "true");
    params.set("lang", rtlLanguage);
  }

  if (themeRef) {
    params.set("themeRef", themeRef);
  }

  const command = [
    "bunx bejamas init",
    `--template ${template}`,
    `--preset ${preset}`,
    themeRef ? `--theme-ref ${themeRef}` : "",
    rtl ? "--rtl" : "",
    rtl ? `--lang ${rtlLanguage}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  presetCodeNode.textContent = `--preset ${preset}`;
  commandCodeNode.textContent = "Copy command";

  if (presetButton) {
    presetButton.dataset.copyText = `--preset ${preset}`;
    presetButton.dataset.idleLabel = `--preset ${preset}`;
  }

  if (commandButton) {
    commandButton.dataset.copyText = command;
    commandButton.dataset.idleLabel = "Copy command";
    commandButton.title = command;
  }

  setStoredPreset(preset, undefined, undefined, themeRef);

  window.history.replaceState({}, "", `/create?${params.toString()}`);

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

  const message: PreviewMessage = {
    type: "bejamas:create-preview",
    config,
    themeRef,
    themeOverrides,
  };

  previewFrame.contentWindow?.postMessage(message, window.location.origin);
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

  if (value === "shuffle") {
    applyConfig(createRandomDesignSystemConfig(currentConfig), {
      clearCustomTheme: true,
    });
    return;
  }

  if (value === "reset") {
    applyConfig(DEFAULT_DESIGN_SYSTEM_CONFIG, {
      clearCustomTheme: true,
    });
    return;
  }

  if (value === "copy-command") {
    void handleCopyCommand();
  }
});

presetButton?.addEventListener("click", () => {
  void handleCopyPreset();
});

commandButton?.addEventListener("click", () => {
  void handleCopyCommand();
});

randomizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyConfig(createRandomDesignSystemConfig(collectConfig()), {
      clearCustomTheme: true,
    });
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
    activeThemeMode = (button.dataset.value as ThemeMode) ?? "light";
    syncThemeTabs();
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
window.addEventListener("pagehide", () => {
  cleanupCreateDocsRootState(docsRoot);
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

syncThemeTabs();
setThemePanelOpen(false);
updateUi();
