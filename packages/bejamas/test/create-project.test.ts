import { describe, expect, test } from "bun:test";
import {
  buildTemplateArchiveUrl,
  resolveRemoteTemplateRefs,
} from "../src/utils/create-project";

describe("template archive fallback", () => {
  test("prefers an explicit template ref and preserves release fallbacks", () => {
    const refs = resolveRemoteTemplateRefs(
      {
        gitHead: "abcdef123456",
        version: "0.2.12",
      },
      {
        BEJAMAS_TEMPLATE_REF: "feature/template-fix",
      },
    );

    expect(refs).toEqual([
      "feature/template-fix",
      "abcdef123456",
      "bejamas@0.2.12",
      "main",
    ]);
  });

  test("skips package tags for prerelease versions", () => {
    const refs = resolveRemoteTemplateRefs({
      gitHead: "fedcba654321",
      version: "0.3.0-canary.1",
    });

    expect(refs).toEqual(["fedcba654321", "main"]);
  });

  test("builds GitHub tarball URLs against the Bejamas UI repo", () => {
    expect(buildTemplateArchiveUrl("bejamas@0.2.12")).toBe(
      "https://api.github.com/repos/bejamas/ui/tarball/bejamas%400.2.12",
    );
    expect(buildTemplateArchiveUrl("main")).toBe(
      "https://api.github.com/repos/bejamas/ui/tarball/main",
    );
  });
});
