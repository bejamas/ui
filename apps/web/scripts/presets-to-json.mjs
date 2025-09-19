#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import vm from "node:vm";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultInput = path.resolve(__dirname, "../src/utils/themes/presets.ts");
const defaultOutput = path.resolve(__dirname, "../public/_presets.json");

const inputPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : defaultInput;
const outputPath = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : defaultOutput;

function extractObjectLiteral(source, exportConstName) {
  const exportIdx = source.indexOf(`export const ${exportConstName}`);
  if (exportIdx === -1)
    throw new Error(`Could not find export const ${exportConstName}`);

  const eqIdx = source.indexOf("=", exportIdx);
  if (eqIdx === -1) throw new Error("Could not find = after export const");

  // find first opening brace after '='
  let i = source.indexOf("{", eqIdx);
  if (i === -1) throw new Error("Could not find opening { for object literal");

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let prevChar = "";
  const start = i;
  while (i < source.length) {
    const ch = source[i];
    const prev = prevChar;
    prevChar = ch;

    // handle string contexts to avoid counting braces inside strings
    if (!inDouble && !inBacktick && ch === "'" && prev !== "\\")
      inSingle = !inSingle;
    else if (!inSingle && !inBacktick && ch === '"' && prev !== "\\")
      inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "`" && prev !== "\\")
      inBacktick = !inBacktick;

    if (inSingle || inDouble || inBacktick) {
      i++;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      const end = i; // inclusive index of closing brace
      return source.slice(start, end + 1);
    }
    i++;
  }
  throw new Error("Failed to match closing } for object literal");
}

function evaluateObjectLiteral(objectLiteral) {
  // Wrap in parentheses to form a valid expression
  const code = `(${objectLiteral})`;
  const sandbox = {};
  const context = vm.createContext(sandbox);
  return vm.runInContext(code, context, { timeout: 5000 });
}

async function main() {
  try {
    const source = await fs.promises.readFile(inputPath, "utf8");
    const literal = extractObjectLiteral(source, "defaultPresets");
    const obj = evaluateObjectLiteral(literal);
    const json = JSON.stringify(obj, null, 2);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, json, "utf8");
    console.log(`Wrote JSON to: ${outputPath}`);
  } catch (err) {
    console.error("Error converting presets to JSON:", err.message);
    process.exit(1);
  }
}

main();
