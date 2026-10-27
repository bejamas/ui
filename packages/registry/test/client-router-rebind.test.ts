import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const uiRoot = path.resolve(import.meta.dir, "../src/ui");

// Bundled component scripts run once per session, so under Astro's
// ClientRouter they must bind again on `astro:page-load`.
function bundledScripts() {
  const scripts: { file: string; script: string }[] = [];
  for (const dir of readdirSync(uiRoot)) {
    for (const file of readdirSync(path.join(uiRoot, dir))) {
      if (!file.endsWith(".astro")) continue;
      const source = readFileSync(path.join(uiRoot, dir, file), "utf8");
      for (const [, script] of source.matchAll(
        /^<script>\n([\s\S]*?)^<\/script>/gm,
      )) {
        scripts.push({ file: `${dir}/${file}`, script });
      }
    }
  }
  return scripts;
}

describe("ClientRouter re-binding", () => {
  test("every bundled script that binds roots also binds on astro:page-load", () => {
    const binding = bundledScripts().filter(({ script }) =>
      script.includes("querySelectorAll"),
    );

    expect(binding.length).toBeGreaterThan(15);
    for (const { file, script } of binding) {
      expect({ file, rebinds: script.includes('"astro:page-load"') }).toEqual({
        file,
        rebinds: true,
      });
      // Controllers of removed roots are released, either when the next page
      // binds or before the swap.
      const releases =
        script.includes("isConnected") ||
        script.includes('"astro:before-swap"');
      expect({ file, releases }).toEqual({ file, releases: true });
    }
  });

  test("toast triggers dispatch to the current page's toaster", () => {
    const toast = readFileSync(
      path.join(uiRoot, "toast/Toast.astro"),
      "utf8",
    );

    expect(toast).not.toContain("roots[0]");
    expect(toast).toContain(
      `document.querySelector('[data-slot="toast"]')?.dispatchEvent`,
    );
  });
});
