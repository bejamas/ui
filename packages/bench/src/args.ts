import { InvalidArgumentError } from "commander";
import { BenchError } from "./errors";
import { STAGES, type StageName } from "./types";

export function positiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new InvalidArgumentError("Expected a positive integer.");
  return parsed;
}

export function nonNegativeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new InvalidArgumentError("Expected a non-negative number.");
  return parsed;
}

export function widthList(value: string) {
  const widths = value.split(",").map((part) => Number(part.trim()));
  if (
    widths.length === 0 ||
    widths.some(
      (width) => !Number.isInteger(width) || width < 200 || width > 3840,
    )
  ) {
    throw new InvalidArgumentError(
      "Expected comma-separated widths between 200 and 3840.",
    );
  }
  return [...new Set(widths)];
}

const isStageName = (value: string): value is StageName =>
  (STAGES as readonly string[]).includes(value);

export function stageList(value: string): StageName[] {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const stages = parts.filter(isStageName);
  if (stages.length === 0 || stages.length !== parts.length) {
    throw new InvalidArgumentError(
      `Expected a comma-separated list of: ${STAGES.join(", ")}.`,
    );
  }
  return stages;
}

export function collect(value: string, previous: string[]) {
  return [...previous, value];
}

/** Stages to run, in their fixed order, after --only and --skip. */
export function selectStages(
  only: readonly StageName[] = STAGES,
  skip: readonly StageName[] = [],
) {
  const stages = only.filter((stage) => !skip.includes(stage));
  if (stages.length === 0) throw new BenchError("No stages left to run.");
  return stages;
}

/**
 * Resolve which URL is which. Named flags are preferred because positional
 * URLs are easy to swap, which silently inverts every comparison.
 */
export function resolveTargetUrls(
  flags: { original?: string; ported?: string },
  positional: readonly string[],
): { original: string; ported: string; warning?: string } {
  const named = flags.original !== undefined || flags.ported !== undefined;
  if (named && positional.length > 0) {
    throw new BenchError(
      `Pass the URLs either as --original and --ported or positionally, not both (got ${positional.join(" ")}).`,
    );
  }
  if (named) {
    const { original, ported } = flags;
    if (original === undefined || ported === undefined) {
      const missing = [
        original === undefined && "--original <url>",
        ported === undefined && "--ported <url>",
      ].filter(Boolean);
      throw new BenchError(`Missing ${missing.join(" and ")}.`);
    }
    return { original, ported };
  }
  if (positional.length !== 2) {
    throw new BenchError("Pass both URLs: --original <url> --ported <url>.");
  }
  const [original, ported] = positional as [string, string];
  return {
    original,
    ported,
    warning: `Reading ${original} as the original and ${ported} as the port. Use --original and --ported to avoid swapping them.`,
  };
}
