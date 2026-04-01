import fs from "node:fs/promises";
import path from "node:path";

export type ShadcnCnSnapshot = {
  sharedComponents: string[];
  components: Record<string, string[]>;
};

export type ShadcnCnParityEntry = {
  component: string;
  onlyOurs: string[];
  onlyUpstream: string[];
};

const CN_TOKEN_PATTERN = /\bcn-[A-Za-z0-9_-]+\b/g;

export const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");
export const registryUiRoot = path.resolve(repoRoot, "packages/registry/src/ui");
export const upstreamBaseUiRoot = path.resolve(
  repoRoot,
  "tmp/shadcn-ui/apps/v4/registry/bases/base/ui",
);
export const shadcnCnSnapshotPath = path.resolve(
  repoRoot,
  "packages/registry/upstream/shadcn/base-cn-tokens.json",
);
export const shadcnCnDiffSummaryPath = path.resolve(
  repoRoot,
  "packages/registry/upstream/shadcn/base-cn-diff-summary.txt",
);

function uniqueSorted(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function extractCnTokens(source: string) {
  return uniqueSorted(source.match(CN_TOKEN_PATTERN) ?? []);
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.resolve(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function collectRegistryCnTokens() {
  const entries = await fs.readdir(registryUiRoot, { withFileTypes: true });
  const components = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const componentRoot = path.resolve(registryUiRoot, entry.name);
    const files = await walkFiles(componentRoot);
    const sources = await Promise.all(
      files.map((filePath) => fs.readFile(filePath, "utf8")),
    );
    components.set(entry.name, extractCnTokens(sources.join("\n")));
  }

  return components;
}

async function collectUpstreamBaseCnTokens(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const components = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".tsx") || entry.name.startsWith("_")) {
      continue;
    }

    const component = entry.name.replace(/\.tsx$/u, "");
    const source = await fs.readFile(path.resolve(root, entry.name), "utf8");
    components.set(component, extractCnTokens(source));
  }

  return components;
}

function buildSharedComponentList(
  ours: Map<string, string[]>,
  upstream: Map<string, string[]>,
) {
  return uniqueSorted(
    Array.from(ours.keys()).filter((component) => upstream.has(component)),
  );
}

function toRecord(
  components: string[],
  tokenMap: Map<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    components.map((component) => [component, tokenMap.get(component) ?? []]),
  );
}

export async function buildShadcnCnSnapshotFromLocalUpstream(
  upstreamRoot: string = upstreamBaseUiRoot,
): Promise<ShadcnCnSnapshot> {
  const [ours, upstream] = await Promise.all([
    collectRegistryCnTokens(),
    collectUpstreamBaseCnTokens(upstreamRoot),
  ]);
  const sharedComponents = buildSharedComponentList(ours, upstream);

  return {
    sharedComponents,
    components: toRecord(sharedComponents, upstream),
  };
}

export async function buildCurrentRegistryCnSnapshot(
  sharedComponents?: string[],
): Promise<Record<string, string[]>> {
  const ours = await collectRegistryCnTokens();
  const components = sharedComponents ?? uniqueSorted(ours.keys());
  return toRecord(components, ours);
}

export function buildShadcnCnParity(
  ours: Record<string, string[]>,
  upstream: ShadcnCnSnapshot,
) {
  const differingComponents: ShadcnCnParityEntry[] = [];
  let exactCount = 0;

  for (const component of upstream.sharedComponents) {
    const ourTokens = ours[component] ?? [];
    const upstreamTokens = upstream.components[component] ?? [];
    const onlyOurs = ourTokens.filter((token) => !upstreamTokens.includes(token));
    const onlyUpstream = upstreamTokens.filter((token) => !ourTokens.includes(token));

    if (onlyOurs.length === 0 && onlyUpstream.length === 0) {
      exactCount += 1;
      continue;
    }

    differingComponents.push({
      component,
      onlyOurs,
      onlyUpstream,
    });
  }

  return {
    sharedCount: upstream.sharedComponents.length,
    exactCount,
    diffCount: upstream.sharedComponents.length - exactCount,
    differingComponents,
  };
}

export function formatShadcnCnParitySummary(
  ours: Record<string, string[]>,
  upstream: ShadcnCnSnapshot,
) {
  const parity = buildShadcnCnParity(ours, upstream);
  const lines = [
    `Shared components: ${parity.sharedCount}`,
    `Exact matches: ${parity.exactCount}`,
    `Differences: ${parity.diffCount}`,
    "",
  ];

  for (const component of upstream.sharedComponents) {
    const diff = parity.differingComponents.find(
      (entry) => entry.component === component,
    );

    if (!diff) {
      lines.push(`${component}: exact`);
      continue;
    }

    lines.push(`${component}: diff`);
    lines.push(
      `  only ours: ${diff.onlyOurs.length ? diff.onlyOurs.join(", ") : "(none)"}`,
    );
    lines.push(
      `  only upstream: ${diff.onlyUpstream.length ? diff.onlyUpstream.join(", ") : "(none)"}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export async function readCommittedShadcnCnSnapshot() {
  return JSON.parse(
    await fs.readFile(shadcnCnSnapshotPath, "utf8"),
  ) as ShadcnCnSnapshot;
}

export async function readCommittedShadcnCnDiffSummary() {
  return fs.readFile(shadcnCnDiffSummaryPath, "utf8");
}

export async function refreshShadcnCnAuditFixtures(
  upstreamRoot: string = upstreamBaseUiRoot,
) {
  try {
    const stat = await fs.stat(upstreamRoot);
    if (!stat.isDirectory()) {
      throw new Error("not a directory");
    }
  } catch {
    throw new Error(
      `Missing local shadcn base registry checkout at ${upstreamRoot}`,
    );
  }

  const snapshot = await buildShadcnCnSnapshotFromLocalUpstream(upstreamRoot);
  const ours = await buildCurrentRegistryCnSnapshot(snapshot.sharedComponents);
  const summary = formatShadcnCnParitySummary(ours, snapshot);

  await fs.mkdir(path.dirname(shadcnCnSnapshotPath), { recursive: true });
  await fs.writeFile(
    shadcnCnSnapshotPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  await fs.writeFile(shadcnCnDiffSummaryPath, summary);

  return {
    snapshot,
    summary,
  };
}
