export function decodeQueryValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
