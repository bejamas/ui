export function getStringQueryParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
}

export function isTruthyQueryParam(
  value: string | string[] | undefined,
): boolean {
  if (Array.isArray(value)) {
    return value.some(isTruthyQueryParam);
  }

  if (typeof value !== "string") {
    return false;
  }

  if (value === "") {
    return true;
  }

  const lowered = value.toLowerCase();
  return lowered === "1" || lowered === "true";
}

