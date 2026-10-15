import { describe, expect, test } from "bun:test";
import { resolveTargetUrls, selectStages, stageList } from "../src/args";

describe("resolveTargetUrls", () => {
  test("uses the named flags without a warning", () => {
    expect(
      resolveTargetUrls({ original: "a.test", ported: "b.test" }, []),
    ).toEqual({
      original: "a.test",
      ported: "b.test",
    });
  });

  test("accepts two positional URLs with a warning naming each side", () => {
    const result = resolveTargetUrls({}, ["a.test", "b.test"]);
    expect(result).toMatchObject({ original: "a.test", ported: "b.test" });
    expect(result.warning).toBe(
      "Reading a.test as the original and b.test as the port. Use --original and --ported to avoid swapping them.",
    );
  });

  test("rejects mixed, partial and miscounted input", () => {
    expect(() =>
      resolveTargetUrls({ original: "a.test", ported: "b.test" }, ["c.test"]),
    ).toThrow("not both (got c.test)");
    expect(() => resolveTargetUrls({ original: "a.test" }, [])).toThrow(
      "Missing --ported <url>.",
    );
    expect(() => resolveTargetUrls({ ported: "b.test" }, [])).toThrow(
      "Missing --original <url>.",
    );
    expect(() => resolveTargetUrls({}, [])).toThrow("Pass both URLs");
    expect(() => resolveTargetUrls({}, ["a.test", "b.test", "c.test"])).toThrow(
      "Pass both URLs",
    );
  });
});

describe("stages", () => {
  test("parses stage lists and rejects unknown names", () => {
    expect(stageList("visual, quality")).toEqual(["visual", "quality"]);
    expect(() => stageList("visual,nope")).toThrow(
      "Expected a comma-separated",
    );
    expect(() => stageList(",")).toThrow("Expected a comma-separated");
  });

  test("applies --only and --skip", () => {
    expect(selectStages()).toEqual([
      "assets",
      "quality",
      "visual",
      "lighthouse",
    ]);
    expect(selectStages(["visual", "quality"], ["quality"])).toEqual([
      "visual",
    ]);
    expect(() => selectStages(["visual"], ["visual"])).toThrow(
      "No stages left to run.",
    );
  });
});
