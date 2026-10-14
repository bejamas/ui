import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const stickySurfaceFile = path.resolve(
  import.meta.dir,
  "../src/ui/sticky-surface/StickySurface.astro",
);

describe("sticky-surface effects", () => {
  test("every effect animation has its keyframes defined in the component", () => {
    const source = fs.readFileSync(stickySurfaceFile, "utf8");
    const animations = [
      ...new Set(
        [...source.matchAll(/\[animation:([a-z-]+)_/g)].map((match) => match[1]),
      ),
    ];

    expect(animations).toEqual(["show-line", "stuck-shadow", "stuck-backdrop"]);
    for (const name of animations) {
      expect(source).toContain(`@keyframes ${name} {`);
    }
  });
});
