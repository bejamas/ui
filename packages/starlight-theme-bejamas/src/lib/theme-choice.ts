export const STARLIGHT_THEME_STORAGE_KEY = "starlight-theme";
export const THEME_TOGGLE_CHANGED_EVENT = "theme-toggle-changed";

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

type ThemeStorageReader = Pick<Storage, "getItem"> | null | undefined;
type ThemeStorageWriter = Pick<Storage, "setItem"> | null | undefined;

const THEME_CHOICE_TAB_SELECTOR = '[data-slot="tabs"][data-theme-choice-tabs]';

function getElementsWithSelf<T extends Element>(
  root: ParentNode,
  selector: string,
): T[] {
  const matches: T[] = [];

  if (
    typeof Element !== "undefined" &&
    root instanceof Element &&
    root.matches(selector)
  ) {
    matches.push(root as T);
  }

  matches.push(...Array.from(root.querySelectorAll<T>(selector)));

  return matches;
}

export function parseStoredThemeChoice(value: unknown): ThemeChoice {
  return value === "auto" || value === "dark" || value === "light"
    ? value
    : "auto";
}

export function loadStoredThemeChoice(storage: ThemeStorageReader): ThemeChoice {
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
  storage: ThemeStorageWriter,
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

function syncThemeChoiceTabControls(
  themeChoice: ThemeChoice,
  root: ParentNode,
): void {
  const tabsRoots = new Set<HTMLElement>();

  for (const tabsRoot of getElementsWithSelf<HTMLElement>(
    root,
    THEME_CHOICE_TAB_SELECTOR,
  )) {
    tabsRoots.add(tabsRoot);
  }

  for (const picker of getElementsWithSelf<HTMLElement>(
    root,
    "starlight-theme-select",
  )) {
    const tabsRoot = picker.querySelector<HTMLElement>(THEME_CHOICE_TAB_SELECTOR);
    if (tabsRoot) {
      tabsRoots.add(tabsRoot);
    }
  }

  for (const tabsRoot of tabsRoots) {
    tabsRoot.dataset.defaultValue = themeChoice;
    tabsRoot.dataset.value = themeChoice;
    tabsRoot.dispatchEvent(
      new CustomEvent("tabs:set", { detail: { value: themeChoice } }),
    );
  }
}

function syncLegacyThemeChoiceSelectControls(
  themeChoice: ThemeChoice,
  root: ParentNode,
): void {
  for (const picker of getElementsWithSelf<HTMLElement>(
    root,
    "starlight-theme-select",
  )) {
    const nativeSelect = picker.querySelector<HTMLSelectElement>("select");
    if (nativeSelect) {
      nativeSelect.value = themeChoice;
    }

    const selectRoot = picker.querySelector<HTMLElement>(
      '#starlight-theme-select, [data-slot="select"]',
    );
    if (!selectRoot) {
      continue;
    }

    selectRoot.dataset.defaultValue = themeChoice;
    selectRoot.dataset.value = themeChoice;
    selectRoot.dispatchEvent(
      new CustomEvent("select:set", { detail: { value: themeChoice } }),
    );
  }
}

export function syncThemeChoiceControls(
  themeChoice: ThemeChoice,
  root: ParentNode = document,
): void {
  syncThemeChoiceTabControls(themeChoice, root);
  syncLegacyThemeChoiceSelectControls(themeChoice, root);
}

export function dispatchThemeToggleChange(
  target: EventTarget,
  themeMode: ThemeMode,
  themeChoice: ThemeChoice,
): void {
  target.dispatchEvent(
    new CustomEvent(THEME_TOGGLE_CHANGED_EVENT, {
      detail: {
        theme: themeMode,
        themeChoice,
      },
    }),
  );
}

export function setThemeChoice(
  themeChoice: ThemeChoice,
  options: {
    storage?: ThemeStorageWriter;
    root?: ThemeRootElement;
    prefersLight?: boolean;
    controlsRoot?: ParentNode;
    dispatchTarget?: EventTarget;
    emitEvent?: boolean;
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
  syncThemeChoiceControls(themeChoice, options.controlsRoot ?? document);

  if (options.emitEvent !== false) {
    dispatchThemeToggleChange(
      options.dispatchTarget ?? window,
      effectiveTheme,
      themeChoice,
    );
  }

  return effectiveTheme;
}

export function buildThemeChoiceBootstrapInlineScript(): string {
  return `(function () {
  const storageKey = ${JSON.stringify(STARLIGHT_THEME_STORAGE_KEY)};
  const eventName = ${JSON.stringify(THEME_TOGGLE_CHANGED_EVENT)};
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
    const themeMode = resolveThemeMode(
      themeChoice,
      matchMedia("(prefers-color-scheme: light)").matches,
    );
    const root = document.documentElement;

    root.dataset.theme = themeMode;
    root.dataset.themeChoice = themeChoice;
    root.classList.remove("light", "dark");
    root.classList.add(themeMode);

    return themeMode;
  };
  const syncThemeChoiceControls = (themeChoice) => {
    document
      .querySelectorAll('[data-slot="tabs"][data-theme-choice-tabs]')
      .forEach((tabsRoot) => {
        tabsRoot.dataset.defaultValue = themeChoice;
        tabsRoot.dataset.value = themeChoice;
        tabsRoot.dispatchEvent(
          new CustomEvent("tabs:set", { detail: { value: themeChoice } }),
        );
      });

    document.querySelectorAll("starlight-theme-select").forEach((picker) => {
      const nativeSelect = picker.querySelector("select");
      if (nativeSelect instanceof HTMLSelectElement) {
        nativeSelect.value = themeChoice;
      }

      const selectRoot = picker.querySelector(
        '#starlight-theme-select, [data-slot="select"]',
      );
      if (!(selectRoot instanceof HTMLElement)) {
        return;
      }

      selectRoot.dataset.defaultValue = themeChoice;
      selectRoot.dataset.value = themeChoice;
      selectRoot.dispatchEvent(
        new CustomEvent("select:set", { detail: { value: themeChoice } }),
      );
    });
  };
  const dispatchThemeToggleChange = (themeMode, themeChoice) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          theme: themeMode,
          themeChoice,
        },
      }),
    );
  };
  const syncThemeChoice = (themeChoice, emitEvent) => {
    const themeMode = applyThemeModeToRoot(themeChoice);
    syncThemeChoiceControls(themeChoice);
    if (emitEvent) {
      dispatchThemeToggleChange(themeMode, themeChoice);
    }
  };
  const syncStoredThemeChoice = (emitEvent) => {
    syncThemeChoice(loadStoredThemeChoice(), emitEvent);
  };
  const mediaQuery = matchMedia("(prefers-color-scheme: light)");
  const onMediaChange = () => {
    if (loadStoredThemeChoice() === "auto") {
      syncThemeChoice("auto", true);
    }
  };

  syncStoredThemeChoice(false);

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) {
      syncStoredThemeChoice(true);
    }
  });

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onMediaChange);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(onMediaChange);
  }
})();`;
}
