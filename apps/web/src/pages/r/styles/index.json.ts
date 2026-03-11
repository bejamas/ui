import {
  jsonResponse,
  readStaticStyleRegistryStyles,
} from "@/utils/create-registry";

export async function GET() {
  try {
    return jsonResponse(await readStaticStyleRegistryStyles());
  } catch {
    return jsonResponse(
      { error: "Registry styles not found." },
      { status: 404 },
    );
  }
}
