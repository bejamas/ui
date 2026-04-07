import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  applyDocsPreset,
  refreshCurrentThemeStylesheet,
} from "./apply-docs-preset";

const ACTIVE_SELECTOR = "link[data-current-theme-stylesheet]";
const PENDING_SELECTOR = "link[data-pending-current-theme-stylesheet]";
const OPTIMISTIC_SELECTOR = "style[data-optimistic-current-theme-stylesheet]";
const OPTIMISTIC_ATTRIBUTE = "data-optimistic-current-theme";

type Listener = (event: Event) => void;

type FakeElement = FakeLinkElement | FakeStyleElement;

class FakeElementBase {
  protected attributes = new Map<string, string>();

  constructor(protected readonly document: FakeDocument) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  insertAdjacentElement(position: InsertPosition, element: FakeElement) {
    if (position !== "afterend") {
      throw new Error(`Unsupported insert position: ${position}`);
    }

    this.document.insertAfter(this as unknown as FakeElement, element);
    return element;
  }

  remove() {
    this.document.remove(this as unknown as FakeElement);
  }
}

class FakeLinkElement extends FakeElementBase {
  href = "";
  rel = "stylesheet";
  private listeners = new Map<string, Set<Listener>>();

  constructor(document: FakeDocument, href = "") {
    super(document);
    this.href = href;
  }

  cloneNode() {
    const clone = new FakeLinkElement(this.document, this.href);
    clone.rel = this.rel;

    for (const [name, value] of this.attributes) {
      clone.attributes.set(name, value);
    }

    return clone;
  }

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event) {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
    return true;
  }
}

class FakeStyleElement extends FakeElementBase {
  textContent: string | null = "";
}

class FakeDocumentElement {
  private attributes = new Map<string, string>();

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
}

class FakeDocument {
  elements: FakeElement[] = [];
  cookie = "";
  documentElement = new FakeDocumentElement();

  head = {
    append: (element: FakeElement) => this.append(element),
  };

  createElement(tagName: string) {
    if (tagName === "style") {
      return new FakeStyleElement(this);
    }

    throw new Error(`Unsupported tag name: ${tagName}`);
  }

  querySelector<T extends FakeElement>(selector: string) {
    return (this.querySelectorAll(selector)[0] ?? null) as T | null;
  }

  querySelectorAll<T extends FakeElement>(selector: string) {
    if (selector === ACTIVE_SELECTOR) {
      return this.elements.filter(
        (element) =>
          element instanceof FakeLinkElement &&
          element.hasAttribute("data-current-theme-stylesheet"),
      ) as T[];
    }

    if (selector === PENDING_SELECTOR) {
      return this.elements.filter(
        (element) =>
          element instanceof FakeLinkElement &&
          element.hasAttribute("data-pending-current-theme-stylesheet"),
      ) as T[];
    }

    if (selector === OPTIMISTIC_SELECTOR) {
      return this.elements.filter(
        (element) =>
          element instanceof FakeStyleElement &&
          element.hasAttribute("data-optimistic-current-theme-stylesheet"),
      ) as T[];
    }

    if (selector === "link") {
      return this.elements.filter(
        (element) => element instanceof FakeLinkElement,
      ) as T[];
    }

    if (selector === "style") {
      return this.elements.filter(
        (element) => element instanceof FakeStyleElement,
      ) as T[];
    }

    if (selector === "*") {
      return [...this.elements] as T[];
    }

    return [] as T[];
  }

  append(element: FakeElement) {
    this.elements.push(element);
  }

  insertAfter(target: FakeElement, element: FakeElement) {
    const index = this.elements.indexOf(target);
    if (index === -1) {
      this.elements.push(element);
      return;
    }

    this.elements.splice(index + 1, 0, element);
  }

  remove(element: FakeElement) {
    this.elements = this.elements.filter((entry) => entry !== element);
  }
}

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

function createEnvironment() {
  const document = new FakeDocument();
  const storage = new Map<string, string>();
  const window = {
    location: { origin: "https://ui.bejamas.com" },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
    dispatchEvent: () => true,
    setTimeout,
  } as unknown as Window & typeof globalThis;

  globalThis.document = document as unknown as Document;
  globalThis.window = window;
  globalThis.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } as Storage;

  return { document };
}

