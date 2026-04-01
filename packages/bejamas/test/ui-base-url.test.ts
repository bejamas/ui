import { describe, expect, test } from "bun:test";
import {
  DEFAULT_REGISTRY_URL,
  DEFAULT_UI_BASE_URL,
  resolveRegistryUrl,
  resolveUiBaseUrl,
} from "../src/utils/ui-base-url";

describe("CLI UI URL resolution", () => {
  test("falls back to the production UI base URL by default", () => {
    expect(resolveUiBaseUrl({} as NodeJS.ProcessEnv)).toBe(DEFAULT_UI_BASE_URL);
    expect(resolveRegistryUrl({} as NodeJS.ProcessEnv)).toBe(
      DEFAULT_REGISTRY_URL,
    );
  });

  test("uses BEJAMAS_UI_URL for both init and registry defaults", () => {
    const env = {
      BEJAMAS_UI_URL: "http://localhost:4322/",
    } as NodeJS.ProcessEnv;

    expect(resolveUiBaseUrl(env)).toBe("http://localhost:4322");
    expect(resolveRegistryUrl(env)).toBe("http://localhost:4322/r");
  });

  test("prefers REGISTRY_URL and derives the UI base URL from a /r path", () => {
    const env = {
      REGISTRY_URL: "http://localhost:4322/r/",
    } as NodeJS.ProcessEnv;

    expect(resolveRegistryUrl(env)).toBe("http://localhost:4322/r");
    expect(resolveUiBaseUrl(env)).toBe("http://localhost:4322");
  });
});
