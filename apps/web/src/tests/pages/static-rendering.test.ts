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
const formsActionsPageFile = path.resolve(
  import.meta.dir,
  "../../pages/kitchen-sink/forms-actions.astro",
);
const sharedThemePageFile = path.resolve(
  import.meta.dir,
  "../../pages/t/[id].astro",
);
const registryItemRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/[name].json.ts",
);
const colorRegistryRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/colors/[name].json.ts",
);
const styleRegistryIndexRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/styles/[style]/index.json.ts",
);
const styleRegistryItemRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/styles/[style]/[name].json.ts",
);
const themeStylesheetRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/r/themes/[slug].css.ts",
);
const blockRouteFile = path.resolve(
  import.meta.dir,
  "../../pages/blocks/[slug].astro",
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
    expect(source).toContain('if (!route.component.startsWith("src/pages/")) {');
    expect(source).toContain('route.component.startsWith("src/pages/api/")');
    expect(source).toContain('const DYNAMIC_HTML_ROUTE_COMPONENTS = new Set([');
    expect(source).toContain('"src/pages/kitchen-sink/forms-actions.astro"');
    expect(source).toContain('"src/pages/t/[id].astro"');
    expect(source).toContain('const DYNAMIC_ENDPOINT_COMPONENTS = new Set([');
    expect(source).toContain('"src/pages/init.ts"');
    expect(source).toContain('"src/pages/r/themes/current-theme.css.ts"');
    expect(source).toContain('"src/pages/r/themes/[slug].json.ts"');
    expect(source).toContain("route.prerender = true;");
    expect(source).toContain("route.prerender = false;");
    expect(source).not.toContain('if (typeof route.prerender === "undefined")');
  });

  test("keeps create pages static and limits dynamic HTML routes to the approved exceptions", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(fs.readFileSync(createPageFile, "utf8")).not.toContain(
      "export const prerender = false;",
    );
    expect(fs.readFileSync(createPreviewFile, "utf8")).not.toContain(
      "export const prerender = false;",
    );
    expect(fs.readFileSync(formsActionsPageFile, "utf8")).toContain(
      "export const prerender = false;",
    );
    expect(fs.readFileSync(sharedThemePageFile, "utf8")).toContain(
      "export const prerender = false;",
    );
    expect(source).not.toContain('"src/pages/index.astro"');
    expect(source).not.toContain('"src/pages/components.astro"');
  });

  test("drops the dead theme-cookie personalization from route middleware", () => {
    const source = fs.readFileSync(routeMiddlewareFile, "utf8");

    expect(source).not.toContain("PRESET_COOKIE_NAME");
    expect(source).not.toContain("resolveActiveIconLibrary");
    expect(source).not.toContain("context.locals.bejamasTheme");
  });

  test("roots static registry scans at the app cwd for prerender builds", () => {
    const registrySource = fs.readFileSync(registryItemRouteFile, "utf8");
    const colorRegistrySource = fs.readFileSync(colorRegistryRouteFile, "utf8");
    const styleRegistryIndexSource = fs.readFileSync(
      styleRegistryIndexRouteFile,
      "utf8",
    );
    const styleRegistrySource = fs.readFileSync(
      styleRegistryItemRouteFile,
      "utf8",
    );
    const themeStylesheetSource = fs.readFileSync(
      themeStylesheetRouteFile,
      "utf8",
    );
    const blockRouteSource = fs.readFileSync(blockRouteFile, "utf8");

    expect(registrySource).toContain('path.resolve(process.cwd(), "public/r")');
    expect(registrySource).toContain("export const prerender = true;");
    expect(registrySource).toContain("STATIC_ASSET_CACHE_CONTROL");
    expect(registrySource).not.toContain("fileURLToPath");
    expect(colorRegistrySource).toContain("export const prerender = true;");
    expect(colorRegistrySource).toContain("STATIC_ASSET_CACHE_CONTROL");
    expect(styleRegistryIndexSource).toContain(
      "export const prerender = true;",
    );
    expect(styleRegistryIndexSource).toContain("STATIC_ASSET_CACHE_CONTROL");
    expect(styleRegistrySource).toContain(
      'path.resolve(process.cwd(), "public/r/styles")',
    );
    expect(styleRegistrySource).toContain("export const prerender = true;");
    expect(styleRegistrySource).toContain("STATIC_ASSET_CACHE_CONTROL");
    expect(styleRegistrySource).not.toContain("fileURLToPath");
    expect(themeStylesheetSource).toContain("export const prerender = true;");
    expect(themeStylesheetSource).toContain("STATIC_ASSET_CACHE_CONTROL");
    expect(blockRouteSource).toContain("export const prerender = true;");
  });
});
