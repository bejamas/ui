import path from "node:path";
import { Command } from "commander";
import { z } from "zod";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  designSystemConfigSchema,
  encodePreset,
  isPresetCode,
  normalizeDesignSystemConfig,
  RTL_LANGUAGE_VALUES,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";
import type { RegistryItem } from "shadcn/schema";

import { BASE_COLORS } from "@/src/registry/constants";
import { clearRegistryContext } from "@/src/registry/context";
import { preFlightInit } from "@/src/preflights/preflight-init";
import {
  applyDesignSystemToProject,
  syncAstroManagedFontCss,
  syncManagedTailwindCss,
} from "@/src/utils/apply-design-system";
import {
  cleanupAstroFontPackages,
  syncAstroFontsInProject,
  toManagedAstroFont,
} from "@/src/utils/astro-fonts";
import { fixAstroImports } from "@/src/utils/astro-imports";
import { TEMPLATES, createProject } from "@/src/utils/create-project";
import * as ERRORS from "@/src/utils/errors";
import { getConfig } from "@/src/utils/get-config";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { getInstalledUiComponents } from "@/src/utils/installed-ui-components";
import { logger } from "@/src/utils/logger";
import { reorganizeComponents } from "@/src/utils/reorganize-components";
import { runShadcnCommand } from "@/src/utils/shadcn-command";
import { buildUiUrl, resolveRegistryUrl } from "@/src/utils/ui-base-url";

export function resolveDesignSystemConfig(
  options: Pick<
    z.infer<typeof initOptionsSchema>,
    "preset" | "template" | "rtl" | "baseColor" | "lang"
  >,
): DesignSystemConfig {
  const rtlLanguage =
    options.rtl && options.lang
      ? (options.lang as DesignSystemConfig["rtlLanguage"])
      : DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage;

  if (options.preset && isPresetCode(options.preset)) {
    const decoded = decodePreset(options.preset);
    if (decoded) {
      return normalizeDesignSystemConfig(
        designSystemConfigSchema.parse({
          ...DEFAULT_DESIGN_SYSTEM_CONFIG,
          ...decoded,
          template: options.template ?? DEFAULT_DESIGN_SYSTEM_CONFIG.template,
          rtl: options.rtl ?? false,
          rtlLanguage,
        }),
      );
    }
  }

  const baseColor = options.baseColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor;

  return normalizeDesignSystemConfig(
    designSystemConfigSchema.parse({
      ...DEFAULT_DESIGN_SYSTEM_CONFIG,
      template: options.template ?? DEFAULT_DESIGN_SYSTEM_CONFIG.template,
      rtl: options.rtl ?? false,
      rtlLanguage,
      baseColor,
      theme:
        baseColor === DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor
          ? DEFAULT_DESIGN_SYSTEM_CONFIG.theme
          : baseColor,
    }),
  );
}

export function buildInitUrl(
  config: DesignSystemConfig,
  themeRef?: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const params = new URLSearchParams({
    preset: encodePreset(config),
    template: config.template,
  });

  if (config.rtl) {
    params.set("rtl", "true");
    params.set("lang", config.rtlLanguage);
  }

  if (themeRef) {
    params.set("themeRef", themeRef);
  }

  return `${buildUiUrl("/init", env)}?${params.toString()}`;
}

function buildThemeVarsFromRegistryItem(item: RegistryItem | null) {
  return item?.cssVars ?? null;
}

async function fetchInitThemeVars(initUrl: string) {
  const response = await fetch(initUrl);
  if (!response.ok) {
    return null;
  }

  const item = (await response.json()) as RegistryItem;
  return buildThemeVarsFromRegistryItem(item);
}

export const initOptionsSchema = z.object({
  cwd: z.string(),
  components: z.array(z.string()).optional(),
  yes: z.boolean(),
  reinstall: z.boolean().optional(),
  defaults: z.boolean(),
  force: z.boolean(),
  silent: z.boolean(),
  isNewProject: z.boolean(),
  srcDir: z.boolean().optional(),
  cssVariables: z.boolean(),
  template: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val) {
          return TEMPLATES[val as keyof typeof TEMPLATES];
        }
        return true;
      },
      {
        message:
          "Invalid template. Please use 'astro', 'astro-monorepo', or 'astro-with-component-docs-monorepo'.",
      },
    ),
  preset: z.string().optional(),
  baseColor: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val) {
          return BASE_COLORS.find((color) => color.name === val);
        }

        return true;
      },
      {
        message: `Invalid base color. Please use '${BASE_COLORS.map(
          (color) => color.name,
        ).join("', '")}'`,
      },
    ),
  baseStyle: z.boolean(),
  rtl: z.boolean().default(false),
  lang: z.enum(RTL_LANGUAGE_VALUES).optional(),
  themeRef: z.string().optional(),
});

