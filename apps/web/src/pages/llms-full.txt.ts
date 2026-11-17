import type { APIRoute } from "astro";

import { buildLlmsFullTxt } from "../utils/llmsTxt";

export const GET: APIRoute = ({ site, url }) =>
  new Response(buildLlmsFullTxt(site ?? new URL(url.origin)), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
