import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";

/**
 * Recursively get all .json files within the given directory.
 */
function getAllJsonFiles(dir: string): string[] {
  let results: string[] = [];
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(fullPath));
    } else if (stat.isFile() && extname(fullPath) === ".json") {
      results.push(fullPath);
    }
  }
  return results;
}

const baseDir = join(__dirname, "../public/r/");
const files = getAllJsonFiles(baseDir);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (content.includes("../../packages/ui/src/components/")) {
    const newContent = content.replace(
      /(\.\.\/\.\.\/packages\/ui\/src\/components\/)/g,
      "ui/",
    );
    writeFileSync(file, newContent, "utf8");
    console.log(`Updated: ${file}`);
  }
}
