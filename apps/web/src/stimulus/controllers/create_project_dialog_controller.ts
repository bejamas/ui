import { Controller } from "@hotwired/stimulus";
import {
  CREATE_PROJECT_PACKAGE_MANAGERS,
  type CreateProjectPackageManager,
} from "@/utils/create-project-dialog";

type CommandMap = Record<CreateProjectPackageManager, string>;

export default class extends Controller<HTMLElement> {
  static targets = [
    "packageManagerInput",
    "packageTabs",
    "monorepoField",
    "copyButton",
    "copyLabel",
  ];

  static values = {
    packageManager: String,
  };

  declare readonly hasPackageManagerInputTarget: boolean;
  declare readonly packageManagerInputTarget: HTMLInputElement;
  declare readonly hasPackageTabsTarget: boolean;
  declare readonly packageTabsTarget: HTMLElement;
  declare readonly hasMonorepoFieldTarget: boolean;
  declare readonly monorepoFieldTarget: HTMLElement;
  declare readonly hasCopyButtonTarget: boolean;
  declare readonly copyButtonTarget: HTMLButtonElement;
  declare readonly hasCopyLabelTarget: boolean;
  declare readonly copyLabelTarget: HTMLElement;
  declare packageManagerValue: CreateProjectPackageManager;

  private isReady = false;

  connect() {
    this.isReady = true;

    if (
      this.hasPackageManagerInputTarget &&
      this.isPackageManager(this.packageManagerInputTarget.value)
    ) {
      this.packageManagerValue = this.packageManagerInputTarget.value;
      return;
    }

    this.packageManagerValue = "bun";
  }

  dialogChanged(event: CustomEvent<{ open: boolean }>) {
    if (!event.detail.open) {
      return;
    }

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
    if (!this.hasCopyButtonTarget) {
      return;
    }

    const text = this.copyButtonTarget.dataset.copyText ?? "";
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

    if (this.hasPackageManagerInputTarget) {
      this.packageManagerInputTarget.value = value;
    }

    if (this.hasPackageTabsTarget) {
      this.packageTabsTarget.dispatchEvent(
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
    for (const packageManager of CREATE_PROJECT_PACKAGE_MANAGERS) {
      const node = this.element.querySelector<HTMLElement>(
        `[data-create-project-command="${packageManager}"]`,
      );
      if (node) {
        node.textContent = commands[packageManager];
      }
    }

    if (this.hasCopyButtonTarget) {
      this.copyButtonTarget.dataset.copyText = commands[activePackageManager];
      this.copyButtonTarget.dataset.idleLabel = "Copy Command";
    }

    if (this.hasCopyLabelTarget) {
      this.copyLabelTarget.textContent = "Copy Command";
    }

    this.packageManagerValue = activePackageManager;
  }

  setPackageManager(
    packageManager: CreateProjectPackageManager,
    options: { syncTabs?: boolean } = {},
  ) {
    if (!this.isPackageManager(packageManager)) {
      return;
    }

    if (this.hasPackageManagerInputTarget) {
      this.packageManagerInputTarget.value = packageManager;
    }

    if (options.syncTabs ?? true) {
      this.packageManagerValue = packageManager;
      return;
    }

    if (this.hasPackageTabsTarget) {
      this.packageTabsTarget.dispatchEvent(
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
      this.monorepoFieldTarget?.hasAttribute("data-checked") ||
      this.monorepoFieldTarget?.getAttribute("aria-checked") === "true"
    );
  }

  private flashCopyLabel(nextLabel: string) {
    if (!this.hasCopyLabelTarget || !this.hasCopyButtonTarget) {
      return;
    }

    const idleLabel =
      this.copyButtonTarget.dataset.idleLabel ??
      this.copyLabelTarget.textContent ??
      "";
    this.copyLabelTarget.textContent = nextLabel;

    window.setTimeout(() => {
      this.copyLabelTarget.textContent =
        this.copyButtonTarget.dataset.idleLabel ?? idleLabel;
    }, 1400);
  }

  private isPackageManager(value: string): value is CreateProjectPackageManager {
    return CREATE_PROJECT_PACKAGE_MANAGERS.includes(
      value as CreateProjectPackageManager,
    );
  }
}
