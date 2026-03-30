import { Controller } from "@hotwired/stimulus";
import {
  hasCreateLockableParam,
  isCreateFontGroup,
  type CreateFontGroup,
  type CreateLockableParam,
} from "@/utils/create-sidebar";
import {
  getCreateThemeSeedOption,
  hasThemeOverrides,
  type ThemeMode,
} from "@/utils/themes/create-theme";
import { resolveDesignSystemTheme } from "@/utils/themes/design-system-adapter";
import {
  SIDEBAR_PANEL_TITLES,
  getPanelDirection,
  renderMarkerHtml,
  renderThemeSeedGroupsHtml,
} from "@/stimulus/helpers/create_ui";
import type CreatePickerController from "@/stimulus/controllers/create_picker_controller";
import type {
  ColorInputElement,
  CreateSidebarPanel,
  CreateSidebarRenderState,
} from "@/stimulus/types/create";

type ThemePanelVisualState = "active" | "entering" | "exiting" | "inactive";

const THEME_PANEL_TRANSITION_DURATION = 350;

export default class extends Controller<HTMLElement> {
  static outlets = ["create-picker"];
  static targets = [
    "sidebarTitle",
    "headerThemeLock",
    "mainPanel",
    "themeListPanel",
    "palettePanel",
    "themeSeedContainer",
    "paletteThemeLabel",
    "paletteThemeSwatch",
    "actionsDefault",
    "actionsPalette",
    "themeTrigger",
    "themeListBackButton",
    "paletteBackButton",
    "themeModePanel",
    "colorInput",
    "presetCode",
  ];

  static values = {
    panel: String,
    themeMode: String,
  };

  declare readonly hasSidebarTitleTarget: boolean;
  declare readonly sidebarTitleTarget: HTMLElement;
  declare readonly hasHeaderThemeLockTarget: boolean;
  declare readonly headerThemeLockTarget: HTMLElement;
  declare readonly hasMainPanelTarget: boolean;
  declare readonly mainPanelTarget: HTMLElement;
  declare readonly hasThemeListPanelTarget: boolean;
  declare readonly themeListPanelTarget: HTMLElement;
  declare readonly hasPalettePanelTarget: boolean;
  declare readonly palettePanelTarget: HTMLElement;
  declare readonly hasThemeSeedContainerTarget: boolean;
  declare readonly themeSeedContainerTarget: HTMLElement;
  declare readonly hasPaletteThemeLabelTarget: boolean;
  declare readonly paletteThemeLabelTarget: HTMLElement;
  declare readonly hasPaletteThemeSwatchTarget: boolean;
  declare readonly paletteThemeSwatchTarget: HTMLElement;
  declare readonly hasActionsDefaultTarget: boolean;
  declare readonly actionsDefaultTarget: HTMLElement;
  declare readonly hasActionsPaletteTarget: boolean;
  declare readonly actionsPaletteTarget: HTMLElement;
  declare readonly createPickerOutlets: CreatePickerController[];
  declare readonly hasThemeTriggerTarget: boolean;
  declare readonly themeTriggerTarget: HTMLButtonElement;
  declare readonly hasThemeListBackButtonTarget: boolean;
  declare readonly themeListBackButtonTarget: HTMLButtonElement;
  declare readonly hasPaletteBackButtonTarget: boolean;
  declare readonly paletteBackButtonTarget: HTMLButtonElement;
  declare readonly themeModePanelTargets: HTMLElement[];
  declare readonly colorInputTargets: ColorInputElement[];
  declare readonly hasPresetCodeTarget: boolean;
  declare readonly presetCodeTarget: HTMLElement;
  declare panelValue: CreateSidebarPanel;
  declare themeModeValue: ThemeMode;

  private isReady = false;
  private activePanel: CreateSidebarPanel = "main";
  private transitionToken = 0;
  private lastRenderState: CreateSidebarRenderState | null = null;
  private readonly boundImportConfirm = (event: Event) =>
    this.confirmThemeImport(event);

  connect() {
    this.importConfirmButton?.addEventListener("click", this.boundImportConfirm);
    this.activePanel = this.panelValue || "main";
    this.isReady = true;
    this.applyPanelStateImmediately(this.currentPanel);
    this.syncThemeModePanels();
  }

