import { Controller } from "@hotwired/stimulus";
import {
  CREATE_PROJECT_PACKAGE_MANAGERS,
  type CreateProjectPackageManager,
} from "@/utils/create-project-dialog";

type CommandMap = Record<CreateProjectPackageManager, string>;

export default class extends Controller<HTMLElement> {
  static values = {
    packageManager: String,
  };

  declare packageManagerValue: CreateProjectPackageManager;

  private isReady = false;
  private currentCommands: CommandMap | null = null;
  private currentActivePackageManager: CreateProjectPackageManager = "bun";
  private boundPackageTabs: HTMLElement | null = null;
  private boundMonorepoField: HTMLElement | null = null;
  private boundCopyButton: HTMLButtonElement | null = null;
  private readonly handlePackageTabsChange = (
    event: Event,
  ) => this.packageManagerChanged(event as CustomEvent<{ value: string }>);
  private readonly handleMonorepoChange = (
    event: Event,
  ) => this.monorepoChanged(event as CustomEvent<{ checked: boolean }>);
  private readonly handleCopyClick = () => {
    void this.copyCommand();
  };

  connect() {
    this.isReady = true;
    this.bindPortalControls();

    const packageManagerInput = this.packageManagerInput;
    if (packageManagerInput && this.isPackageManager(packageManagerInput.value)) {
      this.packageManagerValue = packageManagerInput.value;
      return;
    }

    this.packageManagerValue = "bun";
  }

  disconnect() {
    this.unbindPortalControls();
  }

  dialogChanged(event: CustomEvent<{ open: boolean }>) {
    if (!event.detail.open) {
      return;
    }

    this.bindPortalControls();
    this.dispatch("open");
  }

  packageManagerChanged(event: CustomEvent<{ value: string }>) {
    const value = event.detail.value;
    if (!this.isPackageManager(value)) {
      return;
    }

    this.packageManagerValue = value;
    this.dispatch("package-manager-change", {
      detail: {
        packageManager: value,
      },
    });
  }

  monorepoChanged(event: CustomEvent<{ checked: boolean }>) {
    this.dispatch("monorepo-change", {
      detail: {
        checked: event.detail.checked,
      },
    });
  }

  async copyCommand() {
    const copyButton = this.copyButton;
    if (!copyButton) {
      return;
    }

    const text = copyButton.dataset.copyText ?? "";
    if (!text || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.flashCopyLabel("Copied");
    } catch {
      // Ignore clipboard failures.
    }
  }

  packageManagerValueChanged(value: string) {
    if (!this.isReady || !this.isPackageManager(value)) {
      return;
    }

    const packageManagerInput = this.packageManagerInput;
    if (packageManagerInput) {
      packageManagerInput.value = value;
    }

    const packageTabs = this.packageTabs;
    if (packageTabs) {
      packageTabs.dispatchEvent(
        new CustomEvent("tabs:set", {
          detail: {
            value,
          },
        }),
      );
    }
  }

  updateCommands(
    commands: CommandMap,
    activePackageManager: CreateProjectPackageManager,
  ) {
    this.currentCommands = commands;
    this.currentActivePackageManager = activePackageManager;

    this.renderCommands(commands, activePackageManager);
    this.packageManagerValue = activePackageManager;
  }

  setPackageManager(
    packageManager: CreateProjectPackageManager,
    options: { syncTabs?: boolean } = {},
  ) {
    if (!this.isPackageManager(packageManager)) {
      return;
    }

    const packageManagerInput = this.packageManagerInput;
    if (packageManagerInput) {
      packageManagerInput.value = packageManager;
    }

    if (options.syncTabs ?? true) {
      this.packageManagerValue = packageManager;
      return;
    }

    const packageTabs = this.packageTabs;
    if (packageTabs) {
      packageTabs.dispatchEvent(
        new CustomEvent("tabs:set", {
          detail: {
            value: packageManager,
          },
        }),
      );
    }
  }

