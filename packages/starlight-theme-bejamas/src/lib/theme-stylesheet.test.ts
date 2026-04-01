import { describe, expect, test } from "bun:test";
import { buildCurrentThemeStylesheetHref } from "./theme-stylesheet";

describe("current theme stylesheet helpers", () => {
  test("adds a cache-busting query param to relative hrefs", () => {
    expect(
      buildCurrentThemeStylesheetHref("/r/themes/current-theme.css", 123),
    ).toBe("/r/themes/current-theme.css?v=123");
  });

  test("preserves existing query params when cache-busting", () => {
    expect(
      buildCurrentThemeStylesheetHref("/r/themes/current-theme.css?foo=bar", 123),
    ).toBe("/r/themes/current-theme.css?foo=bar&v=123");
  });
});
