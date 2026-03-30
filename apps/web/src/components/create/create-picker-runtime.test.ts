import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pickerFile = path.resolve(import.meta.dir, "./CreatePicker.astro");
const customizerFile = path.resolve(import.meta.dir, "./CreateCustomizer.astro");
const createPageFile = path.resolve(import.meta.dir, "../../pages/create.astro");
const createBootstrapFile = path.resolve(
  import.meta.dir,
  "../../stimulus/create.ts",
);
const createPickerControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/create_picker_controller.ts",
);

describe("create picker runtime", () => {
  test("wires pickers through a local Stimulus controller and shared editor event", () => {
    const pickerSource = fs.readFileSync(pickerFile, "utf8");
    const customizerSource = fs.readFileSync(customizerFile, "utf8");
    const pageSource = fs.readFileSync(createPageFile, "utf8");
    const bootstrapSource = fs.readFileSync(createBootstrapFile, "utf8");
    const controllerSource = fs.readFileSync(createPickerControllerFile, "utf8");

    expect(pickerSource).toContain('data-controller="create-picker"');
    expect(pickerSource).toContain('data-create-picker-name-value={name}');
    expect(pickerSource).toContain('data-action="dropdown-menu:value-change->create-picker#valueChanged"');
    expect(pickerSource).toContain("<DropdownMenuRadioItem");
    expect(pickerSource).toContain("closeOnSelect={false}");
    expect(pickerSource).toContain("defaultValue={selectedOption?.value ?? value}");
    expect(pickerSource).toContain("data-checked:!bg-white/[0.06]");
    expect(pickerSource).toContain("!pr-9");
    expect(pickerSource).toContain("!bg-[#0040a1]");
    expect(pickerSource).toContain("mr-6");
    expect(pickerSource).not.toContain("backdrop-blur-xl");
    expect(pickerSource).not.toContain("data-selected={isSelected");
    expect(pickerSource).not.toContain("data-create-picker-item-check");
    expect(pickerSource).not.toContain('import CheckIcon from "@lucide/astro/icons/check";');
    expect(customizerSource).toContain(
      'data-create-sidebar-create-picker-outlet=\'[data-controller~="create-picker"]\'',
    );
    expect(pageSource).toContain(
      "create-picker:change->create-editor#handlePickerChange",
    );
    expect(pageSource).toContain("backdrop-filter: none !important;");
    expect(pageSource).toContain("content: none !important;");
    expect(pageSource).toContain('[data-slot="dropdown-menu-radio-item-indicator"]');
    expect(pageSource).toContain("inset-block: 0 !important;");
    expect(bootstrapSource).toContain(
      'application.register("create-picker", CreatePickerController);',
    );
    expect(controllerSource).toContain('this.dispatch("change"');
    expect(controllerSource).toContain('new CustomEvent("dropdown-menu:set"');
    expect(controllerSource).toContain("source: \"restore\"");
    expect(controllerSource).toContain('[data-create-picker-content="${this.nameValue}"]');
    expect(controllerSource).not.toContain('querySelectorAll<HTMLElement>(');
    expect(controllerSource).not.toContain("data-selected");
    expect(controllerSource).not.toContain('declare readonly itemTargets');
    expect(controllerSource).toContain('button.dataset.locked = String(locked);');
  });
});
