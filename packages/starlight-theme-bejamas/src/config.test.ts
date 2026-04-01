import { describe, expect, test } from "bun:test";

import { StarlightThemeBejamasConfigSchema } from "./config";

describe("starlight-theme-bejamas config schema", () => {
  test("parses nav and component maps under zod v4", () => {
    const result = StarlightThemeBejamasConfigSchema.safeParse({
      nav: [
        {
          label: {
            en: "Docs",
            fr: "Documentation",
          },
          href: "/docs/introduction",
          attrs: {
            rel: "prefetch",
            "data-track": "docs-link",
          },
        },
      ],
      components: {
        ThemeSelect: "./src/components/ThemeSwitcher.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw result.error;
    }

    expect(result.data.nav?.[0]?.label).toEqual({
      en: "Docs",
      fr: "Documentation",
    });
    expect(result.data.components?.ThemeSelect).toBe(
      "./src/components/ThemeSwitcher.astro",
    );
  });
});
