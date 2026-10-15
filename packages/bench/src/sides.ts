import type { Paired, Side } from "./types";

/**
 * Measure the original, then the ported URL. The sides run one after the
 * other so they never compete for CPU or network while being measured.
 */
export async function bothSides<T>(
  measure: (side: Side) => Promise<T>,
): Promise<Paired<T>> {
  const original = await measure("original");
  const ported = await measure("ported");
  return { original, ported };
}
