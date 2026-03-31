import { Controller } from "@hotwired/stimulus";
import {
  CREATE_PICKER_MARKERS,
  decomposeMenuColor,
  getCreatePickerOptionsByName,
  getCreatePickerSelectedOption,
  hasCreateLockableParam,
  isCreateFontGroup,
  isCreatePickerDisabled,
  type CreateFontGroup,
  type CreatePickerMarkerKind,
  type CreatePickerName,
} from "@/utils/create-sidebar";
import { renderMarkerHtml } from "@/stimulus/helpers/create_ui";
import type { CreateConfig, CreateSidebarRenderState } from "@/stimulus/types/create";

type DropdownMenuValueChangeDetail = {
  value: string | null;
  source: "pointer" | "keyboard" | "programmatic" | "restore";
};

export default class extends Controller<HTMLElement> {
  static targets = ["input", "trigger", "currentLabel", "currentMarker"];
  static values = {
    name: String,
    markerKind: String,
  };

  declare readonly inputTarget: HTMLInputElement;
  declare readonly triggerTarget: HTMLButtonElement;
  declare readonly currentLabelTarget: HTMLElement;
  declare readonly hasCurrentMarkerTarget: boolean;
  declare readonly currentMarkerTarget: HTMLElement;
  declare readonly nameValue: CreatePickerName;
  declare readonly hasMarkerKindValue: boolean;
  declare readonly markerKindValue: CreatePickerMarkerKind;

  valueChanged(event: CustomEvent<DropdownMenuValueChangeDetail>) {
    const { value, source } = event.detail;
    if (!value || (source !== "pointer" && source !== "keyboard")) {
      return;
    }

    if (this.getItem(value)?.hasAttribute("data-disabled")) {
      return;
    }

    this.dispatch("change", {
      detail: {
        name: this.nameValue,
        value,
      },
    });
  }

  render(state: CreateSidebarRenderState) {
    const value = state.config[this.nameValue];
    const selectedOption = getCreatePickerSelectedOption(this.nameValue, state.config);
    const disabled = isCreatePickerDisabled(this.nameValue, state.config);

    this.element.dataset.value = value;
    this.inputTarget.value = value;
    this.triggerTarget.disabled = disabled;

    this.syncRadiusDefaultItem(state.config);
    this.syncFontHeadingInheritItem(state.config);
    this.syncItemDisabledStates(state.config);
    this.syncDropdownValue(value);
    this.syncTriggerValue(value, selectedOption);
    this.syncLockButton(disabled, state);
    this.syncFontGroupLockButtons(state.lockedFontGroup);
  }

  private syncDropdownValue(value: string) {
    if (this.nameValue === "menuColor") {
      const { color, appearance } = decomposeMenuColor(value);
      this.dropdownMenuRoot?.dispatchEvent(
        new CustomEvent("dropdown-menu:set", {
          detail: { value: color, source: "restore" },
        }),
      );
      this.syncMenuColorAppearance(appearance);
      return;
    }

    this.dropdownMenuRoot?.dispatchEvent(
      new CustomEvent("dropdown-menu:set", {
        detail: {
          value,
          source: "restore",
        },
      }),
    );
  }

  private syncMenuColorAppearance(appearance: string) {
    const content = this.getPickerContent();
    if (!content) {
      return;
    }

    for (const val of ["solid", "translucent"]) {
      const item = content.querySelector(
        `[data-value="${val}"]`,
      ) as HTMLElement | null;
      if (!item) {
        continue;
      }
      if (val === appearance) {
        item.dataset.checked = "";
      } else {
        delete item.dataset.checked;
      }
    }
  }

  private syncTriggerValue(
    value: string,
    selectedOption: ReturnType<typeof getCreatePickerSelectedOption>,
  ) {
    this.currentLabelTarget.textContent = selectedOption?.label ?? value;

    if (!this.hasCurrentMarkerTarget) {
      return;
    }

    this.currentMarkerTarget.replaceChildren();
    if (!selectedOption || !this.hasMarkerKindValue) {
      return;
    }

    this.currentMarkerTarget.innerHTML = renderMarkerHtml(
      this.markerKindValue,
      selectedOption,
    );
  }

  private syncRadiusDefaultItem(config: CreateConfig) {
    if (this.nameValue !== "radius") {
      return;
    }

    const defaultOption = getCreatePickerSelectedOption("radius", {
      ...config,
      radius: "default",
    });
    const defaultItem = this.getItem("default");

    if (!defaultOption || !defaultItem) {
      return;
    }

    const labelNode = defaultItem.querySelector(
      "[data-create-picker-item-label]",
    ) as HTMLElement | null;
    if (labelNode) {
      labelNode.textContent = defaultOption.label;
    }

    const markerNode = defaultItem.querySelector(
      "[data-create-picker-item-marker]",
    ) as HTMLElement | null;
    if (markerNode) {
      markerNode.innerHTML = renderMarkerHtml("radius", defaultOption);
    }
  }

  private syncFontHeadingInheritItem(config: CreateConfig) {
    if (this.nameValue !== "fontHeading") {
      return;
    }

    const inheritOption = getCreatePickerSelectedOption("fontHeading", {
      ...config,
      fontHeading: "inherit",
    });
    const inheritItem = this.getItem("inherit");

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
      markerNode.innerHTML = renderMarkerHtml(
        CREATE_PICKER_MARKERS.fontHeading,
        inheritOption,
      );
    }
  }

  private syncItemDisabledStates(config: CreateConfig) {
    const options = getCreatePickerOptionsByName(this.nameValue, config);

    options.forEach((option) => {
      const item = this.getItem(option.value);
      if (!item) {
        return;
      }

      const disabled = Boolean(option.disabled);
      item.toggleAttribute("data-disabled", disabled);
      item.setAttribute("tabindex", disabled ? "-1" : "0");

      if (disabled) {
        item.setAttribute("aria-disabled", "true");
        return;
      }

      item.removeAttribute("aria-disabled");
    });
  }

  private get dropdownMenuRoot() {
    return this.element.querySelector<HTMLElement>("[data-slot='dropdown-menu']");
  }

  private syncLockButton(
    disabled: boolean,
    state: CreateSidebarRenderState,
  ) {
    const button = this.element.querySelector<HTMLButtonElement>(
      "[data-create-lock-button]",
    );
    if (!button) {
      return;
    }

    button.disabled = disabled;
    button.classList.toggle("hidden", disabled);
    button.setAttribute("aria-hidden", disabled ? "true" : "false");

    const param = button.dataset.createLockParam;
    const locked =
      !!param &&
      hasCreateLockableParam(param) &&
      state.lockedParams.has(param);

    button.dataset.locked = String(locked);
    button.title = locked ? "Unlock" : "Lock";
    button.setAttribute("aria-label", locked ? "Unlock" : "Lock");
  }

  private syncFontGroupLockButtons(lockedFontGroup: CreateFontGroup | null) {
    if (this.nameValue !== "font") {
      return;
    }

    this.element
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

  private getItem(value: string) {
    const escapedValue =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(value)
        : value.replace(/"/g, '\\"');

    return (
      this.getPickerContent()?.querySelector<HTMLElement>(
        `[data-create-picker-item][data-value="${escapedValue}"]`,
      ) ?? null
    );
  }

  private getPickerContent() {
    return this.element.ownerDocument.querySelector(
      `[data-create-picker-content="${this.nameValue}"]`,
    ) as HTMLElement | null;
  }
}
