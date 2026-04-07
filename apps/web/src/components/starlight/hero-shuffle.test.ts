import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const astroConfigFile = path.resolve(
  import.meta.dir,
  "../../../astro.config.mjs",
);
const heroFile = path.resolve(import.meta.dir, "./Hero.astro");
const scriptFile = path.resolve(
  import.meta.dir,
  "../../scripts/home-hero-shuffle.ts",
);

describe("homepage hero shuffle", () => {
  test("registers the custom Hero override in Astro config", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(source).toContain('Hero: "./src/components/starlight/Hero.astro"');
    expect(source).toContain('output: "server"');
  });

  test("renders the Shuffle CTA with a static count fallback", () => {
    const source = fs.readFileSync(heroFile, "utf8");

    expect(source).toContain(
      'import { formatShuffleCount } from "@/utils/shuffles";',
    );
    expect(source).not.toContain("getShuffleCount(");
    expect(source).toContain("data-hero-shuffle");
    expect(source).toContain("data-hero-shuffle-button");
    expect(source).toContain("data-hero-shuffle-count");
    expect(source).toContain("formattedShuffleCount");
    expect(source).toContain('import "@/scripts/home-hero-shuffle.ts";');
  });

  test("shuffles the full preset locally and tracks the updated count", () => {
    const source = fs.readFileSync(scriptFile, "utf8");

    expect(source).toContain(
      "createRandomDesignSystemConfig(getCurrentConfig())",
    );
    expect(source).toContain("buildDesignSystemThemeCss");
    expect(source).toContain("applyDocsPreset({");
    expect(source).toContain("optimisticThemeCss: buildDesignSystemThemeCss(config)");
    expect(source).toContain("getShuffleCountRequest()");
    expect(source).toContain("this.renderCount(this.getCount() + 1)");
    expect(source).toContain("incrementShuffleCountRequest()");
    expect(source).toContain("this.renderCount(nextCount)");
    expect(source).toContain("getStoredPreset()");
    expect(source).toContain("formatShuffleCount(count)");
    expect(source).toContain("data-hero-shuffle-button");
  });
});
