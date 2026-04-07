import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryRoot = path.resolve(__dirname, "../../public/r");

async function readStaticRegistryJson(relativePath: string) {
  const filepath = path.resolve(registryRoot, relativePath);
  const contents = await readFile(filepath, "utf8");
  return JSON.parse(contents);
}

export async function readStaticRegistryItem(name: string) {
  return readStaticRegistryJson(`${name}.json`);
}

export async function readStaticStyleRegistryItem(style: string, name: string) {
  return readStaticRegistryJson(path.join("styles", style, `${name}.json`));
}

export async function readStaticStyleRegistryIndex(style: string) {
  return readStaticRegistryJson(path.join("styles", style, "index.json"));
}

export async function readStaticStyleRegistryStyles() {
  return readStaticRegistryJson(path.join("styles", "index.json"));
}

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
