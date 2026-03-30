import { Controller } from "@hotwired/stimulus";
import { CREATE_PREVIEW_COMMAND_VALUE } from "@/utils/create";

export default class extends Controller<HTMLElement> {
  static targets = ["dialog", "command", "input"];

  static values = {
    selectedTarget: String,
  };

  declare readonly hasDialogTarget: boolean;
  declare readonly dialogTarget: HTMLElement;
  declare readonly hasCommandTarget: boolean;
  declare readonly commandTarget: HTMLElement;
  declare readonly hasInputTarget: boolean;
  declare readonly inputTarget: HTMLInputElement;
  declare selectedTargetValue: string;

  private isReady = false;

  connect() {
    this.isReady = true;
  }

  dialogChanged(event: CustomEvent<{ open: boolean }>) {
    if (!event.detail.open) {
      this.syncSelection();
      return;
    }

    this.syncSelection();
    window.requestAnimationFrame(() => {
      if (!this.hasInputTarget) {
        return;
      }

      this.inputTarget.focus();
      this.inputTarget.select();
    });
  }

  selectCommand(event: CustomEvent<{ value: string }>) {
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
    if (!this.hasDialogTarget) {
      return;
    }

    this.dialogTarget.dispatchEvent(
      new CustomEvent("dialog:set", {
        detail: {
          open: true,
        },
      }),
    );
  }

  close() {
    if (!this.hasDialogTarget) {
      return;
    }

    this.dialogTarget.dispatchEvent(
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
    if (!this.hasCommandTarget) {
      return;
    }

    this.commandTarget.dispatchEvent(
      new CustomEvent("command:set", {
        detail: {
          search: "",
          value: this.selectedTargetValue || CREATE_PREVIEW_COMMAND_VALUE,
        },
      }),
    );
  }
}
