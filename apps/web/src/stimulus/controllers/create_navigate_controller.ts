import { Controller } from "@hotwired/stimulus";
import { CREATE_PREVIEW_COMMAND_VALUE } from "@/utils/create";

export default class extends Controller<HTMLElement> {
  static values = {
    selectedTarget: String,
  };

  declare selectedTargetValue: string;

  private isReady = false;
  private boundCommandRoot: HTMLElement | null = null;
  private readonly handleCommandSelect = (
    event: Event,
  ) => this.selectCommand(event as CustomEvent<{ value: string }>);

  connect() {
    this.isReady = true;
    this.bindPortalCommand();
  }

  disconnect() {
    this.unbindPortalCommand();
  }

  dialogChanged(event: CustomEvent<{ open: boolean }>) {
    this.bindPortalCommand();

    if (!event.detail.open) {
      this.syncSelection();
      return;
    }

    this.syncSelection();
    window.requestAnimationFrame(() => {
      const input = this.inputElement;
      if (!input) {
        return;
      }

      input.focus();
      input.select();
    });
  }

  selectCommand(event: CustomEvent<{ value: string }>) {
    this.selectedTargetValue = event.detail.value;
    this.dispatch("select-target", {
      detail: {
        value: event.detail.value,
      },
    });
  }

  selectedTargetValueChanged() {
    if (!this.isReady) {
      return;
    }

    this.syncSelection();
  }

  open() {
    this.element.dispatchEvent(
      new CustomEvent("dialog:set", {
        detail: {
          open: true,
        },
      }),
    );
  }

  close() {
    this.element.dispatchEvent(
      new CustomEvent("dialog:set", {
        detail: {
          open: false,
        },
      }),
    );
  }

  setSelectedTarget(value: string | null) {
    this.selectedTargetValue = value ?? CREATE_PREVIEW_COMMAND_VALUE;
  }

  private syncSelection() {
    const commandRoot = this.commandRoot;
    if (!commandRoot) {
      return;
    }

    commandRoot.dispatchEvent(
      new CustomEvent("command:set", {
        detail: {
          search: "",
          value: this.selectedTargetValue || CREATE_PREVIEW_COMMAND_VALUE,
        },
      }),
    );
  }

  private bindPortalCommand() {
    const commandRoot = this.commandRoot;
    if (!commandRoot || commandRoot === this.boundCommandRoot) {
      return;
    }

    this.unbindPortalCommand();
    commandRoot.addEventListener("command:select", this.handleCommandSelect);
    this.boundCommandRoot = commandRoot;
  }

  private unbindPortalCommand() {
    if (!this.boundCommandRoot) {
      return;
    }

    this.boundCommandRoot.removeEventListener(
      "command:select",
      this.handleCommandSelect,
    );
    this.boundCommandRoot = null;
  }

  private get commandRoot() {
    return document.querySelector("[data-create-navigate-command]") as HTMLElement | null;
  }

  private get inputElement() {
    return document.querySelector(
      "[data-create-navigate-input]",
    ) as HTMLInputElement | null;
  }
}