  get monorepoChecked() {
    return (
      this.monorepoField?.hasAttribute("data-checked") ||
      this.monorepoField?.getAttribute("aria-checked") === "true"
    );
  }

  private bindPortalControls() {
    const packageTabs = this.packageTabs;
    if (packageTabs && packageTabs !== this.boundPackageTabs) {
      this.boundPackageTabs?.removeEventListener(
        "tabs:change",
        this.handlePackageTabsChange,
      );
      packageTabs.addEventListener("tabs:change", this.handlePackageTabsChange);
      this.boundPackageTabs = packageTabs;
    }

    const monorepoField = this.monorepoField;
    if (monorepoField && monorepoField !== this.boundMonorepoField) {
      this.boundMonorepoField?.removeEventListener(
        "switch:change",
        this.handleMonorepoChange,
      );
      monorepoField.addEventListener(
        "switch:change",
        this.handleMonorepoChange,
      );
      this.boundMonorepoField = monorepoField;
    }

    const copyButton = this.copyButton;
    if (copyButton && copyButton !== this.boundCopyButton) {
      this.boundCopyButton?.removeEventListener("click", this.handleCopyClick);
      copyButton.addEventListener("click", this.handleCopyClick);
      this.boundCopyButton = copyButton;
    }

    if (this.currentCommands) {
      this.renderCommands(this.currentCommands, this.currentActivePackageManager);
    }
  }

  private unbindPortalControls() {
    this.boundPackageTabs?.removeEventListener(
      "tabs:change",
      this.handlePackageTabsChange,
    );
    this.boundMonorepoField?.removeEventListener(
      "switch:change",
      this.handleMonorepoChange,
    );
    this.boundCopyButton?.removeEventListener("click", this.handleCopyClick);
    this.boundPackageTabs = null;
    this.boundMonorepoField = null;
    this.boundCopyButton = null;
  }

  private renderCommands(
    commands: CommandMap,
    activePackageManager: CreateProjectPackageManager,
  ) {
    for (const packageManager of CREATE_PROJECT_PACKAGE_MANAGERS) {
      const node = document.querySelector<HTMLElement>(
        `[data-create-project-command="${packageManager}"]`,
      );
      if (node) {
        node.textContent = commands[packageManager];
      }
    }

    const copyButton = this.copyButton;
    if (copyButton) {
      copyButton.dataset.copyText = commands[activePackageManager];
      copyButton.dataset.idleLabel = "Copy Command";
    }

    const copyLabel = this.copyLabel;
    if (copyLabel) {
      copyLabel.textContent = "Copy Command";
    }
  }

  private flashCopyLabel(nextLabel: string) {
    const copyLabel = this.copyLabel;
    const copyButton = this.copyButton;
    if (!copyLabel || !copyButton) {
      return;
    }

    const idleLabel =
      copyButton.dataset.idleLabel ??
      copyLabel.textContent ??
      "";
    copyLabel.textContent = nextLabel;

    window.setTimeout(() => {
      copyLabel.textContent = copyButton.dataset.idleLabel ?? idleLabel;
    }, 1400);
  }

  private isPackageManager(value: string): value is CreateProjectPackageManager {
    return CREATE_PROJECT_PACKAGE_MANAGERS.includes(
      value as CreateProjectPackageManager,
    );
  }

  private get packageManagerInput() {
    return document.querySelector(
      "[data-create-project-package-manager]",
    ) as HTMLInputElement | null;
  }

  private get packageTabs() {
    return document.querySelector(
      "[data-create-project-package-tabs]",
    ) as HTMLElement | null;
  }

  private get monorepoField() {
    return document.querySelector(
      "[data-create-project-monorepo]",
    ) as HTMLElement | null;
  }

  private get copyButton() {
    return document.querySelector(
      "[data-create-project-copy-command]",
    ) as HTMLButtonElement | null;
  }

  private get copyLabel() {
    return document.querySelector(
      "[data-create-project-copy-command-label]",
    ) as HTMLElement | null;
  }
}
