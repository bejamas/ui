import type { APIRoute } from "astro";

import { buildLlmsTxt } from "../utils/llmsTxt";

export const GET: APIRoute = ({ site, url }) =>
  new Response(buildLlmsTxt(site ?? new URL(url.origin)), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
