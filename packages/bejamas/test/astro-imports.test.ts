// @ts-nocheck
import { expect, test } from "bun:test";
import { rewriteAstroImports } from "../src/utils/astro-imports";
import type { Config } from "../src/utils/get-config";

function makeConfig(partial: Partial<Config>): Config {
  // Minimal stub that satisfies the shape we need in tests.
  return {
    style: "new-york",
    rsc: false,
    tsx: true,
    tailwind: {
      config: "",
      css: "",
      baseColor: "neutral",
      cssVariables: true,
    },
    iconLibrary: "lucide",
    aliases: {
      components: "@/components",
      hooks: "@/hooks",
      lib: "@/lib",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      ...(partial.aliases ?? {}),
    },
    resolvedPaths: {
      cwd: process.cwd(),
      tailwindConfig: "",
      tailwindCss: "",
      utils: "",
      components: "",
      ui: "",
      lib: "",
      hooks: "",
      ...(partial.resolvedPaths ?? {}),
    },
    registries: {},
    ...partial,
  } as Config;
}

test("rewrites registry imports inside astro files using workspace aliases", () => {
  const config = makeConfig({
    aliases: {
      components: "@repo/ui/components",
      utils: "@repo/ui/lib/utils",
    },
  });

  const raw = `---
import { Button } from "@/registry/new-york/ui/button"
import { cn } from "@/lib/utils"
import "@/registry/new-york/styles.css"
---
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).toContain(
    `import { Button } from "@repo/ui/components/ui/button"`,
  );
  expect(result).toContain(`import { cn } from "@repo/ui/lib/utils"`);
  expect(result).toContain(`import "@repo/ui/components/styles.css"`);
});

test("keeps non-registry imports intact", () => {
  const config = makeConfig({
    aliases: {
      components: "@workspace/ui/components",
      utils: "@workspace/ui/lib/utils",
    },
  });

  const raw = `---
import { Foo } from "third-party-lib"
import { cn } from "@workspace/ui/lib/utils"
import { Bar } from "@/registry/new-york/ui/bar"
---
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).toContain(`import { Foo } from "third-party-lib"`);
  expect(result).toContain(
    `import { Bar } from "@workspace/ui/components/ui/bar"`,
  );
  expect(result).toContain(`import { cn } from "@workspace/ui/lib/utils"`);
});
