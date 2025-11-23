export const ONE_YEAR_IN_SECONDS = 31_536_000;

export function buildCacheHeaders(
  buildTime: string | null,
  isFresh: boolean,
): Record<string, string> {
  if (isFresh) {
    return {
      "Cache-Control": "no-store",
    };
  }

  const headers: Record<string, string> = {
    "Cache-Control": `public, immutable, no-transform, max-age=${ONE_YEAR_IN_SECONDS}, s-maxage=${ONE_YEAR_IN_SECONDS}`,
  };

  if (buildTime) {
    headers["X-Build-Time"] = buildTime;
  }

  return headers;
}

type HeaderWritable = {
  setHeader(name: string, value: string): void;
};

export function applyCacheHeaders(
  res: HeaderWritable,
  buildTime: string | null,
  isFresh: boolean,
): void {
  const headers = buildCacheHeaders(buildTime, isFresh);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}
