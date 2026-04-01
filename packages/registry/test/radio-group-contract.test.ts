import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const packageRoot = path.resolve(repoRoot, "packages/registry");
const radioGroupFile = path.resolve(
  packageRoot,
  "src/ui/radio-group/RadioGroup.astro",
);
const radioGroupItemFile = path.resolve(
  packageRoot,
  "src/ui/radio-group/RadioGroupItem.astro",
);
const registryFile = path.resolve(repoRoot, "apps/web/public/r/radio-group.json");
const styleRegistryFile = path.resolve(
  repoRoot,
  "apps/web/public/r/styles/bejamas-juno/radio-group.json",
);

type RegistryItem = {
  files?: Array<{
    path?: string;
    content?: string;
  }>;
};

function getRegistryContent(registryPath: string, pathname: string) {
  const source = fs.readFileSync(registryPath, "utf8");
  const item = JSON.parse(source) as RegistryItem;
  const file = item.files?.find((entry) => entry.path === pathname);

  expect(file?.content).toBeString();

  return file?.content ?? "";
}

describe("radio-group compatibility contract", () => {
  test("registry source matches the data-slot radio group contract", () => {
    const rootSource = fs.readFileSync(radioGroupFile, "utf8");
    const itemSource = fs.readFileSync(radioGroupItemFile, "utf8");

    expect(rootSource).toContain("defaultValue?: string");
    expect(rootSource).toContain("name?: string");
    expect(rootSource).toContain("readOnly?: boolean");
    expect(rootSource).toContain('data-default-value={defaultValue}');
    expect(rootSource).toContain('data-name={name}');
    expect(rootSource).toContain('data-disabled={disabled ? "true" : undefined}');
    expect(rootSource).toContain(
      'data-read-only={readOnly ? "true" : undefined}',
    );
    expect(rootSource).toContain('data-required={required ? "true" : undefined}');
    expect(rootSource).toContain('import { create } from "@data-slot/radio-group";');
    expect(rootSource).toContain("create();");
    expect(rootSource).not.toContain('role="radiogroup"');

    expect(itemSource).toContain('interface Props extends HTMLAttributes<"span">');
    expect(itemSource).toContain('data-value={value}');
    expect(itemSource).toContain('data-disabled={disabled ? "true" : undefined}');
    expect(itemSource).toContain('data-slot="radio-group-indicator"');
    expect(itemSource).toContain("cn-radio-group-indicator-icon");
    expect(itemSource).not.toContain("name?: string");
    expect(itemSource).not.toContain("checked?: boolean");
    expect(itemSource).not.toContain("required?: boolean");
    expect(itemSource).not.toContain('type="radio"');
    expect(itemSource).not.toContain("window.__bejamasRadioGroupSync");
  });

  test("published registry payloads stay aligned with the radio-group contract", () => {
    const registryRoot = getRegistryContent(
      registryFile,
      "ui/radio-group/RadioGroup.astro",
    );
    const registryItem = getRegistryContent(
      registryFile,
      "ui/radio-group/RadioGroupItem.astro",
    );
    const styleRoot = getRegistryContent(
      styleRegistryFile,
      "ui/radio-group/RadioGroup.astro",
    );
    const styleItem = getRegistryContent(
      styleRegistryFile,
      "ui/radio-group/RadioGroupItem.astro",
    );

    expect(registryRoot).toContain('data-default-value={defaultValue}');
    expect(registryRoot).toContain('data-name={name}');
    expect(registryRoot).toContain('import { create } from "@data-slot/radio-group";');
    expect(registryRoot).not.toContain('role="radiogroup"');

    expect(registryItem).toContain('data-value={value}');
    expect(registryItem).not.toContain('type="radio"');
    expect(registryItem).not.toContain("window.__bejamasRadioGroupSync");

    expect(styleRoot).toContain('class={cn("grid gap-3", className)}');
    expect(styleItem).toContain('data-value={value}');
    expect(styleItem).toContain("data-disabled:cursor-not-allowed");
    expect(styleItem).not.toContain("peer-focus-visible");
    expect(styleItem).not.toContain('type="radio"');
  });
});
