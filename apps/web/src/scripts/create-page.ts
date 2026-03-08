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
import { buildDesignSystemThemeCss } from "@/utils/themes/design-system-adapter";
import { setStoredPreset } from "@/utils/themes/preset-store";
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

declare global {
  interface Window {
    __BEJAMAS_CREATE__?: {
      styleCssByStyle: Record<string, string>;
    };
  }
}

const PICKER_NAMES = [
  "style",
  "baseColor",
  "theme",
  "iconLibrary",
  "font",
  "radius",
  "menuColor",
  "menuAccent",
  "template",
] satisfies CreatePickerName[];

const form = document.querySelector("[data-create-form]") as HTMLFormElement | null;
const iframe = document.querySelector("[data-preview-frame]") as HTMLIFrameElement | null;
const presetNode = document.querySelector("[data-preset-code]") as HTMLElement | null;
const commandNode = document.querySelector("[data-command]") as HTMLElement | null;
const presetButton = document.querySelector("[data-create-copy-preset]") as HTMLButtonElement | null;
const commandButton = document.querySelector("[data-create-copy-command]") as HTMLButtonElement | null;
const randomizeButtons = Array.from(
  document.querySelectorAll("[data-create-randomize]"),
) as HTMLButtonElement[];
const mainMenu = document.querySelector("[data-create-main-menu]") as HTMLElement | null;
const themeStyleNode = document.getElementById("create-page-theme-css");
const styleStyleNode = document.getElementById("create-page-style-css");
const docsRoot = document.documentElement;

if (!form || !iframe || !presetNode || !commandNode) {
  throw new Error("Create page is missing required form elements.");
}

const createForm = form;
const previewFrame = iframe;
const presetCodeNode = presetNode;
const commandCodeNode = commandNode;

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
    iconLibrary: String(formData.get("iconLibrary")) as CreateConfig["iconLibrary"],
    radius: String(formData.get("radius")) as CreateConfig["radius"],
    menuAccent: String(formData.get("menuAccent")) as CreateConfig["menuAccent"],
    menuColor: String(formData.get("menuColor")) as CreateConfig["menuColor"],
    template: String(formData.get("template")) as CreateConfig["template"],
    rtl: formData.get("rtl") === "on",
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
    const startClass = option.value === "inverted" ? "bg-neutral-950" : "bg-neutral-100";
    const endClass = option.value === "inverted" ? "bg-neutral-100" : "bg-neutral-950";
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex h-4 w-5 shrink-0 overflow-hidden rounded-[6px] border border-white/18 bg-white/5"><span class="block h-full w-1/2 ${startClass}"></span><span class="block h-full w-1/2 ${endClass}"></span></span>`;
  }

  if (kind === "menu-accent") {
    const innerClass =
      option.value === "bold" ? "w-full bg-white/90" : "w-2 bg-white/55";
    return `<span data-create-picker-marker aria-hidden="true" class="inline-flex h-4 w-5 shrink-0 items-center rounded-full border border-white/18 px-0.5"><span class="block h-2.5 rounded-full transition-all ${innerClass}"></span></span>`;
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

function syncThemePicker(config: CreateConfig) {
  const itemsContainer = getPickerContent("theme")?.querySelector(
    "[data-create-picker-items]",
  ) as HTMLElement | null;
  const themeOptions = getCreatePickerOptionsByName("theme", {
    baseColor: config.baseColor,
    style: config.style,
  });
  const nextTheme =
    themeOptions.find((option) => option.value === config.theme)?.value ??
    themeOptions[0]?.value ??
    config.theme;

  if (itemsContainer) {
    itemsContainer.innerHTML = renderPickerItems("theme", themeOptions, nextTheme);
  }

  setInputValue("theme", nextTheme, false);
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
    itemsContainer.innerHTML = renderPickerItems("radius", radiusOptions, config.radius);
  }
}

function syncPickerUi(name: CreatePickerName, value: string, config: CreateConfig) {
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
    if (selectedOption) {
      labelNode.textContent = selectedOption.label;
    } else {
      labelNode.textContent = value;
    }
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

function applyConfig(config: CreateConfig) {
  for (const name of PICKER_NAMES) {
    setInputValue(name, config[name], false);
  }

  const rtlField = getField("rtl");
  if (rtlField) {
    rtlField.checked = config.rtl;
  }

  updateUi();
}

function updateUi() {
  const config = collectConfig();
  config.theme = syncThemePicker(config) as CreateConfig["theme"];
  syncRadiusPicker(config);

  for (const name of PICKER_NAMES) {
    syncPickerUi(name, config[name], config);
  }

  const { template, rtl, ...presetConfig } = config;
  const preset = encodePreset(
    presetConfig as Parameters<typeof encodePreset>[0],
  );
  const params = new URLSearchParams({
    preset,
    template,
  });

  if (rtl) {
    params.set("rtl", "true");
  }

  const command = [
    "bunx bejamas init",
    `--template ${template}`,
    `--preset ${preset}`,
    rtl ? "--rtl" : "",
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

  setStoredPreset(preset);

  window.history.replaceState({}, "", `/create?${params.toString()}`);

  if (themeStyleNode) {
    themeStyleNode.textContent = buildDesignSystemThemeCss(config);
  }

  if (styleStyleNode) {
    styleStyleNode.textContent =
      window.__BEJAMAS_CREATE__?.styleCssByStyle?.[config.style] ?? "";
  }

  applyCreateDocsRootState(docsRoot, config.style);

  previewFrame.contentWindow?.postMessage(
    {
      type: "bejamas:create-preview",
      config,
    },
    window.location.origin,
  );
}

for (const name of PICKER_NAMES) {
  const picker = getPicker(name);
  picker?.addEventListener("dropdown-menu:select", (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    setInputValue(name, value);
  });
}

mainMenu?.addEventListener("dropdown-menu:select", (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  const currentConfig = collectConfig();

  if (value === "shuffle") {
    applyConfig(createRandomDesignSystemConfig(currentConfig));
    return;
  }

  if (value === "reset") {
    applyConfig(DEFAULT_DESIGN_SYSTEM_CONFIG);
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
    applyConfig(createRandomDesignSystemConfig(collectConfig()));
  });
});

createForm.addEventListener("change", updateUi);
previewFrame.addEventListener("load", updateUi);
window.addEventListener("pagehide", () => {
  cleanupCreateDocsRootState(docsRoot);
});
document.addEventListener("astro:before-swap", () => {
  cleanupCreateDocsRootState(docsRoot);
});
updateUi();
