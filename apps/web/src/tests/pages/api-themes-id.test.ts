import { describe, expect, mock, test } from "bun:test";

mock.module("../../lib/redis", () => ({
  getSharedTheme: async (id: string) =>
    id === "shared-1"
      ? {
          id,
          name: "Shared Theme",
          styles: { light: { primary: "#000" }, dark: { primary: "#fff" } },
          createdAt: "2026-01-01T00:00:00.000Z",
          sharedAt: "2026-01-01T00:00:00.000Z",
        }
      : null,
  getCustomTheme: async (id: string) =>
    id === "custom-1"
      ? {
          id,
          name: "Custom Theme",
          styles: { light: { primary: "#111" }, dark: { primary: "#eee" } },
          createdAt: "2026-01-01T00:00:00.000Z",
          modifiedAt: "2026-01-02T00:00:00.000Z",
        }
      : null,
}));

const { GET } = await import("../../pages/api/themes/[id]");

describe("/api/themes/[id]", () => {
  test("uses shared-cache headers for shared theme IDs", async () => {
    const response = await GET({
      params: {
        id: "shared-1",
      },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
    );
  });

  test("uses no-store headers for custom theme IDs", async () => {
    const response = await GET({
      params: {
        id: "custom-1",
      },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
