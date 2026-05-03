import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  encodePreset,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

import {
  decodePresetCode,
  getPresetUrl,
} from "../src/commands/preset";
import { transformDesignSystemCss } from "../src/utils/apply-design-system";
import {
  patchAstroConfigSource,
  toManagedAstroFont,
} from "../src/utils/astro-fonts";
import { createConfig } from "../src/utils/get-config";
import { resolveProjectPreset } from "../src/utils/preset-resolve";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

async function createTempProject() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bejamas-preset-"));
  tempDirs.push(dir);
  return dir;
}

const baseCss = `@import "tailwindcss";
@import "bejamas/tailwind.css";

@theme inline {
  --font-heading: var(--font-heading);
}

:root {
  --primary: initial;
}

.dark {
  --primary: initial;
}
`;

const lyraMonoConfig: DesignSystemConfig = {
  style: "lyra",
  baseColor: "zinc",
  theme: "cyan",
  iconLibrary: "tabler",
  font: "geist-mono",
  fontHeading: "inherit",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
};

describe("preset command helpers", () => {
  test("decodes older preset codes and derives compatibility chart color", () => {
    const result = decodePresetCode("abVJxYW");

    expect(result.version).toBe("a");
    expect(result.values).toMatchObject({
      style: "maia",
      baseColor: "neutral",
      theme: "neutral",
      chartColor: "blue",
    });
    expect(result.derived).toEqual(["chartColor"]);
    expect(result.url).toBe("https://ui.bejamas.com/create?preset=abVJxYW");
  });

  test("builds a Bejamas create URL for a preset code", () => {
    const code = encodePreset({
      style: "juno",
      theme: "bejamas-blue",
    });

    expect(getPresetUrl(code)).toBe(
      `https://ui.bejamas.com/create?preset=${code}`,
    );
  });

  test("rejects invalid preset codes", () => {
    expect(() => decodePresetCode("not-a-preset")).toThrow(
      "Invalid preset code",
    );
  });
});

describe("resolveProjectPreset", () => {
  test("resolves a preset from Bejamas config, CSS, and Astro fonts", async () => {
    const cwd = await createTempProject();
    const cssPath = path.join(cwd, "src/styles/globals.css");
    const astroConfigPath = path.join(cwd, "astro.config.mjs");
    const managedFonts = [
      toManagedAstroFont(lyraMonoConfig.font),
      lyraMonoConfig.fontHeading !== "inherit"
        ? toManagedAstroFont(`font-heading-${lyraMonoConfig.fontHeading}`)
        : null,
    ].filter((font): font is NonNullable<typeof font> => font !== null);

    await mkdir(path.dirname(cssPath), { recursive: true });
    await writeFile(cssPath, transformDesignSystemCss(baseCss, lyraMonoConfig));
    await writeFile(
      astroConfigPath,
      patchAstroConfigSource(
        `// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({});
`,
        managedFonts,
      ),
    );

    const config = createConfig({
      resolvedPaths: {
        cwd,
        tailwindCss: cssPath,
      },
      style: "bejamas-lyra",
      tailwind: {
        baseColor: "zinc",
        css: "src/styles/globals.css",
        cssVariables: true,
      },
      iconLibrary: "tabler",
      menuAccent: "subtle",
      menuColor: "default",
    });
    const resolved = await resolveProjectPreset(config);

    expect(resolved.fallbacks).toEqual([]);
    expect(resolved.values).toEqual({
      style: "lyra",
      baseColor: "zinc",
      theme: "cyan",
      iconLibrary: "tabler",
      font: "geist-mono",
      fontHeading: "inherit",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
    expect(resolved.code).toBe(encodePreset(resolved.values!));
  });
});
