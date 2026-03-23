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
  fontHeading: "inherit",
  iconLibrary: "lucide",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
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

  it("applies curated bejamas blue tokens on top of the neutral base", () => {
    const curatedConfig = {
      ...baseConfig,
      theme: "bejamas-blue",
    } as const;
    const resolved = resolveDesignSystemTheme(curatedConfig);
    const registryTheme = buildRegistryTheme(curatedConfig);

    expect(registryTheme.cssVars.light?.primary).toBe(
      "oklch(0.56 0.15 248.21)",
    );
    expect(registryTheme.cssVars.dark?.primary).toBe("oklch(0.56 0.15 248.21)");
    expect(resolved.styles.light["chart-4"]).toBe("oklch(0.56 0.15 248.21)");
    expect(resolved.styles.dark["sidebar-primary"]).toBe(
      "oklch(0.56 0.15 248.21)",
    );
  });

  it("applies curated neon yellow tokens on top of the neutral base", () => {
    const curatedConfig = {
      ...baseConfig,
      theme: "bejamas-neon-yellow",
    } as const;
    const resolved = resolveDesignSystemTheme(curatedConfig);
    const registryTheme = buildRegistryTheme(curatedConfig);

    expect(registryTheme.cssVars.light?.primary).toBe(
      "oklch(91.98% 0.1905 128.5)",
    );
    expect(registryTheme.cssVars.dark?.primary).toBe(
      "oklch(91.98% 0.1905 128.5)",
    );
    expect(registryTheme.cssVars.light?.["primary-foreground"]).toBe(
      "oklch(0 0 0)",
    );
    expect(registryTheme.cssVars.dark?.["primary-foreground"]).toBe(
      "oklch(0 0 0)",
    );
    expect(resolved.styles.light["chart-4"]).toBe("oklch(91.98% 0.1905 128.5)");
    expect(resolved.styles.dark["sidebar-primary"]).toBe(
      "oklch(91.98% 0.1905 128.5)",
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

  it("keeps font-heading aligned with the body font unless a distinct heading font is selected", () => {
    const inherited = resolveDesignSystemTheme(baseConfig);
    const distinct = resolveDesignSystemTheme({
      ...baseConfig,
      font: "inter",
      fontHeading: "playfair-display",
    });

    expect(inherited.styles.light["font-heading"]).toContain("Geist");
    expect(distinct.styles.light["font-sans"]).toContain("Inter");
    expect(distinct.styles.light["font-heading"]).toContain("Playfair Display");
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
    expect(css).toContain("--font-heading:");
    expect(css).toContain(".cn-menu-target.dark");
    expect(css).toContain("oklch(");
    expect(css).not.toContain("hsl(");
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

  it("keeps explicit radius overrides unless the style locks radius", () => {
    const css = buildDesignSystemThemeCss({
      ...baseConfig,
      style: "lyra",
      radius: "large",
    });

    expect(css).toContain("--radius: 0;");
  });

  it("preserves translucent dark tokens like border and input", () => {
    const css = buildDesignSystemThemeCss(baseConfig);

    expect(css).toContain("/ 10%");
    expect(css).toContain("/ 15%");
  });
});
