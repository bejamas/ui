import { describe, expect, it } from "bun:test";
import {
  STARLIGHT_THEME_STORAGE_KEY,
  applyThemeModeToRoot,
  buildIframeThemeSyncInlineScript,
  getThemeChoiceFromRoot,
  getThemeModeFromRoot,
  loadStoredThemeChoice,
  parseStoredThemeChoice,
  resolveThemeMode,
  setGlobalThemeChoice,
  storeThemeChoice,
  syncThemeChoiceTabs,
} from "./iframe-theme-sync";

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

describe("iframe theme sync helpers", () => {
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

  it("applies the shared global theme choice path including storage and picker syncing", () => {
    const { root, classes } = createThemeRoot();
    const stored = new Map<string, string>();
    const syncCalls: string[] = [];
    const dispatchCalls: Array<{ theme: string; themeChoice: string }> = [];
    let tabsValue = "";
    const tabsRoot = {
      querySelectorAll: () =>
        [
          {
            dataset: {} as Record<string, string | undefined>,
            dispatchEvent: (event: Event) => {
              const nextValue = (event as CustomEvent<{ value?: string }>).detail
                ?.value;
              tabsValue = nextValue ?? "";
              return true;
            },
          },
        ] as unknown as NodeListOf<HTMLDivElement>,
    };

    const effectiveTheme = setGlobalThemeChoice("dark", {
      root,
      prefersLight: true,
      storage: {
        setItem: (key, value) => {
          stored.set(key, value);
        },
      },
      syncPickers: (themeChoice) => {
        syncCalls.push(themeChoice);
      },
      dispatchChange: (theme, themeChoice) => {
        dispatchCalls.push({ theme, themeChoice });
      },
      tabsRoot: tabsRoot as unknown as ParentNode,
    });

    expect(effectiveTheme).toBe("dark");
    expect(root.dataset.themeChoice).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(classes.has("dark")).toBe(true);
    expect(stored.get(STARLIGHT_THEME_STORAGE_KEY)).toBe("dark");
    expect(syncCalls).toEqual(["dark"]);
    expect(dispatchCalls).toEqual([{ theme: "dark", themeChoice: "dark" }]);
    expect(tabsValue).toBe("dark");
  });

  it("syncs all starlight theme tab controls to the requested choice", () => {
    const tabs = {
      dataset: {} as Record<string, string | undefined>,
      dispatchEvent: () => true,
    };
    const root = {
      querySelectorAll: () => [tabs] as unknown as NodeListOf<HTMLDivElement>,
    };

    syncThemeChoiceTabs("light", root as unknown as ParentNode);

    expect(tabs.dataset.defaultValue).toBe("light");
    expect(tabs.dataset.value).toBe("light");
  });

  it("builds an inline script that uses the shared storage key and state attrs", () => {
    const script = buildIframeThemeSyncInlineScript();

    expect(script).toContain(STARLIGHT_THEME_STORAGE_KEY);
    expect(script).toContain("dataset.themeChoice");
    expect(script).toContain("prefers-color-scheme: light");
  });
});
