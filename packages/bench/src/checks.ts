import type {
  Check,
  Comparability,
  QualityResult,
  SideQuality,
  VisualResult,
} from "./types";

const PIXEL_WARNING = 1;

function list(values: readonly string[], limit = 3) {
  const shown = values.slice(0, limit).join("; ");
  return values.length > limit
    ? `${shown}; and ${values.length - limit} more`
    : shown;
}

/** Strip the origin so the same path on both servers compares equal. */
function withoutOrigin(value: string, finalUrl: string) {
  const origin = new URL(finalUrl).origin;
  return value.split(origin).join("");
}

function newEntries(
  original: SideQuality,
  ported: SideQuality,
  key: "errors" | "failedRequests",
) {
  const seen = new Set(
    original[key].map((value) => withoutOrigin(value, original.finalUrl)),
  );
  return ported[key].filter(
    (value) => !seen.has(withoutOrigin(value, ported.finalUrl)),
  );
}

export function comparabilityCheck(comparability: Comparability): Check {
  return {
    id: "comparability",
    label: "Timing comparability",
    status: comparability.comparable ? "pass" : "warn",
    detail: comparability.comparable
      ? "Both URLs run in the same kind of environment."
      : comparability.reasons.join(" "),
  };
}

export function qualityChecks({
  original,
  ported,
  text,
}: QualityResult): Check[] {
  const checks: Check[] = [];

  checks.push({
    id: "text",
    label: "Visible text",
    status: text.identical ? "pass" : "fail",
    detail: text.identical
      ? `Identical (${text.portedWords} words).`
      : `Differs: ${text.originalWords} → ${text.portedWords} words. First difference: “${text.original}” vs “${text.ported}”.`,
  });

  const metadata = (["title", "description", "lang"] as const).filter(
    (key) => original[key] !== ported[key],
  );
  checks.push({
    id: "metadata",
    label: "Title, description and lang",
    status: metadata.length === 0 ? "pass" : "fail",
    detail:
      metadata.length === 0
        ? "Identical."
        : list(
            metadata.map(
              (key) =>
                `${key}: ${JSON.stringify(original[key])} → ${JSON.stringify(ported[key])}`,
            ),
          ),
  });

  const outline = (side: SideQuality) =>
    side.headings.map((heading) => `h${heading.level} ${heading.text}`);
  const originalOutline = outline(original);
  const portedOutline = outline(ported);
  const mismatch = originalOutline.findIndex(
    (heading, index) => heading !== portedOutline[index],
  );
  const headingsMatch =
    originalOutline.length === portedOutline.length && mismatch === -1;
  const firstDifference = mismatch === -1 ? originalOutline.length : mismatch;
  checks.push({
    id: "headings",
    label: "Heading outline",
    status: headingsMatch ? "pass" : "fail",
    detail: headingsMatch
      ? `Identical (${originalOutline.length} headings).`
      : `${originalOutline.length} → ${portedOutline.length} headings. First difference: “${originalOutline[firstDifference] ?? "(none)"}” vs “${portedOutline[firstDifference] ?? "(none)"}”.`,
  });

  const originalViolations = new Map(
    original.violations.map((violation) => [violation.id, violation.nodes]),
  );
  const regressions = ported.violations.filter(
    (violation) =>
      violation.nodes > (originalViolations.get(violation.id) ?? 0),
  );
  checks.push({
    id: "accessibility",
    label: "Accessibility (axe-core)",
    status:
      regressions.length > 0
        ? "fail"
        : ported.violations.length > 0
          ? "warn"
          : "pass",
    detail:
      regressions.length > 0
        ? `New or more frequent violations: ${list(regressions.map((violation) => `${violation.id} (${violation.nodes})`))}.`
        : ported.violations.length > 0
          ? `No regressions, but ${ported.violations.length} violations remain from the original: ${list(ported.violations.map((violation) => violation.id))}.`
          : "No violations.",
  });

  const errors = newEntries(original, ported, "errors");
  const failedRequests = newEntries(original, ported, "failedRequests");
  checks.push({
    id: "errors",
    label: "Browser errors and failed requests",
    status:
      errors.length + failedRequests.length > 0
        ? "fail"
        : ported.errors.length + ported.failedRequests.length > 0
          ? "warn"
          : "pass",
    detail:
      errors.length + failedRequests.length > 0
        ? list([...errors, ...failedRequests])
        : ported.errors.length + ported.failedRequests.length > 0
          ? "Only errors that the original also has."
          : "None.",
  });

  checks.push({
    id: "nested-controls",
    label: "Nested interactive controls",
    status:
      ported.nestedInteractiveControls > original.nestedInteractiveControls
        ? "fail"
        : "pass",
    detail: `${original.nestedInteractiveControls} → ${ported.nestedInteractiveControls}.`,
  });

  return checks;
}

export function visualChecks(visual: VisualResult): Check[] {
  return visual.widths.flatMap((result) => {
    const geometryFailed =
      result.differences.length > 0 || result.landmarkDifferences.length > 0;
    const geometry: Check = {
      id: `geometry-${result.width}`,
      label: `Layout geometry at ${result.width}px`,
      status: geometryFailed
        ? "fail"
        : result.matchedElements === 0
          ? "warn"
          : "pass",
      detail: geometryFailed
        ? `${result.differences.length} of ${result.matchedElements} matched components and ${result.landmarkDifferences.length} page regions differ by more than ${visual.tolerance}px.`
        : result.matchedElements === 0
          ? "No data-slot components matched; only page regions were compared."
          : `${result.matchedElements} matched components and all page regions are within ${visual.tolerance}px.`,
    };
    const pixels: Check = {
      id: `pixels-${result.width}`,
      label: `Screenshot pixels at ${result.width}px`,
      status:
        result.pixels.mismatch > PIXEL_WARNING ||
        result.pixels.heightDelta !== 0
          ? "warn"
          : "pass",
      detail: `${result.pixels.mismatch}% of pixels differ; page height ${result.pixels.heightDelta === 0 ? "matches" : `changes by ${result.pixels.heightDelta > 0 ? "+" : ""}${result.pixels.heightDelta}px`}.`,
    };
    return [geometry, pixels];
  });
}
