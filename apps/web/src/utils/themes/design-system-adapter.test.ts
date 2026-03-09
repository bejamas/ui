import { describe, expect, it } from "bun:test";
import { buildRegistryTheme } from "@bejamas/create-config/browser";
import {
  buildDesignSystemThemeCss,
  resolveDesignSystemTheme,
} from "./design-system-adapter";

const baseConfig = {
  style: "juno",
  baseColor: "neutral",
  theme: "neutral",
  font: "geist",
  iconLibrary: "lucide",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
  template: "astro",
  rtl: false,
} as const;

describe("resolveDesignSystemTheme", () => {
  it("keeps core tokens aligned with shadcn registry theme resolution", () => {
    const resolved = resolveDesignSystemTheme(baseConfig);
    const registryTheme = buildRegistryTheme(baseConfig);

    expect(resolved.styles.light.background).toBe(
      registryTheme.cssVars.light?.background,
    );
    expect(resolved.styles.light.primary).toBe(
      registryTheme.cssVars.light?.primary,
    );
    expect(resolved.styles.dark.background).toBe(
      registryTheme.cssVars.dark?.background,
    );
    expect(resolved.styles.dark.sidebar).toBe(
      registryTheme.cssVars.dark?.sidebar,
    );
  });

  it("always surfaces the selected font through font-sans for preview parity", () => {
    const resolved = resolveDesignSystemTheme({
      ...baseConfig,
      font: "jetbrains-mono",
    });

    expect(resolved.styles.light["font-sans"]).toContain("JetBrains Mono");
    expect(resolved.styles.light["font-mono"]).toContain("JetBrains Mono");
    expect(resolved.font.family).toContain("JetBrains Mono");
  });

  it("builds site theme css through the existing applyThemeToCss path", () => {
    const css = buildDesignSystemThemeCss({
      ...baseConfig,
      menuAccent: "bold",
      radius: "large",
    });

    expect(css).toContain("html:root");
    expect(css).toContain("--accent:");
    expect(css).toContain("--radius:");
    expect(css).toContain("--font-sans:");
    expect(css).toContain(".cn-menu-target.dark");
  });

  it("treats default radius as style-linked for lyra and maia", () => {
    const lyraTheme = buildRegistryTheme({
      ...baseConfig,
      style: "lyra",
      radius: "default",
    });
    const maiaTheme = buildRegistryTheme({
      ...baseConfig,
      style: "maia",
      radius: "default",
    });

    expect(lyraTheme.cssVars.light?.radius).toBe("0");
    expect(maiaTheme.cssVars.light?.radius).toBe("0.875rem");
  });

  it("keeps explicit radius overrides over the style-linked default", () => {
    const css = buildDesignSystemThemeCss({
      ...baseConfig,
      style: "lyra",
      radius: "large",
    });

    expect(css).toContain("--radius: 0.875rem;");
  });

  it("preserves translucent dark tokens like border and input", () => {
    const css = buildDesignSystemThemeCss(baseConfig);

    expect(css).toContain("/ 10%");
    expect(css).toContain("/ 15%");
  });
});