  disconnect() {
    this.importConfirmButton?.removeEventListener(
      "click",
      this.boundImportConfirm,
    );
  }

  colorInputTargetConnected(target: ColorInputElement) {
    target.setColor?.(target.dataset.value ?? "");
  }

  themeModePanelTargetConnected() {
    if (!this.isReady) {
      return;
    }

    this.syncThemeModePanels();
  }

  panelValueChanged(value: string, previousValue: string) {
    if (!this.isReady || !value) {
      return;
    }

    void this.transitionToPanel(
      previousValue ? (previousValue as CreateSidebarPanel) : this.activePanel,
      value as CreateSidebarPanel,
    );
  }

  themeModeValueChanged(value: string) {
    if (!this.isReady || !value) {
      return;
    }

    this.syncThemeModePanels();
  }

  createPickerOutletConnected(outlet: CreatePickerController) {
    if (this.lastRenderState) {
      outlet.render(this.lastRenderState);
    }
  }

  render(state: CreateSidebarRenderState) {
    this.lastRenderState = state;
    this.themeModeValue = state.themeMode;

    this.syncPickers(state);
    this.syncThemeTrigger(state);
    this.syncThemeSeedButtons(state.config);
    this.syncThemeInputs(state.config, state.themeOverrides);
    this.syncPaletteHeader(state.config, state.themeOverrides);
    this.syncThemeLockButtons(state.lockedParams);
  }

  setPresetCode(value: string) {
    if (this.hasPresetCodeTarget) {
      this.presetCodeTarget.textContent = value;
    }
  }

  openNavigate() {
    this.dispatch("open-navigate");
  }

  randomize() {
    this.dispatch("randomize");
  }

  copyPreset() {
    this.dispatch("copy-preset");
  }

  toggleLock(
    event: Event & {
      params: { lockParam?: string };
    },
  ) {
    event.preventDefault();
    event.stopPropagation();

    const param = event.params.lockParam;
    if (!param || !hasCreateLockableParam(param)) {
      return;
    }

    this.dispatch("toggle-lock", {
      detail: {
        param,
      },
    });
  }

  toggleFontGroupLock(
    event: Event & {
      params: { fontGroup?: string };
    },
  ) {
    event.preventDefault();
    event.stopPropagation();

    const group = event.params.fontGroup;
    if (!group || !isCreateFontGroup(group)) {
      return;
    }

    this.dispatch("toggle-font-group-lock", {
      detail: {
        group,
      },
    });
  }

  showThemeList() {
    this.panelValue = "theme-list";
  }

  backToMain(event?: Event) {
    event?.preventDefault();
    this.panelValue = "main";
  }

  cancelPalette(event?: Event) {
    event?.preventDefault();
    this.dispatch("cancel-palette");
  }

  savePalette() {
    this.dispatch("save-palette");
  }

  selectThemeSeed(
    event: Event & {
      params: { themeValue?: string };
    },
  ) {
    const value = event.params.themeValue;
    if (!value) {
      return;
    }

    this.dispatch("select-theme-seed", {
      detail: {
        value,
      },
    });
  }

  openPaletteEditor(
    event: Event & {
      params: { themeValue?: string };
    },
  ) {
    event.preventDefault();
    event.stopPropagation();

    const value = event.params.themeValue;
    if (!value) {
      return;
    }

    this.dispatch("open-palette", {
      detail: {
        value,
      },
    });
  }

  handleColorChange(
    event: CustomEvent<{ token: string; value: string }> & {
      params: { token?: string; mode?: string };
    },
  ) {
    const token = event.params.token;
    const mode = event.params.mode;
    if (!token || (mode !== "light" && mode !== "dark")) {
      return;
    }

    this.dispatch("color-change", {
      detail: {
        token,
        mode,
        value: event.detail.value,
      },
    });
  }

  openThemeImportDialog() {
    this.importDialogTrigger?.click();
  }

  confirmThemeImport(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    this.dispatch("import-theme", {
      detail: {
        css: this.importTextarea?.value?.trim() ?? "",
      },
    });
  }

