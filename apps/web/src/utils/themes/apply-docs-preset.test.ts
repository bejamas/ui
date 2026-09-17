import { afterEach, describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/browser";
import { applyThemeToDocument } from "./apply-docs-preset";
import { defaultPresets } from "./presets";

const originalDocument = globalThis.document;
afterEach(() => {
  globalThis.document = originalDocument;
});

function createDocument() {
  const inline = new Map([
    ["--background", "white"],
    ["--primary", "red"],
    ["--font-sans", "Inter"],
    ["--unrelated", "keep"],
  ]);
  const stylesheet = { textContent: "", setAttribute() {} };
  let appended = false;
  globalThis.document = {
    querySelector: () => (appended ? stylesheet : null),
    createElement: () => stylesheet,
    head: {
      appendChild: () => {
        appended = true;
      },
    },
    documentElement: {
      style: { removeProperty: (name: string) => inline.delete(name) },
    },
  } as unknown as Document;
  return { inline, stylesheet };
}

describe("document preset colors", () => {
  test("keeps both modes and the selected fonts while removing old inline colors", () => {
    const { inline, stylesheet } = createDocument();
    applyThemeToDocument(
      encodePreset({ style: "nova", font: "noto-sans", theme: "red" }),
    );
    expect(stylesheet.textContent).toContain("html:root {");
    expect(stylesheet.textContent).toContain(
      'html[data-theme="dark"], html.dark {',
    );
    expect(stylesheet.textContent).toContain("Noto Sans Variable");
    expect(stylesheet.textContent.match(/--background:/g)).toHaveLength(2);
    expect(inline.has("--background")).toBe(false);
    expect(inline.has("--primary")).toBe(false);
    expect(inline.has("--font-sans")).toBe(false);
    expect(inline.get("--unrelated")).toBe("keep");
  });

  test("preserves custom overrides in both modes and replaces them on the next preset", () => {
    const { stylesheet } = createDocument();
    const id = encodePreset({ style: "nova" });
    applyThemeToDocument(id, {
      light: {
        ...defaultPresets.default.styles.light,
        primary: "oklch(0.5 0.1 120)",
      },
      dark: {
        ...defaultPresets.default.styles.dark,
        primary: "oklch(0.8 0.1 120)",
      },
    });
    expect(stylesheet.textContent).toContain(
      "--primary: oklch(0.5000 0.1000 120);",
    );
    expect(stylesheet.textContent).toContain(
      "--primary: oklch(0.8000 0.1000 120);",
    );
    applyThemeToDocument(id);
    expect(stylesheet.textContent).not.toContain("oklch(0.5000 0.1000 120)");
    expect(stylesheet.textContent).not.toContain("oklch(0.8000 0.1000 120)");
  });
});
