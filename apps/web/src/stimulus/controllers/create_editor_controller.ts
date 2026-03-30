import { Controller } from "@hotwired/stimulus";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  encodePreset,
  normalizeDesignSystemConfig,
} from "@bejamas/create-config/browser";
import {
  buildCreatePreviewUrl,
  CREATE_PREVIEW_COMMAND_VALUE,
  parseCreateSearchParams,
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
} from "@/utils/themes/iframe-theme-sync";
import { normalizeThemeTokenValue } from "@/utils/themes/theme-tokens";
import { setStoredPreset } from "@/utils/themes/preset-store";
import {
  createCustomThemeRef,
  createThemeName,
  emptyThemeOverrides,
  hasThemeOverrides,
  normalizeThemeOverrides,
  type ThemeMode,
  type ThemeOverrides,
} from "@/utils/themes/create-theme";
import { parseCssVariables } from "@/components/theme-editor/utils/themeEditorUtils";
import {
  createRandomDesignSystemConfig,
  getCreatePickerOptionsByName,
  type CreateFontGroup,
  type CreateLockableParam,
  type CreatePickerName,
} from "@/utils/create-sidebar";
import { incrementShuffleCountRequest } from "@/utils/shuffles";
import {
  buildCreateProjectCommand,
  CREATE_PROJECT_PACKAGE_MANAGERS,
  CREATE_PROJECT_PACKAGE_MANAGER_STORAGE_KEY,
  getCreateProjectTemplateValue,
  type CreateProjectPackageManager,
} from "@/utils/create-project-dialog";
import type CreateSidebarController from "@/stimulus/controllers/create_sidebar_controller";
import type CreateProjectDialogController from "@/stimulus/controllers/create_project_dialog_controller";
import type CreateNavigateController from "@/stimulus/controllers/create_navigate_controller";
import type {
  CreateConfig,
  HistoryMode,
  PaletteSnapshot,
  PreviewMessage,
  PreviewShortcutMessage,
} from "@/stimulus/types/create";

type CreatePresetConfig = Omit<CreateConfig, "template" | "rtl" | "rtlLanguage">;

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

const CREATE_PREVIEW_DEFAULT_KEY = CREATE_PREVIEW_COMMAND_VALUE;

export default class extends Controller<HTMLElement> {
  static targets = ["form", "frame"];
  static outlets = ["create-sidebar", "create-project-dialog", "create-navigate"];

  declare readonly formTarget: HTMLFormElement;
  declare readonly frameTarget: HTMLIFrameElement;
  declare readonly hasCreateSidebarOutlet: boolean;
  declare readonly createSidebarOutlet: CreateSidebarController;
  declare readonly hasCreateProjectDialogOutlet: boolean;
  declare readonly createProjectDialogOutlet: CreateProjectDialogController;
  declare readonly hasCreateNavigateOutlet: boolean;
  declare readonly createNavigateOutlet: CreateNavigateController;

  private activeThemeMode: ThemeMode = "light";
  private themeRef: string | null = null;
  private themeOverrides: ThemeOverrides = emptyThemeOverrides();
  private themeSyncTimer = 0;
  private themeStatusMessage = "";
  private currentPreviewTarget: string | null = null;
  private paletteSnapshot: PaletteSnapshot = null;
  private lockedParams = new Set<CreateLockableParam>();
  private lockedFontGroup: CreateFontGroup | null = null;
  private preservedPreset: {
    code: string;
    config: CreatePresetConfig;
  } | null = null;

