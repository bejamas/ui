export const STARLIGHT_THEME_STORAGE_KEY = "starlight-theme";

export type ThemeChoice = "auto" | "dark" | "light";
export type ThemeMode = "dark" | "light";

export interface ThemeRoot {
  dataset: Record<string, string | undefined>;
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
}

export function parseStoredThemeChoice(value: unknown): ThemeChoice {
  return value === "auto" || value === "dark" || value === "light"
    ? value
    : "auto";
}

export function loadStoredThemeChoice(
  storage: Pick<Storage, "getItem"> | null | undefined,
): ThemeChoice {
  try {
    return parseStoredThemeChoice(
      storage?.getItem(STARLIGHT_THEME_STORAGE_KEY),
    );
  } catch {
    return "auto";
  }
}

export function resolveThemeMode(
  themeChoice: ThemeChoice,
  prefersLight: boolean,
): ThemeMode {
  if (themeChoice === "light" || themeChoice === "dark") {
    return themeChoice;
  }

  return prefersLight ? "light" : "dark";
}

export function applyThemeModeToRoot(
  root: ThemeRoot,
  themeChoice: ThemeChoice,
  themeMode: ThemeMode,
): void {
  root.dataset.theme = themeMode;
  root.dataset.themeChoice = themeChoice;
  root.classList.remove("light", "dark");
  root.classList.add(themeMode);
}

export function buildIframeThemeSyncInlineScript(): string {
  return `(function () {
  const storageKey = ${JSON.stringify(STARLIGHT_THEME_STORAGE_KEY)};
  const parseStoredThemeChoice = (value) =>
    value === "auto" || value === "dark" || value === "light" ? value : "auto";
  const loadStoredThemeChoice = () => {
    try {
      return parseStoredThemeChoice(
        typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null,
      );
    } catch {
      return "auto";
    }
  };
  const resolveThemeMode = (themeChoice, prefersLight) => {
    if (themeChoice === "light" || themeChoice === "dark") {
      return themeChoice;
    }

    return prefersLight ? "light" : "dark";
  };
  const applyThemeModeToRoot = (themeChoice) => {
    const root = document.documentElement;
    const themeMode = resolveThemeMode(
      themeChoice,
      matchMedia("(prefers-color-scheme: light)").matches,
    );

    root.dataset.theme = themeMode;
    root.dataset.themeChoice = themeChoice;
    root.classList.remove("light", "dark");
    root.classList.add(themeMode);
  };
  const syncThemeMode = () => {
    applyThemeModeToRoot(loadStoredThemeChoice());
  };
  const mediaQuery = matchMedia("(prefers-color-scheme: light)");
  const onMediaChange = () => {
    if (loadStoredThemeChoice() === "auto") {
      syncThemeMode();
    }
  };

  syncThemeMode();

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) {
      syncThemeMode();
    }
  });

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onMediaChange);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(onMediaChange);
  }
})();`;
}
