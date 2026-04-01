import { describe, expect, it } from "bun:test";
import { encodePreset } from "@bejamas/create-config/browser";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MENU_SURFACE_SELECTOR,
  MENU_TRANSLUCENT_MARKER_ATTRIBUTE,
  buildMenuColorRootBootstrapScript,
  resolvePresetMenuColor,
  syncMenuSurfaceElements,
  syncMenuSurfaceState,
} from "./menu-color-state";

class FakeClassList {
  private readonly tokens = new Set<string>();

  constructor(initial: string[] = []) {
    initial.forEach((token) => this.tokens.add(token));
  }

  add(...tokens: string[]) {
    tokens.forEach((token) => this.tokens.add(token));
  }

  contains(token: string) {
    return this.tokens.has(token);
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.tokens.delete(token));
  }
}

class FakeMenuSurface {
  readonly classList: FakeClassList;
  private readonly attributes = new Map<string, string>();

  constructor(options?: {
    attributes?: string[];
    classNames?: string[];
  }) {
    this.classList = new FakeClassList(options?.classNames ?? []);

    for (const name of options?.attributes ?? []) {
      this.attributes.set(name, "");
    }
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  hasClass(name: string) {
    return this.classList.contains(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

describe("menu color state", () => {
  it("decodes menuColor from create preset ids and falls back for non-preset ids", () => {
    const invertedTranslucentPreset = encodePreset({
      menuColor: "inverted-translucent",
    });

    expect(resolvePresetMenuColor(invertedTranslucentPreset)).toBe(
      "inverted-translucent",
    );
    expect(resolvePresetMenuColor("custom-demo")).toBe("default");
    expect(resolvePresetMenuColor(null)).toBe("default");
  });

  it("syncs menu surface classes and translucent markers across all menu colors", () => {
    const menuTarget = new FakeMenuSurface({
      classNames: ["cn-menu-target", "dark", "cn-menu-translucent"],
    });
    const translucentMarker = new FakeMenuSurface({
      attributes: [MENU_TRANSLUCENT_MARKER_ATTRIBUTE],
    });

    syncMenuSurfaceElements([menuTarget, translucentMarker], "default");

    expect(menuTarget.hasClass("dark")).toBe(false);
    expect(menuTarget.hasClass("cn-menu-translucent")).toBe(false);
    expect(menuTarget.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(true);
    expect(translucentMarker.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(
      true,
    );

    syncMenuSurfaceElements([menuTarget, translucentMarker], "inverted");

    expect(menuTarget.hasClass("dark")).toBe(true);
    expect(menuTarget.hasClass("cn-menu-translucent")).toBe(false);
    expect(menuTarget.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(true);

    syncMenuSurfaceElements([menuTarget, translucentMarker], "default-translucent");

    expect(menuTarget.hasClass("dark")).toBe(false);
    expect(menuTarget.hasClass("cn-menu-translucent")).toBe(true);
    expect(menuTarget.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(false);
    expect(translucentMarker.hasClass("cn-menu-translucent")).toBe(true);
    expect(translucentMarker.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(
      false,
    );

    syncMenuSurfaceElements([menuTarget, translucentMarker], "inverted-translucent");

    expect(menuTarget.hasClass("dark")).toBe(true);
    expect(menuTarget.hasClass("cn-menu-translucent")).toBe(true);
    expect(menuTarget.hasAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)).toBe(false);
  });

  it("queries menu surfaces through the shared shadcn selector", () => {
    const menuTarget = new FakeMenuSurface({
      classNames: ["cn-menu-target"],
    });
    let selector = "";

    syncMenuSurfaceState(
      {
        querySelectorAll(nextSelector: string) {
          selector = nextSelector;
          return [menuTarget];
        },
      },
      "inverted",
    );

    expect(selector).toBe(MENU_SURFACE_SELECTOR);
    expect(menuTarget.hasClass("dark")).toBe(true);
  });

  it("builds a bootstrap script that resolves stored presets and resyncs menu surfaces", () => {
    const source = buildMenuColorRootBootstrapScript();

    expect(source).toContain('const cookieName = "theme";');
    expect(source).toContain('const storageKey = "theme-preset";');
    expect(source).toContain('const eventName = "bejamas:preset-change";');
    expect(source).toContain(
      `const menuSurfaceSelector = "${MENU_SURFACE_SELECTOR}";`,
    );
    expect(source).toContain('document.querySelectorAll(menuSurfaceSelector)');
    expect(source).toContain('const observer = new MutationObserver(() => {');
    expect(source).toContain("scheduleMenuSync();");
    expect(source).toContain('parseThemeCookiePreset(readCookie(cookieName))');
    expect(source).toContain('decodePresetMenuColor(storedPreset) ?? defaultMenuColor');
    expect(source).toContain("event.detail?.preset?.menuColor");
    expect(source).not.toContain("menuInvertedAttribute");
  });

  it("removes the docs-only root translucent alias from globals.css", () => {
    const globalsCss = readFileSync(
      path.resolve(import.meta.dir, "../../styles/globals.css"),
      "utf8",
    );

    expect(globalsCss).not.toContain(
      "html[data-menu-translucent] .cn-menu-target",
    );
  });
});
