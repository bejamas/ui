import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");

function read(relativePath: string) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

describe("registry switch source", () => {
  it("matches the data-slot switch contract while leaving visuals to cn classes", () => {
    const source = read("src/ui/switch/Switch.astro");

    expect(source).toContain('data-slot="switch"');
    expect(source).toContain('data-slot="switch-thumb"');
    expect(source).toContain('data-default-checked={initialChecked ? "true" : undefined}');
    expect(source).toContain('data-name={name}');
    expect(source).toContain('data-unchecked-value={uncheckedValue}');
    expect(source).toContain('data-read-only={readOnly ? "true" : undefined}');
    expect(source).toContain(
      'class={cn(\n    "cn-switch peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",',
    );
    expect(source).toContain(
      'class="cn-switch-thumb pointer-events-none block ring-0 transition-transform"',
    );
    expect(source).toContain('import { create } from "@data-slot/switch";');
    expect(source).toContain("create();");
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain("window.__bejamasSwitchSync");
    expect(source).not.toContain(
      "data-checked:bg-primary data-unchecked:bg-input focus-visible:border-ring",
    );
  });
});
