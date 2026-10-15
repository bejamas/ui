import type { TextDifference } from "./types";

/**
 * Locate the first region where the visible text of the two pages differs,
 * with `context` words around it and at most `maxWords` words per excerpt.
 */
export function compareText(
  original: string,
  ported: string,
  { context = 12, maxWords = 80 }: { context?: number; maxWords?: number } = {},
): TextDifference {
  const a = original.split(" ").filter(Boolean);
  const b = ported.split(" ").filter(Boolean);
  const result: TextDifference = {
    identical: original === ported,
    originalWords: a.length,
    portedWords: b.length,
  };
  if (result.identical) return result;

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const excerpt = (words: string[], end: number) => {
    const from = Math.max(0, start - context);
    const to = Math.min(
      words.length,
      Math.max(end, start) + context,
      from + maxWords,
    );
    return `${from > 0 ? "… " : ""}${words.slice(from, to).join(" ")}${to < words.length ? " …" : ""}`;
  };
  return { ...result, original: excerpt(a, endA), ported: excerpt(b, endB) };
}
