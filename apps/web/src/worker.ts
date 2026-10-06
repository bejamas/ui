// Worker entry that puts the temporary preview gate in front of the Astro
// handler. Revert together with src/preview-gate.ts before merging.
import { handle } from "@astrojs/cloudflare/handler";
import { previewGate } from "./preview-gate";

declare const __PREVIEW_GATE_ENABLED__: boolean;

type HandleArgs = Parameters<typeof handle>;

export default {
  async fetch(request: Request, env: HandleArgs[1], context: HandleArgs[2]) {
    if (!__PREVIEW_GATE_ENABLED__) return handle(request, env, context);

    const gated = await previewGate(request, env.ASSETS);
    if (gated) return gated;

    // With run_worker_first the Worker sees every request; keep static files
    // served the way the platform serves them without the gate.
    if (request.method === "GET" || request.method === "HEAD") {
      const asset = await env.ASSETS.fetch(request.clone());
      if (asset.status !== 404) return asset;
    }

    return handle(request, env, context);
  },
};
