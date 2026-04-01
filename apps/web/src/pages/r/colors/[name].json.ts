import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_COLORS } from "@bejamas/create-config/browser";
import { jsonResponse } from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";

export const prerender = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COLORS_DIR = path.resolve(__dirname, "../../../../public/r/colors");

export function getStaticPaths() {
  return BASE_COLORS.map((color) => ({
    params: { name: color.name },
  }));
}

export async function GET({ params }: { params: { name: string } }) {
  const filepath = path.resolve(COLORS_DIR, `${params.name}.json`);

  try {
    const payload = JSON.parse(await fs.readFile(filepath, "utf8"));
    return jsonResponse(payload, {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {
    return jsonResponse(
      { error: "Base color not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }
}
