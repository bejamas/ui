import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { refreshCurrentThemeStylesheet } from "./apply-docs-preset";

const ACTIVE_SELECTOR = "link[data-current-theme-stylesheet]";
const PENDING_SELECTOR = "link[data-pending-current-theme-stylesheet]";

type Listener = (event: Event) => void;

class FakeLinkElement {
  href = "";
  rel = "stylesheet";
  private attributes = new Map<string, string>();
  private listeners = new Map<string, Set<Listener>>();

  constructor(
    private readonly document: FakeDocument,
    href = "",
  ) {
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

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
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

  insertAdjacentElement(position: InsertPosition, element: FakeLinkElement) {
    if (position !== "afterend") {
      throw new Error(`Unsupported insert position: ${position}`);
    }

    this.document.insertAfter(this, element);
    return element;
  }

  remove() {
    this.document.remove(this);
  }
}

class FakeDocument {
  links: FakeLinkElement[] = [];

  querySelector<T extends FakeLinkElement>(selector: string) {
    return (this.querySelectorAll(selector)[0] ?? null) as T | null;
  }

  querySelectorAll<T extends FakeLinkElement>(selector: string) {
    if (selector === ACTIVE_SELECTOR) {
      return this.links.filter((link) =>
        link.hasAttribute("data-current-theme-stylesheet"),
      ) as T[];
    }

    if (selector === PENDING_SELECTOR) {
      return this.links.filter((link) =>
        link.hasAttribute("data-pending-current-theme-stylesheet"),
      ) as T[];
    }

    if (selector === "link") {
      return [...this.links] as T[];
    }

    return [] as T[];
  }

  append(link: FakeLinkElement) {
    this.links.push(link);
  }

  insertAfter(target: FakeLinkElement, link: FakeLinkElement) {
    const index = this.links.indexOf(target);
    if (index === -1) {
      this.links.push(link);
      return;
    }

    this.links.splice(index + 1, 0, link);
  }

  remove(link: FakeLinkElement) {
    this.links = this.links.filter((entry) => entry !== link);
  }
}

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

function createEnvironment() {
  const document = new FakeDocument();
  const window = {
    location: { origin: "https://ui.bejamas.com" },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
    setTimeout,
  } as unknown as Window & typeof globalThis;

  globalThis.document = document as unknown as Document;
  globalThis.window = window;

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
});
