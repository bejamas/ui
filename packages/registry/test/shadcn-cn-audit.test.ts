import { describe, expect, test } from "bun:test";
import {
  buildCurrentRegistryCnSnapshot,
  formatShadcnCnParitySummary,
  readCommittedShadcnCnDiffSummary,
  readCommittedShadcnCnSnapshot,
} from "../scripts/shadcn-cn-audit";

describe("shadcn cn parity audit", () => {
  test("matches the reviewed upstream cn token snapshot for all shared components", async () => {
    const upstream = await readCommittedShadcnCnSnapshot();
    const ours = await buildCurrentRegistryCnSnapshot(upstream.sharedComponents);
    const expectedSummary = await readCommittedShadcnCnDiffSummary();

    expect(upstream.sharedComponents).toHaveLength(38);
    expect(Object.keys(upstream.components)).toHaveLength(38);
    expect(formatShadcnCnParitySummary(ours, upstream)).toBe(expectedSummary);
  });
});
