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

type ThemeClassList = ThemeRoot["classList"] & {
  contains?: (token: string) => boolean;
};

type ThemeRootElement = ThemeRoot & {
  classList: ThemeClassList;
};

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

export function storeThemeChoice(
  storage: Pick<Storage, "setItem"> | null | undefined,
  themeChoice: ThemeChoice,
): void {
  try {
    storage?.setItem(
      STARLIGHT_THEME_STORAGE_KEY,
      themeChoice === "light" || themeChoice === "dark" ? themeChoice : "",
    );
  } catch {}
}

export function getThemeChoiceFromRoot(
  root: Pick<ThemeRoot, "dataset">,
): ThemeChoice {
  return parseStoredThemeChoice(root.dataset.themeChoice);
}

export function getThemeModeFromRoot(
  root: ThemeRootElement,
  fallbackMode: ThemeMode,
): ThemeMode {
  if (root.dataset.theme === "light" || root.dataset.theme === "dark") {
    return root.dataset.theme;
  }

  if (root.classList.contains?.("dark")) {
    return "dark";
  }

  if (root.classList.contains?.("light")) {
    return "light";
  }

  return fallbackMode;
}

export function syncThemeChoiceTabs(
  themeChoice: ThemeChoice,
  root: ParentNode = document,
): void {
  root
    .querySelectorAll<HTMLDivElement>('starlight-theme-select [data-slot="tabs"]')
    .forEach((tabsEl) => {
      tabsEl.dataset.defaultValue = themeChoice;
      tabsEl.dataset.value = themeChoice;
      tabsEl.dispatchEvent(
        new CustomEvent("tabs:set", { detail: { value: themeChoice } }),
      );
    });
}

export function setGlobalThemeChoice(
  themeChoice: ThemeChoice,
  options: {
    storage?: Pick<Storage, "setItem"> | null | undefined;
    root?: ThemeRootElement;
    prefersLight?: boolean;
    syncPickers?: (themeChoice: ThemeChoice) => void;
    dispatchChange?: (effectiveTheme: ThemeMode, themeChoice: ThemeChoice) => void;
    tabsRoot?: ParentNode;
  } = {},
): ThemeMode {
  const root = options.root ?? (document.documentElement as HTMLElement);
  const effectiveTheme = resolveThemeMode(
    themeChoice,
    options.prefersLight ??
      window.matchMedia("(prefers-color-scheme: light)").matches,
  );

  applyThemeModeToRoot(root, themeChoice, effectiveTheme);
  storeThemeChoice(options.storage ?? localStorage, themeChoice);
  options.syncPickers?.(themeChoice);
  syncThemeChoiceTabs(themeChoice, options.tabsRoot ?? document);
  options.dispatchChange?.(effectiveTheme, themeChoice);

  return effectiveTheme;
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
