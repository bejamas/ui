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
  let newContent = content;

  if (newContent.includes("../../packages/ui/src/components/")) {
    newContent = newContent.replace(
      /(\.\.\/\.\.\/packages\/ui\/src\/components\/)/g,
      "ui/",
    );
  }

  if (newContent.includes("@bejamas/ui/lib/utils")) {
    newContent = newContent.replace(
      /@bejamas\/ui\/lib\/utils/g,
      "@\/lib\/utils",
    );
  }

  if (newContent !== content) {
    writeFileSync(file, newContent, "utf8");
    console.log(`Updated: ${file}`);
  }
}
