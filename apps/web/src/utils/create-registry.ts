import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveRegistryRoot(
  options: {
    importMetaUrl?: string;
    cwd?: string;
  } = {},
) {
  const importMetaUrl = options.importMetaUrl ?? import.meta.url;
  const cwd = options.cwd ?? process.cwd();
  const candidates = [
    path.resolve(cwd, "public/r"),
    path.resolve(cwd, "apps/web/public/r"),
    fileURLToPath(new URL("../../public/r", importMetaUrl)),
    fileURLToPath(new URL("../../client/r", importMetaUrl)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to resolve registry root. Checked: ${candidates.join(", ")}`,
  );
}

async function readStaticRegistryJson(relativePath: string) {
  const filepath = path.resolve(resolveRegistryRoot(), relativePath);
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
