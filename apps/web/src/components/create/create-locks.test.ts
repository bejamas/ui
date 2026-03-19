import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pickerFile = path.resolve(import.meta.dir, "./CreatePicker.astro");
const lockButtonFile = path.resolve(import.meta.dir, "./CreateLockButton.astro");
const fontGroupLockButtonFile = path.resolve(
  import.meta.dir,
  "./CreateFontGroupLockButton.astro",
);
const themePanelFile = path.resolve(import.meta.dir, "./CreateThemePanel.astro");
const customizerFile = path.resolve(import.meta.dir, "./CreateCustomizer.astro");

describe("create lock controls", () => {
  test("renders lock buttons for picker rows", () => {
    const source = fs.readFileSync(pickerFile, "utf8");
    const lockButtonSource = fs.readFileSync(lockButtonFile, "utf8");
    const fontGroupLockButtonSource = fs.readFileSync(
      fontGroupLockButtonFile,
      "utf8",
    );

    expect(source).toContain('class="group/picker relative"');
    expect(source).toContain("<CreateLockButton");
    expect(source).toContain("<CreateFontGroupLockButton");
    expect(source).toContain("disabled?: boolean");
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain('group/picker relative');
    expect(lockButtonSource).toContain("data-create-lock-param");
    expect(lockButtonSource).toContain('data-locked="false"');
    expect(lockButtonSource).toContain("group-has-[:focus-visible]/picker:opacity-100");
    expect(lockButtonSource).not.toContain("group-focus-within/picker:opacity-100");
    expect(fontGroupLockButtonSource).toContain("data-create-font-group-lock-button");
    expect(fontGroupLockButtonSource).toContain("data-create-font-group");
    expect(fontGroupLockButtonSource).toContain('data-locked="false"');
  });

  test("renders theme lock controls in both collapsed and expanded theme UI", () => {
    const themePanelSource = fs.readFileSync(themePanelFile, "utf8");
    const customizerSource = fs.readFileSync(customizerFile, "utf8");

    expect(customizerSource).toContain('param="theme"');
    expect(customizerSource).toContain("isCreatePickerDisabled");
    expect(customizerSource).toContain("disabled={isCreatePickerDisabled(picker, config)}");
    expect(themePanelSource).toContain('param="theme"');
    expect(themePanelSource).toContain('class="group/picker relative"');
  });
});