export function shouldReinstallExistingComponents(
  options: Pick<z.infer<typeof initOptionsSchema>, "preset" | "reinstall">,
) {
  return options.reinstall ?? Boolean(options.preset);
}

export function ensureShadcnReinstallFlag(
  forwardedOptions: string[],
  shouldReinstall: boolean,
) {
  if (
    !shouldReinstall ||
    forwardedOptions.includes("--reinstall") ||
    forwardedOptions.includes("--no-reinstall")
  ) {
    return forwardedOptions;
  }

  const passthroughIndex = forwardedOptions.indexOf("--");
  if (passthroughIndex === -1) {
    return [...forwardedOptions, "--reinstall"];
  }

  return [
    ...forwardedOptions.slice(0, passthroughIndex),
    "--reinstall",
    ...forwardedOptions.slice(passthroughIndex),
  ];
}

export function extractOptionsForShadcnInit(
  rawArgv: string[],
  cmd: Command,
): string[] {
  if (typeof cmd.getOptionValueSource === "function") {
    const opts = cmd.optsWithGlobals() as Record<string, unknown>;
    const forwarded: string[] = [];
    const getSource = (key: string) => cmd.getOptionValueSource(key);

    const addBoolean = (key: string, flag: string, negateFlag?: string) => {
      if (getSource(key) !== "cli") return;
      const value = opts[key];
      if (typeof value !== "boolean") return;
      if (value) {
        forwarded.push(flag);
      } else if (negateFlag) {
        forwarded.push(negateFlag);
      }
    };

    addBoolean("yes", "--yes");
    addBoolean("force", "--force");
    addBoolean("silent", "--silent");
    addBoolean("reinstall", "--reinstall", "--no-reinstall");

    const initIndex = rawArgv.findIndex((arg) => arg === "init");
    if (initIndex !== -1) {
      const rest = rawArgv.slice(initIndex + 1);
      const doubleDashIndex = rest.indexOf("--");
      if (doubleDashIndex !== -1) {
        forwarded.push(...rest.slice(doubleDashIndex));
      }
    }

    return forwarded;
  }

  const initIndex = rawArgv.findIndex((arg) => arg === "init");
  if (initIndex === -1) return [];
  const rest = rawArgv.slice(initIndex + 1);
  const forwarded: string[] = [];
  const filteredFlags = new Set([
    "-v",
    "--verbose",
    "-t",
    "--template",
    "-b",
    "--base-color",
    "-p",
    "--preset",
    "--theme-ref",
    "-c",
    "--cwd",
    "-d",
    "--defaults",
    "--src-dir",
    "--no-src-dir",
    "--css-variables",
    "--no-css-variables",
    "--no-base-style",
    "--rtl",
    "--lang",
  ]);

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--") {
      forwarded.push("--", ...rest.slice(index + 1));
      break;
    }
    if (!token.startsWith("-")) continue;
    if (filteredFlags.has(token)) continue;
    forwarded.push(token);
  }

  return forwarded;
}

export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .argument("[components...]", "names, url or local path to component")
  .option(
    "-t, --template <template>",
    "the template to use. (astro, astro-monorepo, astro-with-component-docs-monorepo)",
  )
  .option(
    "-b, --base-color <base-color>",
    "the base color to use. (neutral, gray, zinc, stone, slate)",
    undefined,
  )
  .option("-p, --preset <preset>", "the encoded create preset to use")
  .option("--theme-ref <theme-ref>", "the custom theme ref to use")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-d, --defaults", "use default configuration.", false)
  .option("-f, --force", "force overwrite of existing configuration.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-s, --silent", "mute output.", false)
  .option(
    "--src-dir",
    "use the src directory when creating a new project.",
    false,
  )
  .option(
    "--no-src-dir",
    "do not use the src directory when creating a new project.",
  )
  .option("--css-variables", "use css variables for theming.", true)
  .option("--no-css-variables", "do not use css variables for theming.")
  .option("--no-base-style", "do not install the base shadcn style.")
  .option("--rtl", "enable right-to-left output", false)
  .option("--lang <lang>", "set the RTL language. (ar, fa, he)")
  .option(
    "--reinstall",
    "re-install existing UI components. Enabled by default for preset switching.",
  )
  .option(
    "--no-reinstall",
    "do not re-install existing UI components during preset switching.",
  )
  .action(async (_components, opts, cmd) => {
    try {
      await runInit({
        ...opts,
        forwardedOptions: extractOptionsForShadcnInit(
          process.argv.slice(2),
          cmd,
        ),
      });
    } catch (error) {
      logger.break();
      handleError(error);
    } finally {
      clearRegistryContext();
    }
  });