function appendActiveStylesheet(document: FakeDocument, href?: string) {
  const stylesheet = new FakeLinkElement(
    document,
    href ?? "https://ui.bejamas.com/r/themes/current-theme.css",
  );
  stylesheet.setAttribute("data-current-theme-stylesheet", "");
  document.append(stylesheet);
  return stylesheet;
}

describe("refreshCurrentThemeStylesheet", () => {
  beforeEach(() => {
    createEnvironment();
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  });

  test("keeps the current stylesheet active until the replacement loads", async () => {
    const document = globalThis.document as unknown as FakeDocument;
    const currentStylesheet = appendActiveStylesheet(document);

    const refreshPromise = refreshCurrentThemeStylesheet();
    const pendingStylesheet =
      document.querySelector<FakeLinkElement>(PENDING_SELECTOR);

    expect(refreshPromise).toBeInstanceOf(Promise);
    expect(document.querySelectorAll("link")).toHaveLength(2);
    expect(document.querySelector(ACTIVE_SELECTOR)).toBe(currentStylesheet);
    expect(pendingStylesheet).not.toBeNull();
    expect(pendingStylesheet?.href).not.toBe(currentStylesheet.href);

    pendingStylesheet?.dispatchEvent(new Event("load"));
    await refreshPromise;

    const activeStylesheet =
      document.querySelector<FakeLinkElement>(ACTIVE_SELECTOR);
    expect(document.querySelectorAll("link")).toHaveLength(1);
    expect(document.querySelector(PENDING_SELECTOR)).toBeNull();
    expect(activeStylesheet).toBe(pendingStylesheet);
    expect(activeStylesheet?.href).toContain("/r/themes/current-theme.css?v=");
  });

  test("keeps the current stylesheet when the replacement fails to load", async () => {
    const document = globalThis.document as unknown as FakeDocument;
    const currentStylesheet = appendActiveStylesheet(document);

    const refreshPromise = refreshCurrentThemeStylesheet();
    const pendingStylesheet =
      document.querySelector<FakeLinkElement>(PENDING_SELECTOR);

    pendingStylesheet?.dispatchEvent(new Event("error"));
    await refreshPromise;

    expect(document.querySelectorAll("link")).toHaveLength(1);
    expect(document.querySelector(ACTIVE_SELECTOR)).toBe(currentStylesheet);
    expect(document.querySelector(PENDING_SELECTOR)).toBeNull();
  });

  test("cancels an older pending swap when a newer one starts", async () => {
    const document = globalThis.document as unknown as FakeDocument;
    appendActiveStylesheet(document);

    const firstRefresh = refreshCurrentThemeStylesheet();
    const firstPendingStylesheet =
      document.querySelector<FakeLinkElement>(PENDING_SELECTOR);

    const secondRefresh = refreshCurrentThemeStylesheet();
    const secondPendingStylesheet =
      document.querySelector<FakeLinkElement>(PENDING_SELECTOR);

    expect(secondPendingStylesheet).not.toBe(firstPendingStylesheet);
    expect(document.querySelectorAll(PENDING_SELECTOR)).toHaveLength(1);

    secondPendingStylesheet?.dispatchEvent(new Event("load"));
    await Promise.all([firstRefresh, secondRefresh]);

    expect(document.querySelectorAll("link")).toHaveLength(1);
    expect(document.querySelector(ACTIVE_SELECTOR)).toBe(
      secondPendingStylesheet,
    );
    expect(document.querySelector(PENDING_SELECTOR)).toBeNull();
  });

  test("keeps optimistic theme CSS active when the replacement fails to load", async () => {
    const document = globalThis.document as unknown as FakeDocument;
    const currentStylesheet = appendActiveStylesheet(document);

    const refreshPromise = applyDocsPreset({
      id: "test-preset",
      label: "Test preset",
      swatches: {
        primaryLight: "oklch(0.2 0 0)",
        accentLight: "oklch(0.7 0 0)",
        primaryDark: "oklch(0.98 0 0)",
        accentDark: "oklch(0.8 0 0)",
      },
      optimisticThemeCss: [
        "html:root { --font-sans: Test Sans; }",
        'html[data-theme="dark"], html.dark, .cn-menu-target.dark { --primary: Test Primary; }',
      ].join("\n\n"),
    });
    const pendingStylesheet =
      document.querySelector<FakeLinkElement>(PENDING_SELECTOR);
    const optimisticStylesheet =
      document.querySelector<FakeStyleElement>(OPTIMISTIC_SELECTOR);

    expect(document.querySelector(ACTIVE_SELECTOR)).toBe(currentStylesheet);
    expect(optimisticStylesheet?.textContent).toBe(
      [
        "html:root[data-optimistic-current-theme] { --font-sans: Test Sans; }",
        'html[data-optimistic-current-theme][data-theme="dark"], html[data-optimistic-current-theme].dark, html[data-optimistic-current-theme] .cn-menu-target.dark { --primary: Test Primary; }',
      ].join("\n\n"),
    );
    expect(document.documentElement.hasAttribute(OPTIMISTIC_ATTRIBUTE)).toBe(
      true,
    );
    expect(document.querySelectorAll("*")).toEqual([
      currentStylesheet,
      pendingStylesheet,
      optimisticStylesheet,
    ]);

    pendingStylesheet?.dispatchEvent(new Event("error"));
    await refreshPromise;

    expect(document.querySelector(ACTIVE_SELECTOR)).toBe(currentStylesheet);
    expect(document.querySelector(PENDING_SELECTOR)).toBeNull();
    expect(document.querySelector(OPTIMISTIC_SELECTOR)).toBe(
      optimisticStylesheet,
    );
    expect(document.documentElement.hasAttribute(OPTIMISTIC_ATTRIBUTE)).toBe(
      true,
    );
  });

  test("replaces or clears stale optimistic theme CSS on later preset applies", async () => {
    const document = globalThis.document as unknown as FakeDocument;
    appendActiveStylesheet(document);

    const firstRefresh = applyDocsPreset({
      id: "first-preset",
      label: "First preset",
      swatches: {
        primaryLight: "oklch(0.2 0 0)",
        accentLight: "oklch(0.7 0 0)",
        primaryDark: "oklch(0.98 0 0)",
        accentDark: "oklch(0.8 0 0)",
      },
      optimisticThemeCss: "html:root { --font-sans: First Sans; }",
    });
    document
      .querySelector<FakeLinkElement>(PENDING_SELECTOR)
      ?.dispatchEvent(new Event("load"));
    await firstRefresh;

    const secondRefresh = applyDocsPreset({
      id: "second-preset",
      label: "Second preset",
      swatches: {
        primaryLight: "oklch(0.3 0 0)",
        accentLight: "oklch(0.8 0 0)",
        primaryDark: "oklch(0.9 0 0)",
        accentDark: "oklch(0.7 0 0)",
      },
      optimisticThemeCss: "html:root { --font-sans: Second Sans; }",
    });
    const optimisticStylesheets =
      document.querySelectorAll<FakeStyleElement>(OPTIMISTIC_SELECTOR);

    expect(optimisticStylesheets).toHaveLength(1);
    expect(optimisticStylesheets[0]?.textContent).toBe(
      "html:root[data-optimistic-current-theme] { --font-sans: Second Sans; }",
    );
    expect(document.documentElement.hasAttribute(OPTIMISTIC_ATTRIBUTE)).toBe(
      true,
    );

    document
      .querySelector<FakeLinkElement>(PENDING_SELECTOR)
      ?.dispatchEvent(new Event("error"));
    await secondRefresh;

    const thirdRefresh = applyDocsPreset({
      id: "third-preset",
      label: "Third preset",
      swatches: {
        primaryLight: "oklch(0.4 0 0)",
        accentLight: "oklch(0.9 0 0)",
        primaryDark: "oklch(0.8 0 0)",
        accentDark: "oklch(0.6 0 0)",
      },
    });

    expect(document.querySelector(OPTIMISTIC_SELECTOR)).toBeNull();
    expect(document.documentElement.hasAttribute(OPTIMISTIC_ATTRIBUTE)).toBe(
      false,
    );

    document
      .querySelector<FakeLinkElement>(PENDING_SELECTOR)
      ?.dispatchEvent(new Event("error"));
    await thirdRefresh;
  });
});
