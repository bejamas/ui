export function formatBytes(bytes: number | null) {
  if (bytes === null) return "–";
  if (Math.abs(bytes) < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

export function formatMs(value: number | null) {
  if (value === null) return "–";
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${value.toFixed(0)} ms`;
}

export function formatDelta(
  original: number | null,
  ported: number | null,
  format: (value: number) => string,
) {
  if (original === null || ported === null) return "–";
  const delta = ported - original;
  if (delta === 0) return "±0";
  const sign = delta > 0 ? "+" : "−";
  const relative =
    original === 0
      ? ""
      : ` (${sign}${Math.abs((delta / original) * 100).toFixed(1)}%)`;
  return `${sign}${format(Math.abs(delta))}${relative}`;
}

export function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
