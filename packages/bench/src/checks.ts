import { compareText } from "./text";
import type {
  Check,
  CheckStatus,
  Comparability,
  FailedRequest,
  QualityResult,
  SideQuality,
  VisualResult,
} from "./types";

const PIXEL_WARNING = 1;

type Outcome = [status: CheckStatus, detail: string];

const check = (
  id: string,
  label: string,
  [status, detail]: Outcome,
): Check => ({
  id,
  label,
  status,
  detail,
});

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

/** Entries the port has and the original doesn't, compared without origins. */
function newEntries<T>(
  original: SideQuality,
  ported: SideQuality,
  read: (side: SideQuality) => readonly T[],
  key: (value: T) => string,
) {
  const keyOf = (side: SideQuality) => (value: T) =>
    withoutOrigin(key(value), side.finalUrl);
  const seen = new Set(read(original).map(keyOf(original)));
  return read(ported).filter((value) => !seen.has(keyOf(ported)(value)));
}

const describeRequest = ({ url, reason }: FailedRequest) =>
  `${url} (${reason})`;

/** One line per host and reason, so a broken CDN reads as one problem. */
function groupFailures(requests: readonly FailedRequest[]) {
  const groups = new Map<string, FailedRequest[]>();
  for (const request of requests) {
    const key = `${new URL(request.url).host} ${request.reason}`;
    groups.set(key, [...(groups.get(key) ?? []), request]);
  }
  return [...groups.values()].map((group) =>
    group.length === 1
      ? describeRequest(group[0]!)
      : `${group.length} requests to ${new URL(group[0]!.url).host} (${group[0]!.reason})`,
  );
}

/** Every check for the stages that produced results, in report order. */
export function reportChecks({
  comparability,
  quality,
  visual,
}: {
  comparability: Comparability;
  quality?: QualityResult;
  visual?: VisualResult;
}): Check[] {
  return [
    comparabilityCheck(comparability),
    ...(quality ? qualityChecks(quality) : []),
    ...(visual ? visualChecks(visual) : []),
  ];
}

export function comparabilityCheck(comparability: Comparability): Check {
  return check(
    "comparability",
    "Timing comparability",
    comparability.comparable
      ? ["pass", "Both URLs run in the same kind of environment."]
      : ["warn", comparability.reasons.join(" ")],
  );
}

export function qualityChecks({
  original,
  ported,
  text,
}: QualityResult): Check[] {
  const metadata = (["title", "description", "lang"] as const).filter(
    (key) => original[key] !== ported[key],
  );

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

  const originalViolations = new Map(
    original.violations.map((violation) => [violation.id, violation.nodes]),
  );
  const regressions = ported.violations.filter(
    (violation) =>
      violation.nodes > (originalViolations.get(violation.id) ?? 0),
  );

  const newProblems = [
    ...newEntries(
      original,
      ported,
      (side) => side.errors,
      (error) => error,
    ),
    ...groupFailures(
      newEntries(
        original,
        ported,
        (side) => side.failedRequests,
        describeRequest,
      ),
    ),
  ];
  // The report keeps the long excerpt; the check names just the change.
  const difference = compareText(original.text, ported.text, {
    context: 4,
    maxWords: 20,
  });
  const portedProblems = ported.errors.length + ported.failedRequests.length;

  return [
    check(
      "text",
      "Visible text",
      text.identical
        ? ["pass", `Identical (${text.portedWords} words).`]
        : [
            "fail",
            `Differs: ${text.originalWords} → ${text.portedWords} words. First difference: “${difference.original}” vs “${difference.ported}”.`,
          ],
    ),
    check(
      "metadata",
      "Title, description and lang",
      metadata.length === 0
        ? ["pass", "Identical."]
        : [
            "fail",
            list(
              metadata.map(
                (key) =>
                  `${key}: ${JSON.stringify(original[key])} → ${JSON.stringify(ported[key])}`,
              ),
            ),
          ],
    ),
    check(
      "headings",
      "Heading outline",
      headingsMatch
        ? ["pass", `Identical (${originalOutline.length} headings).`]
        : [
            "fail",
            `${originalOutline.length} → ${portedOutline.length} headings. First difference: “${originalOutline[firstDifference] ?? "(none)"}” vs “${portedOutline[firstDifference] ?? "(none)"}”.`,
          ],
    ),
    check(
      "accessibility",
      "Accessibility (axe-core)",
      regressions.length > 0
        ? [
            "fail",
            `New or more frequent violations: ${list(regressions.map((violation) => `${violation.id} (${violation.nodes})`))}.`,
          ]
        : ported.violations.length > 0
          ? [
              "warn",
              `No regressions, but ${ported.violations.length} violations remain from the original: ${list(ported.violations.map((violation) => violation.id))}.`,
            ]
          : ["pass", "No violations."],
    ),
    check(
      "errors",
      "Browser errors and failed requests",
      newProblems.length > 0
        ? ["fail", list(newProblems)]
        : portedProblems > 0
          ? ["warn", "Only errors that the original also has."]
          : ["pass", "None."],
    ),
    check("nested-controls", "Nested interactive controls", [
      ported.nestedInteractiveControls > original.nestedInteractiveControls
        ? "fail"
        : "pass",
      `${original.nestedInteractiveControls} → ${ported.nestedInteractiveControls}.`,
    ]),
  ];
}

export function visualChecks(visual: VisualResult): Check[] {
  return visual.widths.flatMap((result) => {
    const { pixels } = result;
    const height =
      pixels.heightDelta === 0
        ? "matches"
        : `changes by ${pixels.heightDelta > 0 ? "+" : ""}${pixels.heightDelta}px`;
    return [
      check(
        `geometry-${result.width}`,
        `Layout geometry at ${result.width}px`,
        result.differences.length > 0 || result.landmarkDifferences.length > 0
          ? [
              "fail",
              `${result.matchedElements > 0 ? `${result.differences.length} of ${result.matchedElements} matched components and ` : ""}${result.landmarkDifferences.length} page regions differ by more than ${visual.tolerance}px.`,
            ]
          : result.matchedElements === 0
            ? [
                "warn",
                `No data-slot components matched (${result.originalElements} named in the original, ${result.portedElements} in the port); only page regions were compared.`,
              ]
            : [
                "pass",
                `${result.matchedElements} matched components and all page regions are within ${visual.tolerance}px.`,
              ],
      ),
      check(
        `pixels-${result.width}`,
        `Screenshot pixels at ${result.width}px`,
        [
          pixels.mismatch > PIXEL_WARNING || pixels.heightDelta !== 0
            ? "warn"
            : "pass",
          `${pixels.mismatch}% of pixels differ; page height ${height}.`,
        ],
      ),
    ];
  });
}