export async function runInit(
  options: z.infer<typeof initOptionsSchema> & {
    skipPreflight?: boolean;
    forwardedOptions?: string[];
  },
) {
  const designConfig = resolveDesignSystemConfig(options);
  let newProjectTemplate;

  if (!options.skipPreflight) {
    const preflight = await preFlightInit(options);

    if (preflight.errors[ERRORS.MISSING_DIR_OR_EMPTY_PROJECT]) {
      const { projectPath, template } = await createProject(options);
      if (!projectPath) {
        process.exit(1);
      }
      options.cwd = projectPath;
      options.isNewProject = true;
      newProjectTemplate = template;
    }
  }

  if (newProjectTemplate) {
    const projectPath = {
      "astro-monorepo": "apps/web",
      "astro-with-component-docs-monorepo": "apps/web",
      astro: "",
    } as const;
    await applyDesignSystemToProject(
      options.cwd,
      {
        ...designConfig,
        template: newProjectTemplate,
      },
      {
        themeVars: options.themeRef
          ? ((await fetchInitThemeVars(
              buildInitUrl(
                {
                  ...designConfig,
                  template: newProjectTemplate,
                },
                options.themeRef,
              ),
            )) ?? undefined)
          : undefined,
      },
    );

    options.cwd = path.resolve(options.cwd, projectPath[newProjectTemplate]);

    logger.log(
      `${highlighter.success(
        "Success!",
      )} Project initialization completed.\nYou may now add components.`,
    );

    return await getConfig(options.cwd);
  }

  try {
    const env = {
      ...process.env,
      REGISTRY_URL: resolveRegistryUrl(),
    };
    const initUrl = buildInitUrl(designConfig, options.themeRef);
    const shouldReinstall = shouldReinstallExistingComponents(options);
    const reinstallComponents = shouldReinstall
      ? await getInstalledUiComponents(options.cwd)
      : [];
    const forwardedOptions = ensureShadcnReinstallFlag(
      options.forwardedOptions ?? [],
      shouldReinstall,
    );

    await runShadcnCommand({
      cwd: options.cwd,
      args: ["init", initUrl, ...reinstallComponents, ...forwardedOptions],
      env,
    });

    await syncManagedTailwindCss(options.cwd);

    const managedFonts = [
      toManagedAstroFont(designConfig.font),
      designConfig.fontHeading !== "inherit"
        ? toManagedAstroFont(`font-heading-${designConfig.fontHeading}`)
        : null,
    ].filter((font): font is NonNullable<typeof font> => font !== null);
    const managedFont = managedFonts.find(
      (font) => font.cssVariable !== "--font-heading",
    );

    if (managedFonts.length > 0 && managedFont) {
      await syncAstroFontsInProject(
        options.cwd,
        managedFonts,
        managedFont.cssVariable,
      );
      await syncAstroManagedFontCss(options.cwd, managedFont.cssVariable);
      await cleanupAstroFontPackages(options.cwd);
    }

    if (reinstallComponents.length > 0) {
      const config = await getConfig(options.cwd);
      const uiDir = config?.resolvedPaths.ui ?? "";
      const activeStyle = config?.style ?? "bejamas-juno";

      if (uiDir) {
        await reorganizeComponents(
          reinstallComponents,
          uiDir,
          resolveRegistryUrl(),
          false,
          activeStyle,
          true,
        );
      }

      await fixAstroImports(options.cwd, false);
    }
  } catch {
    // shadcn already printed the detailed error to stdio, avoid double-reporting
    process.exit(1);
  }
}
