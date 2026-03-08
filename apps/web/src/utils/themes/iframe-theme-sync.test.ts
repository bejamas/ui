import { describe, expect, it } from "bun:test";
import {
  STARLIGHT_THEME_STORAGE_KEY,
  applyThemeModeToRoot,
  buildIframeThemeSyncInlineScript,
  loadStoredThemeChoice,
  parseStoredThemeChoice,
  resolveThemeMode,
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

  it("builds an inline script that uses the shared storage key and state attrs", () => {
    const script = buildIframeThemeSyncInlineScript();

    expect(script).toContain(STARLIGHT_THEME_STORAGE_KEY);
    expect(script).toContain("dataset.themeChoice");
    expect(script).toContain("prefers-color-scheme: light");
  });
});
