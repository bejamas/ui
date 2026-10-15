import { describe, expect, test } from "bun:test";
import {
  checkUiPackageSync,
  toPackageName,
} from "../../ui/scripts/generate-from-style-registry";

describe("ui package sync", () => {
  test("matches versioned registry dependencies by package name", () => {
    expect(toPackageName("@data-slot/collapsible@^1.1.1")).toBe(
      "@data-slot/collapsible",
    );
    expect(toPackageName("@data-slot/collapsible")).toBe(
      "@data-slot/collapsible",
    );
    expect(toPackageName("clsx@^2.1.1")).toBe("clsx");
    expect(toPackageName("clsx")).toBe("clsx");
  });

  test("packages/ui is in sync with the default style registry", async () => {
    const result = await checkUiPackageSync();

    expect(result.missingDependencies).toEqual([]);
    expect(result.staleFiles).toEqual([]);
    expect(result.unexpectedFiles).toEqual([]);
  });
});
