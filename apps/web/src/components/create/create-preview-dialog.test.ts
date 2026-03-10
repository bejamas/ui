import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const componentRoot = path.resolve(import.meta.dir, "./base/ui/dialog");

function read(filename: string) {
  return fs.readFileSync(path.join(componentRoot, filename), "utf8");
}

describe("create preview dialog mirror", () => {
  test("keeps the base dialog mirror aligned with the default Juno dialog contract", () => {
    const overlay = read("DialogOverlay.astro");
    const content = read("DialogContent.astro");
    const close = read("DialogClose.astro");
    const title = read("DialogTitle.astro");

    expect(overlay).toContain("data-open:animate-in");
    expect(overlay).toContain("data-closed:animate-out");
    expect(overlay).not.toContain("data-[state=open]");
    expect(overlay).not.toContain("transition-discrete");

    expect(content).toContain("rounded-xl");
    expect(content).toContain("ring-1");
    expect(content).toContain("sm:max-w-md");
    expect(content).not.toContain("[--tw-animation-fill-mode:both]");

    expect(close).toContain(
      'class={cn("cn-dialog-close inline-flex items-center gap-2", className)}',
    );
    expect(title).toContain('class={cn("cn-dialog-title", className)}');
  });
});
