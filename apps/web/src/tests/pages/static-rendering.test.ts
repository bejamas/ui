import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const astroConfigFile = path.resolve(
  import.meta.dir,
  "../../../astro.config.mjs",
);
const createPageFile = path.resolve(
  import.meta.dir,
  "../../pages/create.astro",
);
const createPreviewFile = path.resolve(
  import.meta.dir,
  "../../pages/create/preview.astro",
);
const registryItemRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/[name].json.ts",
);
const styleRegistryItemRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/styles/[style]/[name].json.ts",
);
const routeMiddlewareFile = path.resolve(
  import.meta.dir,
  "../../route-middleware.ts",
);

describe("static rendering boundary", () => {
  test("uses server output with static-first route defaults", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(source).toContain('output: "server"');
    expect(source).toContain('name: "static-first-routes"');
    expect(source).toContain('"astro:route:setup"({ route }) {');
    expect(source).toContain("route.prerender = true;");
  });

  test("keeps request-driven create pages explicitly dynamic", () => {
    expect(fs.readFileSync(createPageFile, "utf8")).toContain(
      "export const prerender = false;",
    );
    expect(fs.readFileSync(createPreviewFile, "utf8")).toContain(
      "export const prerender = false;",
    );
  });

  test("drops the dead theme-cookie personalization from route middleware", () => {
    const source = fs.readFileSync(routeMiddlewareFile, "utf8");

    expect(source).not.toContain("PRESET_COOKIE_NAME");
    expect(source).not.toContain("resolveActiveIconLibrary");
    expect(source).not.toContain("context.locals.bejamasTheme");
  });

  test("roots static registry scans at the app cwd for prerender builds", () => {
    const registrySource = fs.readFileSync(registryItemRouteFile, "utf8");
    const styleRegistrySource = fs.readFileSync(
      styleRegistryItemRouteFile,
      "utf8",
    );

    expect(registrySource).toContain('path.resolve(process.cwd(), "public/r")');
    expect(registrySource).not.toContain("fileURLToPath");
    expect(styleRegistrySource).toContain(
      'path.resolve(process.cwd(), "public/r/styles")',
    );
    expect(styleRegistrySource).not.toContain("fileURLToPath");
  });
});
