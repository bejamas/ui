import { describe, expect, test } from "bun:test";
import {
  buildThemeStylesheetInlineScript,
  getThemeStylesheetHref,
  refreshThemeStylesheet,
  THEME_STYLESHEET_ATTRIBUTE,
} from "./theme-stylesheet";

const BASE = "/r/themes/current-theme.css";

class FakeLink {
  attributes = new Map<string, string>();
  listeners = new Map<string, () => void>();
  isConnected = true;
  rel = "";
  constructor(private readonly doc: FakeDocument) {}
  get href() {
    return this.attributes.get("href") ?? "";
  }
  set href(value: string) {
    this.attributes.set("href", value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  dispatch(type: string) {
    this.listeners.get(type)?.();
  }
  cloneNode() {
    const clone = new FakeLink(this.doc);
    clone.rel = this.rel;
    clone.attributes = new Map(this.attributes);
    return clone;
  }
  after(link: FakeLink) {
    this.doc.links.splice(this.doc.links.indexOf(this) + 1, 0, link);
  }
  remove() {
    this.isConnected = false;
    this.doc.links.splice(this.doc.links.indexOf(this), 1);
  }
}

class FakeDocument {
  links: FakeLink[] = [];
  constructor(public cookie: string) {}
  addLink(href: string) {
    const link = new FakeLink(this);
    link.setAttribute(THEME_STYLESHEET_ATTRIBUTE, BASE);
    link.href = href;
    this.links.push(link);
    return link;
  }
  querySelectorAll() {
    return [...this.links];
  }
  hrefs() {
    return this.links.map((link) => link.href);
  }
}

function refresh(doc: FakeDocument) {
  refreshThemeStylesheet(doc as unknown as Document);
}

describe("theme stylesheet versioning", () => {
  test("versions the URL with only the cookies the theme endpoint reads", () => {
    const href = getThemeStylesheetHref(
      BASE,
      "starlight-theme=dark; theme=vega%7Cswatches; theme-ref=abc; other=1",
    );
    expect(href).toBe(
      `${BASE}?v=${encodeURIComponent("vega%7Cswatches|abc")}`,
    );
    expect(getThemeStylesheetHref(BASE, "other=1")).toBe(
      `${BASE}?v=${encodeURIComponent("|")}`,
    );
  });

  test("the inline bootstrap script writes the same URL", () => {
    for (const cookie of [
      "theme=c6FTeuysS%7Coklch(0.9%200.1%20128)%7CVega; theme-ref=",
      "theme-ref=ref-1; theme=default",
      "",
    ]) {
      let inserted: FakeLink | undefined;
      const doc = new FakeDocument(cookie);
      const fakeDocument = {
        cookie,
        createElement: () => new FakeLink(doc),
        currentScript: {
          replaceWith: (link: FakeLink) => {
            inserted = link;
          },
        },
      };
      new Function("document", buildThemeStylesheetInlineScript(BASE))(
        fakeDocument,
      );

      expect(inserted?.rel).toBe("stylesheet");
      expect(inserted?.getAttribute(THEME_STYLESHEET_ATTRIBUTE)).toBe(BASE);
      expect(inserted?.href).toBe(getThemeStylesheetHref(BASE, cookie));
    }
  });
});

describe("refreshThemeStylesheet", () => {
  test("does nothing while the cookies still match", () => {
    const doc = new FakeDocument("theme=juno");
    doc.addLink(getThemeStylesheetHref(BASE, doc.cookie));
    refresh(doc);
    expect(doc.links).toHaveLength(1);
  });

  test("keeps the old theme until the new stylesheet loads", () => {
    const doc = new FakeDocument("theme=juno");
    doc.addLink(getThemeStylesheetHref(BASE, doc.cookie));
    doc.cookie = "theme=luma";
    refresh(doc);

    const nextHref = getThemeStylesheetHref(BASE, "theme=luma");
    expect(doc.hrefs()).toEqual([
      getThemeStylesheetHref(BASE, "theme=juno"),
      nextHref,
    ]);
    doc.links[1].dispatch("load");
    expect(doc.hrefs()).toEqual([nextHref]);
  });

  test("a slower earlier switch never removes a newer stylesheet", () => {
    const doc = new FakeDocument("theme=juno");
    doc.addLink(getThemeStylesheetHref(BASE, doc.cookie));
    doc.cookie = "theme=luma";
    refresh(doc);
    const luma = doc.links[1];
    doc.cookie = "theme=lyra";
    refresh(doc);
    const lyra = doc.links[2];

    lyra.dispatch("load");
    expect(doc.links).toEqual([lyra]);
    luma.dispatch("load");
    expect(doc.links).toEqual([lyra]);
  });

  test("keeps the working stylesheet when the new one fails to load", () => {
    const doc = new FakeDocument("theme=juno");
    const current = doc.addLink(getThemeStylesheetHref(BASE, doc.cookie));
    doc.cookie = "theme=luma";
    refresh(doc);
    doc.links[1].dispatch("error");
    expect(doc.links).toEqual([current]);
  });
});
