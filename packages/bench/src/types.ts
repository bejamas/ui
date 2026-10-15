export type Side = "original" | "ported";
export const SIDES: readonly Side[] = ["original", "ported"];

/** One value per side. */
export type Paired<T> = Record<Side, T>;

export type StageName = "assets" | "quality" | "visual" | "lighthouse";
export const STAGES: readonly StageName[] = [
  "assets",
  "quality",
  "visual",
  "lighthouse",
];

export type FormFactor = "mobile" | "desktop";

export interface BenchOptions {
  original: string;
  ported: string;
  /** Write report files here. Nothing is written when omitted. */
  outDir?: string;
  runs: number;
  widths: number[];
  formFactor: FormFactor;
  stages: StageName[];
  tolerance: number;
  budgets: string[];
  allowDev: boolean;
  chromePath?: string;
  timeout: number;
}

export interface Target {
  side: Side;
  input: string;
  url: string;
  finalUrl: string;
  status: number;
  local: boolean;
  devServer: string | null;
}

export interface Comparability {
  comparable: boolean;
  reasons: string[];
}

export type AssetCategory =
  "html" | "css" | "js" | "fonts" | "images" | "other";
export const ASSET_CATEGORIES: readonly AssetCategory[] = [
  "html",
  "css",
  "js",
  "fonts",
  "images",
  "other",
];

export interface AssetEntry {
  url: string;
  category: AssetCategory;
  thirdParty: boolean;
  /** Encoded body bytes received over the network. */
  transfer: number;
  /** Decoded body bytes. */
  raw: number;
  /** Deterministic gzip level 9 estimate, compressible categories only. */
  gzip: number | null;
}

export interface AssetSummary {
  count: number;
  transfer: number;
  raw: number;
  /** Comparable size: the gzip estimate for HTML, CSS and JS, transferred bytes otherwise. */
  size: number;
}

export interface SideAssets {
  finalUrl: string;
  viewport: { width: number; height: number };
  categories: Record<AssetCategory, AssetSummary>;
  /** Comparable size of HTML + CSS + JS + fonts. */
  coreSize: number;
  requests: number;
  transfer: number;
  entries: AssetEntry[];
}

export type AssetsResult = Paired<SideAssets>;

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: number;
}

export interface Heading {
  level: number;
  text: string;
}

export interface FailedRequest {
  url: string;
  /** An HTTP status, "blocked by CORS" or Chrome's network error. */
  reason: string;
}

export interface SideQuality {
  finalUrl: string;
  title: string;
  description: string | null;
  lang: string | null;
  text: string;
  headings: Heading[];
  domElements: number;
  domBytes: number;
  nestedInteractiveControls: number;
  violations: AxeViolation[];
  errors: string[];
  failedRequests: FailedRequest[];
}

export interface TextDifference {
  identical: boolean;
  originalWords: number;
  portedWords: number;
  /** Context around the first differing region, when the text differs. */
  original?: string;
  ported?: string;
}

export interface QualityResult extends Paired<SideQuality> {
  viewport: { width: number; height: number };
  text: TextDifference;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SlotElement {
  slot: string;
  text: string;
  width: number;
  height: number;
}

export interface Landmark extends Box {
  tag: string;
}

export interface Capture {
  side: Side;
  width: number;
  /** Screenshot file, when report files are written. */
  screenshot: string | null;
  pageHeight: number;
  elements: SlotElement[];
  landmarks: Landmark[];
}

export interface SlotDifference {
  slot: string;
  text: string;
  original: [number, number];
  ported: [number, number];
}

export interface LandmarkDifference {
  index: number;
  tag: string;
  original: Box | null;
  ported: Box | null;
}

export interface GeometryComparison {
  /** Named `data-slot` elements on each side; generic part names are left out. */
  originalElements: number;
  portedElements: number;
  matchedElements: number;
  differences: SlotDifference[];
  unmatchedOriginal: Record<string, number>;
  unmatchedPorted: Record<string, number>;
  landmarkDifferences: LandmarkDifference[];
}

export interface PixelComparison {
  /** Diff image file, when report files are written. */
  diff: string | null;
  comparedWidth: number;
  comparedHeight: number;
  heightDelta: number;
  mismatchedPixels: number;
  /** Percentage of compared pixels that differ. */
  mismatch: number;
}

export interface VisualWidthResult extends GeometryComparison {
  width: number;
  pixels: PixelComparison;
}

export interface VisualResult {
  tolerance: number;
  captures: Capture[];
  widths: VisualWidthResult[];
}

export type LighthouseMetric = "score" | "fcp" | "lcp" | "tbt" | "cls" | "si";
export const LIGHTHOUSE_METRICS: readonly LighthouseMetric[] = [
  "score",
  "fcp",
  "lcp",
  "tbt",
  "cls",
  "si",
];

export type LighthouseValues = Record<LighthouseMetric, number | null>;

export interface LighthouseRun extends LighthouseValues {
  run: number;
  /** Full Lighthouse report file, when report files are written. */
  report: string | null;
}

export interface LighthouseSide {
  runs: LighthouseRun[];
  median: LighthouseValues;
}

export interface LighthouseResult extends Paired<LighthouseSide> {
  formFactor: FormFactor;
  version: string;
  runs: number;
  order: string;
}

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface BudgetResult {
  budget: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

export interface SkippedStage {
  stage: StageName;
  reason: string;
}

export interface StageError {
  stage: StageName;
  message: string;
}

export interface BenchReport {
  schemaVersion: 1;
  tool: { name: string; version: string };
  measuredAt: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
    browser: string | null;
  };
  options: Omit<BenchOptions, "original" | "ported">;
  targets: Paired<Target>;
  comparability: Comparability;
  skipped: SkippedStage[];
  errors: StageError[];
  assets?: AssetsResult;
  quality?: QualityResult;
  visual?: VisualResult;
  lighthouse?: LighthouseResult;
  checks: Check[];
  budgets: BudgetResult[];
  passed: boolean;
}
