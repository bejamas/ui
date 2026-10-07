export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Median of the defined values, or null when there are none. */
export function median(values: readonly (number | null)[]) {
  const sorted = values
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}
