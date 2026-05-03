import { existsSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import {
  decodePreset,
  PRESET_CHART_COLORS,
  V1_CHART_COLOR_MAP,
  type PresetConfig,
} from "@bejamas/create-config/server";

import { getConfig } from "@/src/utils/get-config";
import {
  formatMonorepoMessage,
  getMonorepoTargets,
  isMonorepoRoot,
} from "@/src/utils/get-monorepo-info";
import { handleError } from "@/src/utils/handle-error";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import {
  resolveProjectPreset,
  type ResolvedProjectPreset,
} from "@/src/utils/preset-resolve";
import { buildUiUrl } from "@/src/utils/ui-base-url";

type PresetValues = PresetConfig & {
  chartColor?: NonNullable<PresetConfig["chartColor"]>;
};

type PresetDecodeResult = {
  code: string;
  derived: string[];
  url: string;
  values: PresetValues;
  version: string;
};

const PRESET_CHART_COLOR_SET = new Set<string>(PRESET_CHART_COLORS);

export function getPresetUrl(code: string) {
  return buildUiUrl(`/create?preset=${code}`);
}

export function decodePresetCode(code: string): PresetDecodeResult {
  const decoded = decodePreset(code);

  if (!decoded) {
    throw new Error(`Invalid preset code: ${code}`);
  }

  const derived: string[] = [];
  const chartColor = resolveDecodedChartColor(decoded);

  if (!decoded.chartColor && chartColor) {
    derived.push("chartColor");
  }

  return {
    code,
    derived,
    url: getPresetUrl(code),
    values: {
      ...decoded,
      ...(chartColor ? { chartColor } : {}),
    },
    version: code[0],
  };
}

export function printPresetDecode(result: PresetDecodeResult) {
  printPresetInfo(
    {
      code: result.code,
      fallbacks: result.derived,
      values: result.values,
    },
    {
      fallbackNote: "  * Compatibility value for older preset versions.",
    },
  );
}

export function printPresetInfo(
  preset: ResolvedProjectPreset,
  options: {
    fallbackNote?: string;
  } = {},
) {
  logger.log(highlighter.info("Preset"));

  if (!preset.code || !preset.values) {
    printEntries({ code: "-" });
    return;
  }

  const fallbacks = preset.fallbacks ?? [];
  const formatPresetValue = (key: string, value: string | undefined) => {
    const suffix = fallbacks.includes(key) ? "*" : "";
    return `${value ?? "-"}${suffix}`;
  };

  printEntries({
    code: preset.code,
    version: preset.code[0],
    style: preset.values.style,
    baseColor: formatPresetValue("baseColor", preset.values.baseColor),
    theme: formatPresetValue("theme", preset.values.theme),
    chartColor: formatPresetValue("chartColor", preset.values.chartColor),
    iconLibrary: formatPresetValue("iconLibrary", preset.values.iconLibrary),
    font: formatPresetValue("font", preset.values.font),
    fontHeading: formatPresetValue("fontHeading", preset.values.fontHeading),
    radius: formatPresetValue("radius", preset.values.radius),
    menuAccent: formatPresetValue("menuAccent", preset.values.menuAccent),
    menuColor: formatPresetValue("menuColor", preset.values.menuColor),
    url: getPresetUrl(preset.code),
  });

  if (fallbacks.length > 0) {
    logger.log("");
    logger.log(
      options.fallbackNote ??
        "  * Uses preset defaults for values that could not be inferred from the project.",
    );
  }
}

export const decode = new Command()
  .name("decode")
  .description("decode a preset code")
  .argument("<code>", "the preset code to decode")
  .option("--json", "output as JSON.", false)
  .action((code, opts) => {
    try {
      const result = decodePresetCode(code);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printPresetDecode(result);
    } catch (error) {
      handlePresetError(error);
    }
  });

export const url = new Command()
  .name("url")
  .description("get the create URL for a preset code")
  .argument("<code>", "the preset code")
  .action((code) => {
    try {
      logger.log(decodePresetCode(code).url);
    } catch (error) {
      handlePresetError(error);
    }
  });

export const openCommand = new Command()
  .name("open")
  .description("open a preset code in the browser")
  .argument("<code>", "the preset code")
  .action(async (code) => {
    let presetUrl: string;

    try {
      presetUrl = decodePresetCode(code).url;
    } catch (error) {
      handlePresetError(error);
      return;
    }

    logger.break();
    logger.log(`  Opening ${presetUrl} in your browser.`);
    logger.break();

    try {
      const { default: open } = await import("open");
      await open(presetUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      handlePresetError(new Error(`Failed to open preset URL: ${message}`));
    }
  });

export const resolve = new Command()
  .name("resolve")
  .alias("info")
  .description("resolve a preset from your project")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("--json", "output as JSON.", false)
  .action(async (opts) => {
    try {
      const cwd = path.resolve(opts.cwd);

      if (
        !existsSync(path.resolve(cwd, "components.json")) &&
        (await isMonorepoRoot(cwd))
      ) {
        const targets = await getMonorepoTargets(cwd);

        if (targets.length > 0) {
          if (opts.json) {
            console.log(
              JSON.stringify(
                {
                  error: "monorepo_root",
                  message:
                    "You are running preset resolve from a monorepo root. Use the -c flag to specify a workspace.",
                  targets: targets.map((target) => target.name),
                },
                null,
                2,
              ),
            );
          } else {
            formatMonorepoMessage("preset resolve", targets, {
              binary: "bejamas",
              cwdFlag: "-c",
            });
          }

          process.exit(1);
        }
      }

      const config = await getConfig(cwd);
      if (!config) {
        if (opts.json) {
          console.log(JSON.stringify(null, null, 2));
          return;
        }

        logger.log("No components.json found.");
        return;
      }

      const resolvedPreset = await resolveProjectPreset(config);

      if (opts.json) {
        console.log(
          JSON.stringify(resolvedPreset.code ? resolvedPreset : null, null, 2),
        );
        return;
      }

      printPresetInfo(resolvedPreset);
    } catch (error) {
      handleError(error);
    }
  });

export const preset = new Command()
  .name("preset")
  .description("manage presets")
  .addCommand(decode)
  .addCommand(resolve)
  .addCommand(url)
  .addCommand(openCommand)
  .action(() => {
    preset.outputHelp();
  });

function resolveDecodedChartColor(decoded: PresetConfig) {
  if (decoded.chartColor) {
    return decoded.chartColor;
  }

  const legacyChartColor = V1_CHART_COLOR_MAP[
    decoded.theme as keyof typeof V1_CHART_COLOR_MAP
  ] as NonNullable<PresetConfig["chartColor"]> | undefined;
  if (legacyChartColor) {
    return legacyChartColor;
  }

  if (PRESET_CHART_COLOR_SET.has(decoded.theme)) {
    return decoded.theme as NonNullable<PresetConfig["chartColor"]>;
  }

  return undefined;
}

function printEntries(entries: Record<string, string>) {
  const maxKeyLength = Math.max(
    ...Object.keys(entries).map((key) => key.length),
  );

  for (const [key, value] of Object.entries(entries)) {
    logger.log(`  ${key.padEnd(maxKeyLength + 2)}${value}`);
  }
}

function handlePresetError(error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message);
  }

  process.exit(1);
}
