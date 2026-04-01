import {
  refreshShadcnCnAuditFixtures,
  shadcnCnDiffSummaryPath,
  shadcnCnSnapshotPath,
} from "./shadcn-cn-audit";

try {
  const { snapshot } = await refreshShadcnCnAuditFixtures();

  console.log(
    [
      `Wrote ${shadcnCnSnapshotPath}`,
      `Wrote ${shadcnCnDiffSummaryPath}`,
      `Shared components: ${snapshot.sharedComponents.length}`,
    ].join("\n"),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
