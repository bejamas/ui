import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import {
  buildInitUrl,
  extractOptionsForShadcnInit,
  resolveDesignSystemConfig,
} from "../src/commands/init";

function createInitLikeCommand() {
  return new Command()
    .allowUnknownOption(true)
    .exitOverride()
    .argument("[components...]")
    .option("-t, --template <template>")
    .option("-b, --base-color <base-color>")
    .option("-p, --preset <preset>")
    .option("--theme-ref <theme-ref>")
    .option("-y, --yes", "skip confirmation prompt.", false)
    .option("-d, --defaults", "use default configuration.", false)
    .option("-f, --force", "force overwrite of existing configuration.", false)
    .option("-c, --cwd <cwd>", "cwd", process.cwd())
    .option("-s, --silent", "mute output.", false)
    .option("--src-dir", "use the src directory.", false)
    .option("--no-src-dir", "do not use the src directory.")
    .option("--css-variables", "use css variables.", true)
    .option("--no-css-variables", "do not use css variables.")
    .option("--no-base-style", "do not install the base style.")
    .option("--rtl", "enable RTL", false)
    .option("--lang <lang>", "set rtl language")
    .option("--reinstall", "re-install existing UI components.")
    .option("--no-reinstall", "do not re-install existing UI components.");
}

describe("init RTL language support", () => {
  test("applies the requested RTL language when RTL is enabled", () => {
    const config = resolveDesignSystemConfig({
      baseColor: undefined,
      preset: undefined,
      template: "astro",
      rtl: true,
      lang: "he",
    });

    expect(config.rtl).toBe(true);
    expect(config.rtlLanguage).toBe("he");
  });

  test("falls back to Arabic when RTL is disabled", () => {
    const config = resolveDesignSystemConfig({
      baseColor: undefined,
      preset: undefined,
      template: "astro",
      rtl: false,
      lang: "fa",
    });

    expect(config.rtl).toBe(false);
    expect(config.rtlLanguage).toBe("ar");
  });

  test("includes lang in the init URL only for RTL presets", () => {
    const rtlUrl = buildInitUrl({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: true,
      rtlLanguage: "fa",
    });
    const ltrUrl = buildInitUrl({
      style: "juno",
      baseColor: "neutral",
      theme: "neutral",
      iconLibrary: "lucide",
      font: "geist",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
      template: "astro",
      rtl: false,
      rtlLanguage: "he",
    });

    expect(rtlUrl).toContain("rtl=true");
    expect(rtlUrl).toContain("lang=fa");
    expect(ltrUrl).not.toContain("lang=");
  });

  test("uses the configured UI base URL for localhost init flows", () => {
    const url = buildInitUrl(
      {
        style: "juno",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "geist",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "default",
        template: "astro",
        rtl: false,
        rtlLanguage: "ar",
      },
      undefined,
      {
        ...process.env,
        BEJAMAS_UI_URL: "http://localhost:4322/",
      },
    );

    expect(url.startsWith("http://localhost:4322/init?")).toBe(true);
  });

  test("derives the init URL from REGISTRY_URL when only local /r is provided", () => {
    const url = buildInitUrl(
      {
        style: "juno",
        baseColor: "neutral",
        theme: "neutral",
        iconLibrary: "lucide",
        font: "geist",
        radius: "default",
        menuAccent: "subtle",
        menuColor: "default",
        template: "astro",
        rtl: false,
        rtlLanguage: "ar",
      },
      undefined,
      {
        ...process.env,
        REGISTRY_URL: "http://localhost:4322/r",
      },
    );

    expect(url.startsWith("http://localhost:4322/init?")).toBe(true);
  });

  test("forwards only explicit init control flags to shadcn", () => {
    const cmd = createInitLikeCommand();
    cmd.parse([
      "node",
      "bejamas",
      "init",
      "--force",
      "--yes",
      "--reinstall",
      "--preset",
      "ad3qkJ7",
    ]);

    const forwarded = extractOptionsForShadcnInit(
      ["init", "--force", "--yes", "--reinstall", "--preset", "ad3qkJ7"],
      cmd,
    );

    expect(forwarded).toEqual(["--yes", "--force", "--reinstall"]);
  });

  test("does not forward implicit --yes and preserves --no-reinstall", () => {
    const cmd = createInitLikeCommand();
    cmd.parse(["node", "bejamas", "init", "--no-reinstall"]);

    const forwarded = extractOptionsForShadcnInit(
      ["init", "--no-reinstall"],
      cmd,
    );

    expect(forwarded).toEqual(["--no-reinstall"]);
  });

  test("preserves passthrough init flags after --", () => {
    const cmd = createInitLikeCommand();
    cmd.parse(["node", "bejamas", "init", "--", "--debug"]);

    const forwarded = extractOptionsForShadcnInit(
      ["init", "--", "--debug"],
      cmd,
    );

    expect(forwarded).toEqual(["--", "--debug"]);
  });
});
