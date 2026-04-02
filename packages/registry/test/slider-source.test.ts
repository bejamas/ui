import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");

function read(relativePath: string) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

describe("registry slider source", () => {
  it("keeps slider self-contained while leaving visuals to cn classes", () => {
    const slider = read("src/ui/slider/Slider.astro");
    const barrel = read("src/ui/slider/index.ts");

    expect(barrel).toContain(
      'export { default as Slider } from "./Slider.astro";',
    );
    expect(barrel).not.toContain("SliderTrack");
    expect(barrel).not.toContain("SliderRange");
    expect(barrel).not.toContain("SliderThumb");

    expect(slider).toContain(
      'class={cn("data-horizontal:w-full data-vertical:h-full", className)}',
    );
    expect(slider).toContain(
      'class="cn-slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col"',
    );
    expect(slider).toContain(
      'class="cn-slider-track relative grow overflow-hidden select-none"',
    );
    expect(slider).toContain(
      'class="cn-slider-range select-none data-horizontal:h-full data-vertical:w-full"',
    );
    expect(slider).toContain(
      'class="cn-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"',
    );
    expect(slider).toContain("defaultValue={50}");
    expect(slider).not.toContain("defaultValue={[50]}");
    expect(slider).toContain("type SliderValue = number | [number, number];");
    expect(slider).toContain("value?: SliderValue;");
    expect(slider).toContain("defaultValue?: SliderValue;");
    expect(slider).toContain(
      "const resolvedValue = value ?? defaultValue ?? min;",
    );
    expect(slider).toContain(
      "const thumbCount = Array.isArray(resolvedValue) ? 2 : 1;",
    );
    expect(slider).not.toContain("SliderTrack");
    expect(slider).not.toContain("SliderRange");
    expect(slider).not.toContain("SliderThumb");
    expect(slider).not.toContain("bg-muted relative flex-1 rounded-full");
    expect(slider).not.toContain("border-ring ring-ring/50");
  });
});