  showPalettePanel() {
    this.panelValue = "palette-editor";
  }

  showThemeListPanel() {
    this.panelValue = "theme-list";
  }

  private get importDialogTrigger() {
    return this.element.querySelector<HTMLButtonElement>("#import-dialog-trigger");
  }

  private get importConfirmButton() {
    return this.element.querySelector<HTMLButtonElement>("#import-confirm-btn");
  }

  private get importTextarea() {
    return this.element.querySelector<HTMLTextAreaElement>("#import-css-textarea");
  }

  private get importDialogCloseButton() {
    return this.element.querySelector<HTMLElement>(
      "#import-dialog [data-slot='dialog-close']",
    );
  }

  closeThemeImportDialog() {
    this.importDialogCloseButton?.click();
  }

  private get currentPanel(): CreateSidebarPanel {
    return this.activePanel;
  }

  private get panelElements(): Record<CreateSidebarPanel, HTMLElement | null> {
    return {
      main: this.hasMainPanelTarget ? this.mainPanelTarget : null,
      "theme-list": this.hasThemeListPanelTarget ? this.themeListPanelTarget : null,
      "palette-editor": this.hasPalettePanelTarget ? this.palettePanelTarget : null,
    };
  }

  private syncPickers(state: CreateSidebarRenderState) {
    this.createPickerOutlets.forEach((picker) => {
      picker.render(state);
    });
  }

  private syncThemeTrigger(state: CreateSidebarRenderState) {
    const labelNode = this.element.querySelector(
      "[data-create-theme-current-label]",
    ) as HTMLElement | null;
    const markerNode = this.element.querySelector(
      "[data-create-theme-current-marker]",
    ) as HTMLElement | null;
    const selectedTheme = getCreateThemeSeedOption(
      state.config.baseColor,
      state.config.theme,
    );
    const mergedStyles = resolveDesignSystemTheme(
      state.config,
      state.themeOverrides,
    ).styles;
    const label = hasThemeOverrides(state.themeOverrides)
      ? "Custom"
      : (selectedTheme?.label ?? state.config.theme);

    if (labelNode) {
      labelNode.textContent = label;
    }

    if (markerNode) {
      markerNode.innerHTML = renderMarkerHtml("swatch", {
        value: state.config.theme,
        label,
        color:
          mergedStyles.light.primary ??
          selectedTheme?.color ??
          "oklch(0.72 0 0)",
      });
    }
  }

  private syncThemeSeedButtons(config: CreateConfig) {
    if (!this.hasThemeSeedContainerTarget) {
      return;
    }

    this.themeSeedContainerTarget.innerHTML = renderThemeSeedGroupsHtml(
      config.baseColor,
      config.theme,
    );
  }

  private syncThemeInputs(config: CreateConfig, themeOverrides: CreateSidebarRenderState["themeOverrides"]) {
    const styles = resolveDesignSystemTheme(config, themeOverrides).styles;

    this.colorInputTargets.forEach((node) => {
      const mode = node.dataset.createThemeMode;
      const token = node.dataset.token as keyof typeof styles.light | undefined;
      if (!mode || !token) {
        return;
      }

      node.dataset.value = styles[mode][token] ?? "";
      node.setColor?.(styles[mode][token] ?? "");
    });
  }

  private syncPaletteHeader(
    config: CreateConfig,
    themeOverrides: CreateSidebarRenderState["themeOverrides"],
  ) {
    const selectedTheme = getCreateThemeSeedOption(config.baseColor, config.theme);
    const mergedStyles = resolveDesignSystemTheme(config, themeOverrides).styles;
    const label = hasThemeOverrides(themeOverrides)
      ? "Custom"
      : (selectedTheme?.label ?? config.theme);
    const color =
      mergedStyles.light.primary ?? selectedTheme?.color ?? "oklch(0.72 0 0)";

    if (this.hasPaletteThemeLabelTarget) {
      this.paletteThemeLabelTarget.textContent = label;
    }

    if (this.hasPaletteThemeSwatchTarget) {
      this.paletteThemeSwatchTarget.style.background = color;
    }
  }

