import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicConfigJsonSchema } from "../src/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const outputPath = path.resolve(repoRoot, "apps/web/public/schema.json");

async function main() {
  const schema = createPublicConfigJsonSchema();
  await fs.writeFile(`${outputPath}`, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`[schema] Wrote ${outputPath}`);
}

main().catch((error) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[schema] ${message}`);
  process.exit(1);
});
