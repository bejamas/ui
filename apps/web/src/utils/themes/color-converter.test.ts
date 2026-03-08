import { describe, expect, it } from "bun:test";
import { colorFormatter } from "./color-converter";

describe("colorFormatter", () => {
  it("preserves alpha when converting colors to Tailwind v4 hsl syntax", () => {
    expect(colorFormatter("oklch(1 0 0 / 10%)", "hsl", "4")).toContain(
      "/ 10%",
    );
    expect(colorFormatter("oklch(1 0 0 / 15%)", "hsl", "4")).toContain(
      "/ 15%",
    );
  });

  it("keeps opaque colors in plain hsl syntax", () => {
    const converted = colorFormatter("oklch(1 0 0)", "hsl", "4");

    expect(converted.startsWith("hsl(")).toBe(true);
    expect(converted.includes("/")).toBe(false);
  });
});