  private syncThemeLockButtons(lockedParams: Set<CreateLockableParam>) {
    this.element
      .querySelectorAll<HTMLButtonElement>(
        '[data-create-lock-button][data-create-lock-param="theme"]',
      )
      .forEach((button) => {
        const buttonParam = button.dataset.createLockParam;
        if (!buttonParam || !hasCreateLockableParam(buttonParam)) {
          return;
        }

        const locked = lockedParams.has(buttonParam);
        button.dataset.locked = String(locked);
        button.title = locked ? "Unlock" : "Lock";
        button.setAttribute("aria-label", locked ? "Unlock" : "Lock");
      });
  }

  private syncThemeModePanels() {
    this.themeModePanelTargets.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.mode !== this.themeModeValue);
    });
  }

  private prefersReducedPanelMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private waitForPanelTransition(duration: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration);
    });
  }

  private setPanelElementState(
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

  private syncSidebarTitle(target: CreateSidebarPanel) {
    if (this.hasSidebarTitleTarget) {
      this.sidebarTitleTarget.textContent = SIDEBAR_PANEL_TITLES[target];
    }

    if (this.hasHeaderThemeLockTarget) {
      this.headerThemeLockTarget.hidden = target === "main";
    }
  }

  private syncActionBarVisibility() {
    if (this.hasActionsDefaultTarget) {
      this.actionsDefaultTarget.hidden = this.currentPanel === "palette-editor";
    }

    if (this.hasActionsPaletteTarget) {
      this.actionsPaletteTarget.hidden = this.currentPanel !== "palette-editor";
    }
  }

  private getFocusTargetForPanel(panel: CreateSidebarPanel): HTMLElement | null {
    switch (panel) {
      case "main":
        return this.hasThemeTriggerTarget ? this.themeTriggerTarget : null;
      case "theme-list":
        return this.hasThemeListBackButtonTarget
          ? this.themeListBackButtonTarget
          : null;
      case "palette-editor":
        return this.hasPaletteBackButtonTarget ? this.paletteBackButtonTarget : null;
    }
  }

  private applyPanelStateImmediately(target: CreateSidebarPanel) {
    this.activePanel = target;
    for (const [panel, element] of Object.entries(this.panelElements)) {
      this.setPanelElementState(
        element,
        panel === target ? "active" : "inactive",
        panel !== target,
      );
    }

    this.syncActionBarVisibility();
    this.syncSidebarTitle(target);
  }

  private async transitionToPanel(
    from: CreateSidebarPanel,
    target: CreateSidebarPanel,
  ) {
    const currentElement = this.panelElements[from];
    const targetElement = this.panelElements[target];

    if (!currentElement || !targetElement) {
      this.applyPanelStateImmediately(target);
      return;
    }

    if (from === target && this.transitionToken === 0) {
      return;
    }

    const transitionToken = ++this.transitionToken;

    if (this.prefersReducedPanelMotion()) {
      this.applyPanelStateImmediately(target);
      this.transitionToken = 0;
      this.getFocusTargetForPanel(target)?.focus();
      return;
    }

    const direction = getPanelDirection(from, target);
    this.activePanel = target;
    this.syncActionBarVisibility();
    this.syncSidebarTitle(target);

    currentElement.dataset.panelDirection = direction;
    targetElement.dataset.panelDirection = direction;
    targetElement.classList.add("create-panel-no-transition");
    targetElement.dataset.panelState = "entering";
    targetElement.hidden = false;

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (transitionToken !== this.transitionToken) {
      return;
    }

    targetElement.classList.remove("create-panel-no-transition");
    currentElement.dataset.panelState = "exiting";
    targetElement.dataset.panelState = "active";

    await this.waitForPanelTransition(THEME_PANEL_TRANSITION_DURATION);
    if (transitionToken !== this.transitionToken) {
      return;
    }

    for (const [panel, element] of Object.entries(this.panelElements)) {
      if (panel !== target && element) {
        element.dataset.panelState = "inactive";
        element.hidden = true;
        delete element.dataset.panelDirection;
      }
    }

    this.getFocusTargetForPanel(target)?.focus();
    this.transitionToken = 0;
  }
}