  connect() {
    if (!this.formTarget || !this.frameTarget) {
      throw new Error("Create page is missing required form elements.");
    }

    const initialSearchParams = new URLSearchParams(window.location.search);
    const initialPresetResult = parseCreateSearchParams(initialSearchParams);

    this.activeThemeMode = this.resolveCurrentThemeMode();
    this.themeRef = window.__BEJAMAS_CREATE__?.initialThemeRef ?? null;
    this.themeOverrides = normalizeThemeOverrides(
      window.__BEJAMAS_CREATE__?.initialThemeOverrides,
    );
    this.currentPreviewTarget = resolveCreatePreviewTarget(initialSearchParams);
    this.preservedPreset =
      initialPresetResult.success && initialPresetResult.preset
        ? {
            code: initialPresetResult.preset,
            config: this.toPresetConfig(initialPresetResult.data),
          }
        : null;

    this.frameTarget.dataset.previewKey =
      this.frameTarget.dataset.previewKey ??
      this.currentPreviewTarget ??
      CREATE_PREVIEW_DEFAULT_KEY;

    if (!this.themeStatusMessage) {
      this.setThemeStatus(
        this.themeRef
          ? "Custom theme loaded. Edit tokens or import CSS to update it."
          : "Pick a seed theme, then adjust tokens in light and dark modes.",
      );
    }

    this.applyStoredCreateProjectPackageManager();
    this.updateUi();
  }

  disconnect() {
    window.clearTimeout(this.themeSyncTimer);
    cleanupCreateDocsRootState(document.documentElement);
  }

  createSidebarOutletConnected() {
    this.updateUi();
  }

  createProjectDialogOutletConnected() {
    const config = this.collectConfig();
    this.applyStoredCreateProjectPackageManager();
    this.syncCreateProjectCommands(config, this.getCurrentPreset(config));
  }

  createNavigateOutletConnected() {
    this.syncNavigateSelection();
  }

  handleFormChange() {
    this.updateUi();
  }

  preventSubmit(event: Event) {
    event.preventDefault();
  }

  handleFrameLoad() {
    this.updateUi();
  }

  handleWindowMessage(event: MessageEvent<PreviewShortcutMessage>) {
    if (
      event.origin !== window.location.origin ||
      event.source !== this.frameTarget.contentWindow ||
      event.data?.type !== "bejamas:create-navigate-open"
    ) {
      return;
    }

    this.openNavigate();
  }

  handlePopstate() {
    const searchParams = new URLSearchParams(window.location.search);
    this.currentPreviewTarget = resolveCreatePreviewTarget(searchParams);

    const result = parseCreateSearchParams(searchParams);
    if (!result.success) {
      return;
    }

    this.updateUi({
      previewTarget: this.currentPreviewTarget,
      forceIframeReload: true,
    });
  }

  handlePageHide() {
    cleanupCreateDocsRootState(document.documentElement);
  }

  handleBeforeSwap() {
    cleanupCreateDocsRootState(document.documentElement);
  }

