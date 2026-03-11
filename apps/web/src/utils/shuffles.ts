export function formatShuffleCount(count: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, count));
}

export async function incrementShuffleCountRequest() {
  try {
    const response = await fetch("/api/shuffles", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { count?: unknown };
    return typeof payload.count === "number" ? payload.count : null;
  } catch {
    return null;
  }
}
