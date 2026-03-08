import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryRoot = path.resolve(__dirname, "../../public/r");

export async function readStaticRegistryItem(name: string) {
  const filepath = path.resolve(registryRoot, `${name}.json`);
  const contents = await readFile(filepath, "utf8");
  return JSON.parse(contents);
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