  handleThemeToggle() {
    this.activeThemeMode = this.resolveCurrentThemeMode();

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.themeModeValue = this.activeThemeMode;
    }
  }

  openNavigateShortcut(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.shiftKey ||
      this.isEditableTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    this.openNavigate();
  }

  handleCopyPreset() {
    void this.copyPreset();
  }

  handlePickerChange(
    event: CustomEvent<{ name: string; value: string }>,
  ) {
    const { name, value } = event.detail;
    if (!name || !value) {
      return;
    }

    if (name === "baseColor") {
      this.clearThemeOverrides({
        message: "Base color changed. Pick a seed theme or edit tokens below.",
      });
    }

    this.setInputValue(name, value, false);
    this.updateUi();
  }

  handleToggleLock(event: CustomEvent<{ param: CreateLockableParam }>) {
    const { param } = event.detail;

    if (this.lockedParams.has(param)) {
      this.lockedParams.delete(param);
    } else {
      this.lockedParams.add(param);
    }

    this.renderSidebar();
  }

  handleToggleFontGroupLock(
    event: CustomEvent<{ group: CreateFontGroup }>,
  ) {
    const { group } = event.detail;
    this.lockedFontGroup = this.lockedFontGroup === group ? null : group;
    this.renderSidebar();
  }

  handleRandomize() {
    const currentConfig = this.collectConfig();
    const preserveCustomTheme = this.isParamLocked("theme");

    this.applyConfig(
      createRandomDesignSystemConfig(currentConfig, {
        locked: this.lockedParams,
        lockedFontGroup: this.isParamLocked("font") ? null : this.lockedFontGroup,
        hasCustomTheme:
          preserveCustomTheme &&
          (this.themeRef !== null || hasThemeOverrides(this.themeOverrides)),
      }),
      {
        clearCustomTheme: !preserveCustomTheme,
      },
    );

    void incrementShuffleCountRequest();
  }

  handleSelectThemeSeed(event: CustomEvent<{ value: string }>) {
    this.handleThemeSeedSelect(event.detail.value);
  }

  handleOpenPalette(event: CustomEvent<{ value: string }>) {
    if (event.detail.value) {
      this.handleThemeSeedSelect(event.detail.value);
    }

    this.paletteSnapshot = {
      themeRef: this.themeRef,
      themeOverrides: structuredClone(this.themeOverrides),
    };
    this.renderSidebar();

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.showPalettePanel();
    }
  }

  handleCancelPalette() {
    if (this.paletteSnapshot) {
      this.themeRef = this.paletteSnapshot.themeRef;
      this.themeOverrides = this.paletteSnapshot.themeOverrides;
      this.paletteSnapshot = null;
      this.setThemeRefValue(this.themeRef);
      this.updateUi();
    }

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.showThemeListPanel();
    }
  }

  handleSavePalette() {
    this.paletteSnapshot = null;

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.showThemeListPanel();
    }
  }

  handleColorChange(
    event: CustomEvent<{ token: string; mode: ThemeMode; value: string }>,
  ) {
    const { token, mode, value } = event.detail;
    const config = this.collectConfig();

    this.setThemeTokenValue(config, mode, token, value);
    this.updateUi();
    this.scheduleThemeSync(config);
  }

  handleThemeImport(event: CustomEvent<{ css: string }>) {
    const config = this.collectConfig();
    const css = event.detail.css?.trim() ?? "";
    if (!css) {
      this.setThemeStatus("Paste CSS variables to import a custom theme.");
      return;
    }

    const parsed = parseCssVariables(css);
    const baseline = this.getBaselineThemeStyles(config);
    const overrides = normalizeThemeOverrides(this.themeOverrides);

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

    this.themeOverrides = overrides;
    if (!hasThemeOverrides(this.themeOverrides)) {
      this.themeRef = null;
      this.setThemeRefValue(null);
      this.setThemeStatus("Imported theme matches the selected seed.");
    } else {
      this.setThemeStatus("Imported theme. Saving custom theme...");
    }

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.closeThemeImportDialog();
    }

    this.updateUi();
    this.scheduleThemeSync(config);
  }

  handleOpenNavigate() {
    this.openNavigate();
  }

  handleProjectDialogOpen() {
    const config = this.collectConfig();
    this.syncCreateProjectCommands(config, this.getCurrentPreset(config));
  }

  handlePackageManagerChange(
    event: CustomEvent<{ packageManager: CreateProjectPackageManager }>,
  ) {
    this.setStoredCreateProjectPackageManager(event.detail.packageManager);
    const config = this.collectConfig();
    this.syncCreateProjectCommands(config, this.getCurrentPreset(config));
  }

  handleMonorepoChange() {
    const config = this.collectConfig();
    this.syncCreateProjectCommands(config, this.getCurrentPreset(config));
  }

  handleNavigateSelectTarget(event: CustomEvent<{ value: string }>) {
    this.selectNavigatePreviewTarget(
      event.detail.value === CREATE_PREVIEW_COMMAND_VALUE
        ? null
        : resolveCreatePreviewTarget(
            new URLSearchParams({ item: event.detail.value }),
          ),
    );
  }

  private openNavigate() {
    if (!this.hasCreateNavigateOutlet) {
      return;
    }

    this.syncNavigateSelection();
    this.createNavigateOutlet.open();
  }

  private selectNavigatePreviewTarget(nextPreviewTarget: string | null) {
    if (this.hasCreateNavigateOutlet) {
      this.createNavigateOutlet.close();
    }

    if (nextPreviewTarget === this.currentPreviewTarget) {
      return;
    }

    this.updateUi({
      history: "push",
      previewTarget: nextPreviewTarget,
      forceIframeReload: true,
    });
  }

  private syncNavigateSelection() {
    if (!this.hasCreateNavigateOutlet) {
      return;
    }

    this.createNavigateOutlet.setSelectedTarget(this.currentPreviewTarget);
  }

  private getField(name: string) {
    return this.formTarget.elements.namedItem(name) as HTMLInputElement | null;
  }

  private get presetButton() {
    return this.element.querySelector(
      "[data-create-copy-preset]",
    ) as HTMLButtonElement | null;
  }

  private get presetCodeNode() {
    return this.element.querySelector("[data-preset-code]") as HTMLElement | null;
  }

  private get themeRefHiddenInput() {
    return this.formTarget.querySelector(
      "[data-create-theme-ref-input]",
    ) as HTMLInputElement | null;
  }

  private get themeStyleNode() {
    return document.getElementById("create-page-theme-css");
  }

  private get styleStyleNode() {
    return document.getElementById("create-page-style-css");
  }

  private collectConfig(): CreateConfig {
    const formData = new FormData(this.formTarget);

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

  private isParamLocked(param: CreateLockableParam) {
    return this.lockedParams.has(param);
  }

  private isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""], [data-slot="combobox-input"]',
      ),
    );
  }

  private setInputValue(name: string, value: string, shouldDispatch = true) {
    const field = this.getField(name);
    if (!field || field.value === value) {
      return;
    }

    field.value = value;

    if (shouldDispatch) {
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  private setThemeRefValue(value: string | null) {
    if (this.themeRefHiddenInput) {
      this.themeRefHiddenInput.value = value ?? "";
    }
  }

  private getBaselineThemeStyles(config: CreateConfig) {
    return resolveDesignSystemTheme(config).styles;
  }

  private syncThemeSelection(config: CreateConfig) {
    const themeOptions = getCreatePickerOptionsByName("theme", {
      baseColor: config.baseColor,
      style: config.style,
    });
    const nextTheme =
      themeOptions.find((option) => option.value === config.theme)?.value ??
      themeOptions[0]?.value ??
      config.theme;

    this.setInputValue("theme", nextTheme, false);
    return nextTheme;
  }

  private getCurrentPreset(config: CreateConfig) {
    const presetConfig = this.toPresetConfig(config);

    if (
      this.preservedPreset &&
      this.isSamePresetConfig(presetConfig, this.preservedPreset.config)
    ) {
      return this.preservedPreset.code;
    }

    return encodePreset(presetConfig as Parameters<typeof encodePreset>[0]);
  }

  private toPresetConfig(config: CreateConfig): CreatePresetConfig {
    const {
      template: _template,
      rtl: _rtl,
      rtlLanguage: _rtlLanguage,
      ...presetConfig
    } = config;

    return presetConfig;
  }

  private isSamePresetConfig(
    left: CreatePresetConfig,
    right: CreatePresetConfig,
  ) {
    return PRESET_CONFIG_NAMES.every((name) => left[name] === right[name]);
  }

  private setThemeStatus(message: string) {
    this.themeStatusMessage = message;
  }

  private clearThemeOverrides(options?: { message?: string }) {
    this.themeOverrides = emptyThemeOverrides();
    this.themeRef = null;
    this.setThemeRefValue(null);
    this.setThemeStatus(
      options?.message ??
        "Pick a seed theme, then adjust tokens in light and dark modes.",
    );
  }

  private getThemeModeOverrides(mode: ThemeMode) {
    return this.themeOverrides[mode] ?? {};
  }

  private setThemeTokenValue(
    config: CreateConfig,
    mode: ThemeMode,
    token: string,
    value: string,
  ) {
    const baseline = this.getBaselineThemeStyles(config);
    const overrides = normalizeThemeOverrides(this.themeOverrides);
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

    this.themeOverrides = overrides;
    if (!hasThemeOverrides(this.themeOverrides)) {
      this.themeRef = null;
      this.setThemeRefValue(null);
      this.setThemeStatus("Theme matches the selected seed.");
    } else {
      this.setThemeStatus("Saving custom theme...");
    }
  }

  private async syncThemeRef(config: CreateConfig) {
    window.clearTimeout(this.themeSyncTimer);

    if (!hasThemeOverrides(this.themeOverrides)) {
      this.themeRef = null;
      this.setThemeRefValue(null);
      this.updateUi();
      return;
    }

    const nextThemeRef = this.themeRef ?? createCustomThemeRef();
    const now = new Date().toISOString();

    try {
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
              light: this.getThemeModeOverrides("light"),
              dark: this.getThemeModeOverrides("dark"),
            },
            createdAt: now,
            modifiedAt: now,
          },
        }),
      });

      if (!response.ok) {
        this.themeRef = null;
        this.setThemeRefValue(null);
        this.setThemeStatus("Theme saved locally only. Server sync is unavailable.");
        this.updateUi();
        return;
      }
    } catch {
      this.themeRef = null;
      this.setThemeRefValue(null);
      this.setThemeStatus("Theme saved locally only. Server sync is unavailable.");
      this.updateUi();
      return;
    }

    this.themeRef = nextThemeRef;
    this.setThemeRefValue(this.themeRef);
    this.setThemeStatus("Custom theme saved.");
    this.updateUi();
  }

  private scheduleThemeSync(config: CreateConfig) {
    window.clearTimeout(this.themeSyncTimer);
    this.themeSyncTimer = window.setTimeout(() => {
      void this.syncThemeRef(config);
    }, 280);
  }

  private async copyPreset() {
    const button = this.presetButton;
    const text = button?.dataset.copyText ?? "";
    if (!button || !text || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.flashButtonLabel(button, this.presetCodeNode, "Copied");
    } catch {
      // Ignore clipboard failures.
    }
  }

  private flashButtonLabel(
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

  private getStoredCreateProjectPackageManager(): CreateProjectPackageManager {
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

  private setStoredCreateProjectPackageManager(
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

  private applyStoredCreateProjectPackageManager() {
    if (!this.hasCreateProjectDialogOutlet) {
      return;
    }

    this.createProjectDialogOutlet.setPackageManager(
      this.getStoredCreateProjectPackageManager(),
    );
  }

  private getSelectedCreateProjectPackageManager(): CreateProjectPackageManager {
    if (
      this.hasCreateProjectDialogOutlet &&
      CREATE_PROJECT_PACKAGE_MANAGERS.includes(
        this.createProjectDialogOutlet.packageManagerValue,
      )
    ) {
      return this.createProjectDialogOutlet.packageManagerValue;
    }

    return "bun";
  }

  private getCreateProjectTemplate() {
    return getCreateProjectTemplateValue({
      monorepo:
        this.hasCreateProjectDialogOutlet &&
        this.createProjectDialogOutlet.monorepoChecked,
      withDocs: false,
    });
  }

  private syncCreateProjectCommands(config: CreateConfig, preset: string) {
    if (!this.hasCreateProjectDialogOutlet) {
      return;
    }

    const template = this.getCreateProjectTemplate();
    const commands = Object.fromEntries(
      CREATE_PROJECT_PACKAGE_MANAGERS.map((packageManager) => [
        packageManager,
        buildCreateProjectCommand({
          packageManager,
          template,
          preset,
          themeRef: this.themeRef,
        }),
      ]),
    ) as Record<CreateProjectPackageManager, string>;

    this.createProjectDialogOutlet.updateCommands(
      commands,
      this.getSelectedCreateProjectPackageManager(),
    );
  }

  private applyConfig(
    config: CreateConfig,
    options: { clearCustomTheme?: boolean } = {},
  ) {
    for (const name of PICKER_NAMES) {
      this.setInputValue(name, config[name], false);
    }

    this.setInputValue("theme", config.theme, false);

    if (options.clearCustomTheme) {
      this.clearThemeOverrides();
    }

    this.updateUi();
  }

  private renderSidebar() {
    if (!this.hasCreateSidebarOutlet) {
      return;
    }

    this.createSidebarOutlet.render({
      config: this.collectConfig(),
      themeRef: this.themeRef,
      themeOverrides: this.themeOverrides,
      themeMode: this.activeThemeMode,
      lockedParams: this.lockedParams,
      lockedFontGroup: this.lockedFontGroup,
    });
  }

  private updateUi(
    options: {
      history?: HistoryMode;
      previewTarget?: string | null;
      forceIframeReload?: boolean;
    } = {},
  ) {
    if (options.previewTarget !== undefined) {
      this.currentPreviewTarget = options.previewTarget;
    }

    const config = this.collectConfig();
    config.theme = this.syncThemeSelection(config) as CreateConfig["theme"];

    for (const name of PICKER_NAMES) {
      this.setInputValue(name, config[name], false);
    }
    this.setInputValue("theme", config.theme, false);

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.render({
        config,
        themeRef: this.themeRef,
        themeOverrides: this.themeOverrides,
        themeMode: this.activeThemeMode,
        lockedParams: this.lockedParams,
        lockedFontGroup: this.lockedFontGroup,
      });
    }

    const preset = this.getCurrentPreset(config);
    const params = new URLSearchParams({
      preset,
    });

    if (this.themeRef) {
      params.set("themeRef", this.themeRef);
    }

    if (this.currentPreviewTarget) {
      const currentPreviewItem = getKitchenSinkCreateItemId(this.currentPreviewTarget);
      if (currentPreviewItem) {
        params.set("item", currentPreviewItem);
      }
    }

    if (this.presetCodeNode) {
      this.presetCodeNode.textContent = `--preset ${preset}`;
    }

    if (this.hasCreateSidebarOutlet) {
      this.createSidebarOutlet.setPresetCode(`--preset ${preset}`);
    }

    if (this.presetButton) {
      this.presetButton.dataset.copyText = `--preset ${preset}`;
      this.presetButton.dataset.idleLabel = `--preset ${preset}`;
    }

    this.syncCreateProjectCommands(config, preset);
    setStoredPreset(preset, undefined, undefined, this.themeRef);

    window.history[options.history === "push" ? "pushState" : "replaceState"](
      {},
      "",
      `/create?${params.toString()}`,
    );

    if (this.themeStyleNode) {
      this.themeStyleNode.textContent = buildDesignSystemThemeCss(
        config,
        this.themeOverrides,
      );
    }

    if (this.styleStyleNode) {
      this.styleStyleNode.textContent =
        window.__BEJAMAS_CREATE__?.styleCssByStyle?.[config.style] ?? "";
    }

    applyCreateDocsRootState(document.documentElement, config.style);

    const nextPreviewUrl = buildCreatePreviewUrl(config, preset, {
      previewTarget: this.currentPreviewTarget,
      themeRef: this.themeRef,
    });
    const nextPreviewKey = this.currentPreviewTarget ?? CREATE_PREVIEW_DEFAULT_KEY;
    const shouldReloadIframe =
      options.forceIframeReload ||
      this.frameTarget.dataset.previewKey !== nextPreviewKey;

    this.syncNavigateSelection();

    if (shouldReloadIframe) {
      this.frameTarget.dataset.previewKey = nextPreviewKey;
      this.frameTarget.setAttribute("src", nextPreviewUrl);
      return;
    }

    const message: PreviewMessage = {
      type: "bejamas:create-preview",
      config,
      themeRef: this.themeRef,
      themeOverrides: this.themeOverrides,
    };

    this.frameTarget.contentWindow?.postMessage(message, window.location.origin);
  }

  private handleThemeSeedSelect(value: string) {
    this.setInputValue("theme", value, false);
    this.clearThemeOverrides({
      message: "Seed theme selected. Edit tokens below to customize it.",
    });
    this.updateUi();
  }

  private resolveCurrentThemeMode() {
    return getThemeModeFromRoot(
      document.documentElement,
      resolveGlobalThemeMode(
        getThemeChoiceFromRoot(document.documentElement),
        window.matchMedia("(prefers-color-scheme: light)").matches,
      ),
    );
  }
}
