import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pickerFile = path.resolve(import.meta.dir, "./CreatePicker.astro");
const lockButtonFile = path.resolve(import.meta.dir, "./CreateLockButton.astro");
const fontGroupLockButtonFile = path.resolve(
  import.meta.dir,
  "./CreateFontGroupLockButton.astro",
);
const themeListPanelFile = path.resolve(import.meta.dir, "./CreateThemeListPanel.astro");
const customizerFile = path.resolve(import.meta.dir, "./CreateCustomizer.astro");
const sidebarHeaderFile = path.resolve(import.meta.dir, "./CreateSidebarHeader.astro");

describe("create lock controls", () => {
  test("renders lock buttons for picker rows", () => {
    const source = fs.readFileSync(pickerFile, "utf8");
    const lockButtonSource = fs.readFileSync(lockButtonFile, "utf8");
    const fontGroupLockButtonSource = fs.readFileSync(
      fontGroupLockButtonFile,
      "utf8",
    );

    expect(source).toContain('class="group/picker relative"');
    expect(source).toContain('data-controller="create-picker"');
    expect(source).toContain('dropdown-menu:value-change->create-picker#valueChanged');
    expect(source).toContain("<DropdownMenuRadioItem");
    expect(source).toContain('data-create-picker-name-value={name}');
    expect(source).toContain("<CreateLockButton");
    expect(source).toContain("<CreateFontGroupLockButton");
    expect(source).toContain("disabled?: boolean");
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain("disabled={option.disabled}");
    expect(source).toContain('group/picker relative');
    expect(lockButtonSource).toContain("data-create-lock-param");
    expect(lockButtonSource).toContain('data-action="click->create-sidebar#toggleLock"');
    expect(lockButtonSource).toContain("data-create-sidebar-lock-param-param");
    expect(lockButtonSource).toContain('data-locked="false"');
    expect(lockButtonSource).toContain("group-has-[:focus-visible]/picker:opacity-100");
    expect(lockButtonSource).not.toContain("group-focus-within/picker:opacity-100");
    expect(fontGroupLockButtonSource).toContain("data-create-font-group-lock-button");
    expect(fontGroupLockButtonSource).toContain("data-create-font-group");
    expect(fontGroupLockButtonSource).toContain(
      'data-action="click->create-sidebar#toggleFontGroupLock"',
    );
    expect(fontGroupLockButtonSource).toContain('data-locked="false"');
  });

  test("renders theme lock controls in both collapsed and expanded theme UI", () => {
    const sidebarHeaderSource = fs.readFileSync(sidebarHeaderFile, "utf8");
    const customizerSource = fs.readFileSync(customizerFile, "utf8");

    expect(customizerSource).toContain('param="theme"');
    expect(customizerSource).toContain("isCreatePickerDisabled");
    expect(customizerSource).toContain("disabled={isCreatePickerDisabled(picker, config)}");
    expect(sidebarHeaderSource).toContain('param="theme"');
    expect(sidebarHeaderSource).toContain("data-create-header-theme-lock");
  });
});
