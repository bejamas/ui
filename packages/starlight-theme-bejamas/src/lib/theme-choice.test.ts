import { describe, expect, it } from "bun:test";
import {
  STARLIGHT_THEME_STORAGE_KEY,
  THEME_TOGGLE_CHANGED_EVENT,
  applyThemeModeToRoot,
  buildThemeChoiceBootstrapInlineScript,
  getThemeChoiceFromRoot,
  getThemeModeFromRoot,
  loadStoredThemeChoice,
  parseStoredThemeChoice,
  resolveThemeMode,
  setThemeChoice,
  storeThemeChoice,
  syncThemeChoiceControls,
} from "./theme-choice";

function createThemeRoot() {
  const classes = new Set<string>();

  return {
    classes,
    root: {
      dataset: {} as Record<string, string | undefined>,
      classList: {
        add: (...tokens: string[]) => {
          for (const token of tokens) {
            classes.add(token);
          }
        },
        remove: (...tokens: string[]) => {
          for (const token of tokens) {
            classes.delete(token);
          }
        },
        contains: (token: string) => classes.has(token),
      },
    },
  };
}

describe("theme choice runtime", () => {
  it("parses only supported stored theme choices", () => {
    expect(parseStoredThemeChoice("light")).toBe("light");
    expect(parseStoredThemeChoice("dark")).toBe("dark");
    expect(parseStoredThemeChoice("auto")).toBe("auto");
    expect(parseStoredThemeChoice("")).toBe("auto");
    expect(parseStoredThemeChoice("system")).toBe("auto");
    expect(parseStoredThemeChoice(undefined)).toBe("auto");
  });

  it("loads the stored theme choice from localStorage-compatible storage", () => {
    expect(
      loadStoredThemeChoice({
        getItem: (key) =>
          key === STARLIGHT_THEME_STORAGE_KEY ? "dark" : null,
      }),
    ).toBe("dark");

    expect(
      loadStoredThemeChoice({
        getItem: () => "unexpected",
      }),
    ).toBe("auto");

    expect(
      loadStoredThemeChoice({
        getItem: () => {
          throw new Error("storage unavailable");
        },
      }),
    ).toBe("auto");
  });

  it("resolves auto against the preferred color scheme", () => {
    expect(resolveThemeMode("light", false)).toBe("light");
    expect(resolveThemeMode("dark", true)).toBe("dark");
    expect(resolveThemeMode("auto", true)).toBe("light");
    expect(resolveThemeMode("auto", false)).toBe("dark");
  });

  it("applies theme attributes and class state to the target root", () => {
    const { root, classes } = createThemeRoot();

    classes.add("dark");
    applyThemeModeToRoot(root, "auto", "light");

    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.themeChoice).toBe("auto");
    expect(classes.has("light")).toBe(true);
    expect(classes.has("dark")).toBe(false);
  });

  it("stores explicit theme choices and clears auto to the empty localStorage value", () => {
    const stored = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => {
        stored.set(key, value);
      },
    };

    storeThemeChoice(storage, "dark");
    storeThemeChoice(storage, "auto");

    expect(stored.get(STARLIGHT_THEME_STORAGE_KEY)).toBe("");
  });

  it("reads theme choice and effective mode from the document root", () => {
    const { root, classes } = createThemeRoot();

    root.dataset.themeChoice = "auto";
    root.dataset.theme = "";
    classes.add("dark");

    expect(getThemeChoiceFromRoot(root)).toBe("auto");
    expect(getThemeModeFromRoot(root, "light")).toBe("dark");
  });

  it("syncs tabs-based and legacy select-based controls to the requested choice", () => {
    let tabsValue = "";
    let selectValue = "";
    const nativeSelect = { value: "" };
    const tabsRoot = {
      dataset: {} as Record<string, string | undefined>,
      dispatchEvent: (event: Event) => {
        tabsValue =
          (event as CustomEvent<{ value?: string }>).detail?.value ?? "";
        return true;
      },
    };
    const selectRoot = {
      dataset: {} as Record<string, string | undefined>,
      dispatchEvent: (event: Event) => {
        selectValue =
          (event as CustomEvent<{ value?: string }>).detail?.value ?? "";
        return true;
      },
    };
    const picker = {
      querySelector: (selector: string) => {
        if (selector === '[data-slot="tabs"][data-theme-choice-tabs]') {
          return tabsRoot;
        }

        if (selector === "select") {
          return nativeSelect;
        }

        if (selector === '#starlight-theme-select, [data-slot="select"]') {
          return selectRoot;
        }

        return null;
      },
      querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    };
    const root = {
      querySelectorAll: (selector: string) => {
        if (selector === "starlight-theme-select") {
          return [picker] as unknown as NodeListOf<Element>;
        }

        if (selector === '[data-slot="tabs"][data-theme-choice-tabs]') {
          return [tabsRoot] as unknown as NodeListOf<Element>;
        }

        return [] as unknown as NodeListOf<Element>;
      },
    };

    syncThemeChoiceControls("light", root as unknown as ParentNode);

    expect(tabsRoot.dataset.defaultValue).toBe("light");
    expect(tabsRoot.dataset.value).toBe("light");
    expect(tabsValue).toBe("light");
    expect(nativeSelect.value).toBe("light");
    expect(selectRoot.dataset.defaultValue).toBe("light");
    expect(selectRoot.dataset.value).toBe("light");
    expect(selectValue).toBe("light");
  });

  it("applies the shared global theme choice path including storage, controls, and event dispatch", () => {
    const { root, classes } = createThemeRoot();
    const stored = new Map<string, string>();
    const dispatched: Array<{ theme: string; themeChoice: string }> = [];
    let tabsValue = "";
    const tabsRoot = {
      dataset: {} as Record<string, string | undefined>,
      dispatchEvent: (event: Event) => {
        tabsValue =
          (event as CustomEvent<{ value?: string }>).detail?.value ?? "";
        return true;
      },
    };
    const controlsRoot = {
      querySelectorAll: (selector: string) => {
        if (selector === '[data-slot="tabs"][data-theme-choice-tabs]') {
          return [tabsRoot] as unknown as NodeListOf<Element>;
        }

        return [] as unknown as NodeListOf<Element>;
      },
    };
    const dispatchTarget = {
      dispatchEvent: (event: Event) => {
        const customEvent = event as CustomEvent<{
          theme?: string;
          themeChoice?: string;
        }>;

        if (event.type === THEME_TOGGLE_CHANGED_EVENT) {
          dispatched.push({
            theme: customEvent.detail?.theme ?? "",
            themeChoice: customEvent.detail?.themeChoice ?? "",
          });
        }

        return true;
      },
    };

    const effectiveTheme = setThemeChoice("dark", {
      root,
      prefersLight: true,
      storage: {
        setItem: (key, value) => {
          stored.set(key, value);
        },
      },
      controlsRoot: controlsRoot as unknown as ParentNode,
      dispatchTarget: dispatchTarget as unknown as EventTarget,
    });

    expect(effectiveTheme).toBe("dark");
    expect(root.dataset.themeChoice).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(stored.get(STARLIGHT_THEME_STORAGE_KEY)).toBe("dark");
    expect(tabsValue).toBe("dark");
    expect(dispatched).toEqual([{ theme: "dark", themeChoice: "dark" }]);
  });

  it("builds an inline bootstrap script that owns root state and control sync", () => {
    const script = buildThemeChoiceBootstrapInlineScript();

    expect(script).toContain(STARLIGHT_THEME_STORAGE_KEY);
    expect(script).toContain("dataset.themeChoice");
    expect(script).toContain('[data-slot="tabs"][data-theme-choice-tabs]');
    expect(script).toContain(THEME_TOGGLE_CHANGED_EVENT);
    expect(script).toContain("prefers-color-scheme: light");
  });
});
