import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
const packageRoot = path.resolve(repoRoot, "packages/registry");
const accordionFile = path.resolve(packageRoot, "src/ui/accordion/Accordion.astro");
const accordionContentFile = path.resolve(
  packageRoot,
  "src/ui/accordion/AccordionContent.astro",
);
const accordionItemFile = path.resolve(
  packageRoot,
  "src/ui/accordion/AccordionItem.astro",
);
const accordionTriggerFile = path.resolve(
  packageRoot,
  "src/ui/accordion/AccordionTrigger.astro",
);
const uiPackageRoot = path.resolve(repoRoot, "packages/ui");
const uiAccordionContentFile = path.resolve(
  uiPackageRoot,
  "src/components/accordion/AccordionContent.astro",
);
const uiAccordionItemFile = path.resolve(
  uiPackageRoot,
  "src/components/accordion/AccordionItem.astro",
);
const uiAccordionTriggerFile = path.resolve(
  uiPackageRoot,
  "src/components/accordion/AccordionTrigger.astro",
);
const registryFile = path.resolve(repoRoot, "apps/web/public/r/accordion.json");
const styleRegistryFile = path.resolve(
  repoRoot,
  "apps/web/public/r/styles/bejamas-juno/accordion.json",
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

describe("accordion compatibility contract", () => {
  test("registry source supports Base UI-style root options", () => {
    const source = fs.readFileSync(accordionFile, "utf8");

    expect(source).toContain("defaultValue?: string | string[]");
    expect(source).toContain("collapsible = true");
    expect(source).toContain("const rootDefaultValue");
    expect(source).toContain("data-default-value={rootDefaultValue}");
    expect(source).toContain("createAccordion(el);");
    expect(source).not.toContain("data-default-value-json");
    expect(source).not.toContain("parseDefaultValue");
    expect(source).not.toContain("parseBooleanDataAttribute");
    expect(source).not.toContain("data-enhanced");
    expect(source).not.toContain('data-defaultValue={defaultValue}');
  });

  test("registry source content uses shadcn-style height animation hooks", () => {
    const contentSource = fs.readFileSync(accordionContentFile, "utf8");
    const itemSource = fs.readFileSync(accordionItemFile, "utf8");
    const triggerSource = fs.readFileSync(accordionTriggerFile, "utf8");

    expect(contentSource).toContain('class="cn-accordion-content overflow-hidden"');
    expect(contentSource).toContain("hidden");
    expect(contentSource).toContain("h-(--accordion-panel-height)");
    expect(contentSource).toContain("data-ending-style:h-0");
    expect(contentSource).toContain("data-starting-style:h-0");
    expect(contentSource).not.toContain("grid-rows-[0fr]");
    expect(contentSource).not.toContain("--radix-accordion-content-height");
    expect(contentSource).not.toContain("data-open:animate-accordion-down");

    expect(itemSource).not.toContain("open?: boolean");
    expect(itemSource).toContain('data-slot="accordion-item"');

    expect(triggerSource).toContain("group-aria-expanded/accordion-trigger:hidden");
    expect(triggerSource).toContain("group-aria-expanded/accordion-trigger:inline");
    expect(triggerSource).toContain("aria-disabled:pointer-events-none");
    expect(triggerSource).not.toContain("group-open/accordion");
    expect(triggerSource).not.toContain("rounded-md py-4 text-left text-sm font-medium hover:underline");
  });

  test("ui source keeps the Juno-styled classes inline", () => {
    const contentSource = fs.readFileSync(uiAccordionContentFile, "utf8");
    const itemSource = fs.readFileSync(uiAccordionItemFile, "utf8");
    const triggerSource = fs.readFileSync(uiAccordionTriggerFile, "utf8");

    expect(itemSource).toContain('class={cn("not-last:border-b", className)}');

    expect(triggerSource).toContain("rounded-md py-4 text-left text-sm font-medium hover:underline");
    expect(triggerSource).toContain("**:data-[slot=accordion-trigger-icon]:ml-auto");
    expect(triggerSource).toContain("aria-disabled:pointer-events-none");

    expect(contentSource).toContain("data-open:animate-accordion-down");
    expect(contentSource).toContain("data-closed:animate-accordion-up");
    expect(contentSource).toContain("text-sm overflow-hidden");
    expect(contentSource).toContain("h-(--accordion-panel-height)");
    expect(contentSource).toContain("pt-0 pb-4");
    expect(contentSource).not.toContain("--radix-accordion-content-height");
  });

  test("published registry payloads stay aligned with the accordion contract", () => {
    const registryAccordion = getRegistryContent(
      registryFile,
      "ui/accordion/Accordion.astro",
    );
    const registryContent = getRegistryContent(
      registryFile,
      "ui/accordion/AccordionContent.astro",
    );
    const registryItem = getRegistryContent(
      registryFile,
      "ui/accordion/AccordionItem.astro",
    );
    const registryTrigger = getRegistryContent(
      registryFile,
      "ui/accordion/AccordionTrigger.astro",
    );
    const styleAccordion = getRegistryContent(
      styleRegistryFile,
      "ui/accordion/Accordion.astro",
    );
    const styleContent = getRegistryContent(
      styleRegistryFile,
      "ui/accordion/AccordionContent.astro",
    );

    expect(registryAccordion).toContain("defaultValue?: string | string[]");
    expect(registryAccordion).toContain("const rootDefaultValue");
    expect(registryAccordion).toContain("data-default-value={rootDefaultValue}");
    expect(registryAccordion).toContain("createAccordion(el);");
    expect(registryAccordion).not.toContain("data-default-value-json");
    expect(registryAccordion).not.toContain("data-enhanced");
    expect(registryAccordion).not.toContain("AccordionItem open");

    expect(registryContent).toContain("data-open:animate-accordion-down");
    expect(registryContent).toContain("hidden");
    expect(registryContent).toContain("h-(--accordion-panel-height)");
    expect(registryContent).toContain("pt-0 pb-4");
    expect(registryContent).not.toContain("grid-rows-[0fr]");
    expect(registryContent).not.toContain("--radix-accordion-content-height");

    expect(registryItem).not.toContain("open?: boolean");
    expect(registryTrigger).toContain("rounded-md py-4 text-left text-sm font-medium hover:underline");

    expect(styleAccordion).toContain("const rootDefaultValue");
    expect(styleAccordion).toContain("data-default-value={rootDefaultValue}");
    expect(styleAccordion).toContain("createAccordion(el);");
    expect(styleAccordion).not.toContain("data-default-value-json");
    expect(styleAccordion).not.toContain("data-enhanced");
    expect(styleContent).toContain("data-open:animate-accordion-down");
    expect(styleContent).toContain("hidden");
    expect(styleContent).toContain("h-(--accordion-panel-height)");
    expect(styleContent).toContain("data-ending-style:h-0");
    expect(styleContent).toContain("data-starting-style:h-0");
    expect(styleContent).not.toContain("grid-rows-[0fr]");
    expect(styleContent).not.toContain("--radix-accordion-content-height");
  });
});
