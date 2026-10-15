import type { FailedRequest } from "../types";

const CORS_BLOCK =
  /^Access to \w+ at '([^']+)' from origin '[^']+' has been blocked by CORS policy/;

/**
 * Collects browser errors and broken resources so each problem is reported
 * once: one entry per distinct error message and one per failed URL, with the
 * most specific reason any event gave for it.
 */
export function createProblemLog() {
  const errors = new Set<string>();
  const failures = new Map<string, string>();
  return {
    consoleError(text: string) {
      // Chrome repeats every failed load as a console error without its URL;
      // the request events already record those with the URL.
      if (text.startsWith("Failed to load resource")) return;
      const cors = CORS_BLOCK.exec(text);
      if (cors) failures.set(cors[1]!, "blocked by CORS");
      else errors.add(text);
    },
    pageError(message: string) {
      errors.add(message);
    },
    response(url: string, status: number) {
      if (status >= 400) failures.set(url, `HTTP ${status}`);
    },
    requestFailed(url: string, reason: string) {
      // Cancelled loads (prefetches, media preloads, closing the page) are not
      // failures, and an HTTP status or CORS block already says more.
      if (reason === "net::ERR_ABORTED" || failures.has(url)) return;
      failures.set(url, reason);
    },
    result(): { errors: string[]; failedRequests: FailedRequest[] } {
      return {
        errors: [...errors],
        failedRequests: [...failures].map(([url, reason]) => ({ url, reason })),
      };
    },
  };
}
