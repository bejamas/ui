import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const headFile = path.resolve(import.meta.dir, "./Head.astro");
const astroConfigFile = path.resolve(import.meta.dir, "../../../astro.config.mjs");

describe("starlight head create prepaint", () => {
  test("injects the shared menu-color bootstrap and the /create prepaint before route head tags", () => {
    const source = fs.readFileSync(headFile, "utf8");
    const astroConfig = fs.readFileSync(astroConfigFile, "utf8");
    const menuScriptIndex = source.indexOf("menuColorRootBootstrapScript");
    const createScriptIndex = source.indexOf("createDocsRootPrepaintScript &&");
    const headMapIndex = source.indexOf("{head.map(");

    expect(source).toContain(
      'import { buildMenuColorRootBootstrapScript } from "@/utils/themes/menu-color-state";',
    );
    expect(source).toContain(
      'import { buildCreateDocsRootPrepaintScript } from "@/utils/create-docs-shell";',
    );
    expect(source).toContain(
      "const menuColorRootBootstrapScript = buildMenuColorRootBootstrapScript();",
    );
    expect(source).toContain('Astro.url.pathname === "/create"');
    expect(source).toContain("buildCreateDocsRootPrepaintScript()");
    expect(menuScriptIndex).toBeGreaterThan(-1);
    expect(createScriptIndex).toBeGreaterThan(-1);
    expect(headMapIndex).toBeGreaterThan(-1);
    expect(menuScriptIndex).toBeLessThan(createScriptIndex);
    expect(createScriptIndex).toBeLessThan(headMapIndex);
    expect(astroConfig).toContain('Head: "./src/components/starlight/Head.astro"');
  });
});
