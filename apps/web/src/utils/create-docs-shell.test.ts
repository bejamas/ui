import { afterEach, describe, expect, test } from "bun:test";
import { encodePreset } from "@bejamas/create-config/browser";
import {
  CREATE_DOCS_ROOT_ATTRIBUTE,
  CREATE_DOCS_ROOT_STYLE_ATTRIBUTE,
  buildCreateDocsRootPrepaintScript,
} from "./create-docs-shell";

type RootStub = {
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

const originalDocument = globalThis.document;
const originalLocation = globalThis.location;
const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.location = originalLocation;
  globalThis.localStorage = originalLocalStorage;
});

describe("create docs-root prepaint script", () => {
  test("prefers explicit style search params over preset, cookie, localStorage, and default", () => {
    const root = runPrepaintScript({
      search: `?style=maia&preset=${encodePreset({ style: "lyra" })}`,
      cookiePreset: encodePreset({ style: "vega" }),
      storedPreset: encodePreset({ style: "nova" }),
    });

    expect(root.getAttribute(CREATE_DOCS_ROOT_ATTRIBUTE)).toBe("");
    expect(root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe("style-maia");
  });

  test("falls back from query preset to cookie to localStorage, then default", () => {
    const fromCookie = runPrepaintScript({
      search: "?preset=invalid",
      cookiePreset: encodePreset({ style: "vega" }),
      storedPreset: encodePreset({ style: "nova" }),
    });
    const fromStorage = runPrepaintScript({
      cookiePreset: null,
      storedPreset: encodePreset({ style: "nova" }),
    });
    const fromDefault = runPrepaintScript({
      search: "?preset=invalid",
      cookiePreset: "invalid",
      storedPreset: "invalid",
    });

    expect(fromCookie.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe(
      "style-vega",
    );
    expect(fromStorage.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe(
      "style-nova",
    );
    expect(fromDefault.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe(
      "style-juno",
    );
  });

  test("decodes shared luma b-codes from persisted preset sources", () => {
    const root = runPrepaintScript({
      storedPreset: encodePreset({
        style: "luma",
        theme: "neutral",
      }),
    });

    expect(root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)).toBe("style-luma");
  });
});

function runPrepaintScript(options: {
  search?: string;
  cookiePreset?: string | null;
  storedPreset?: string | null;
}) {
  const root = createRootStub();
  const cookieValue =
    options.cookiePreset === undefined
      ? ""
      : options.cookiePreset === null
        ? ""
        : `theme=${encodeURIComponent(options.cookiePreset)}`;

  globalThis.document = {
    cookie: cookieValue,
    documentElement: root,
  } as typeof document;
  globalThis.location = {
    search: options.search ?? "",
  } as typeof location;
  globalThis.localStorage =
    options.storedPreset === undefined
      ? originalLocalStorage
      : ({
          getItem(key: string) {
            return key === "theme-preset" ? options.storedPreset ?? null : null;
          },
        } as typeof localStorage);

  new Function(buildCreateDocsRootPrepaintScript())();

  return root;
}

function createRootStub(): RootStub {
  const attributes = new Map<string, string>();
  const classNames = new Set<string>();

  return {
    classList: {
      add: (...tokens: string[]) => {
        for (const token of tokens) {
          classNames.add(token);
        }
      },
      remove: (...tokens: string[]) => {
        for (const token of tokens) {
          classNames.delete(token);
        }
      },
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
  };
}
