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
    menuColor: "default",
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

test("rewrites lucide icon file imports to selected icon svg markup", () => {
  const config = makeConfig({
    iconLibrary: "tabler",
    aliases: {
      components: "@workspace/ui/components",
      utils: "@workspace/ui/lib/utils",
    },
  });

  const raw = `---
import ChevronDownIcon from "@lucide/astro/icons/chevron-down";
---

<button>
  <ChevronDownIcon class="size-4 text-muted-foreground" data-slot="select-icon" />
</button>
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).not.toContain('@lucide/astro/icons/chevron-down');
  expect(result).toContain("<svg");
  expect(result).toContain('class="size-4 text-muted-foreground"');
  expect(result).toContain('data-slot="select-icon"');
  expect(result).toContain('stroke="currentColor"');
});

test("rewrites named lucide imports to selected icon svg markup and keeps non-icons", () => {
  const config = makeConfig({
    iconLibrary: "remixicon",
    aliases: {
      components: "@workspace/ui/components",
      utils: "@workspace/ui/lib/utils",
    },
  });

  const raw = `---
import { cn } from "@/lib/utils";
import { Check, SomethingElse, LoaderCircle as Loader2Icon } from "@lucide/astro";
---

<div class={cn("flex", className)}>
  <Check class="size-3.5" />
  <Loader2Icon class="size-4 animate-spin" />
</div>
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).toContain('import { SomethingElse } from "@lucide/astro";');
  expect(result).not.toContain("LoaderCircle as Loader2Icon");
  expect(result).not.toContain("<Check");
  expect(result).not.toContain("<Loader2Icon");
  expect(result).toContain('class="size-3.5"');
  expect(result).toContain('class="size-4 animate-spin"');
  expect(result).toContain("<svg");
});

test("rewrites SemanticIcon usages to concrete svg markup even for lucide output", () => {
  const config = makeConfig({
    iconLibrary: "lucide",
    aliases: {
      components: "@workspace/ui/components",
      utils: "@workspace/ui/lib/utils",
    },
  });

  const raw = `---
import SemanticIcon from "../icon/SemanticIcon.astro";
---

<button>
  <SemanticIcon name="chevron-down" class="size-4 text-muted-foreground" data-slot="select-icon" />
</button>
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).not.toContain("SemanticIcon");
  expect(result).toContain("<svg");
  expect(result).toContain('class="size-4 text-muted-foreground"');
  expect(result).toContain('data-slot="select-icon"');
});

test("rewrites menu placeholders for translucent menu output", () => {
  const config = makeConfig({
    menuColor: "default-translucent",
  });

  const raw = `<div class="cn-dropdown-menu-content cn-menu-target cn-menu-translucent rounded-lg shadow-md"></div>`;

  const result = rewriteAstroImports(raw, config);

  expect(result).not.toContain("cn-menu-target");
  expect(result).not.toContain("cn-menu-translucent");
  expect(result).toContain("bg-popover/70");
  expect(result).toContain("before:backdrop-blur-2xl");
  expect(result).toContain('class="cn-dropdown-menu-content');
});

test("rewrites menu placeholders for inverted translucent menu output", () => {
  const config = makeConfig({
    menuColor: "inverted-translucent",
  });

  const raw = `<div class="cn-dropdown-menu-content cn-menu-target cn-menu-translucent rounded-lg shadow-md"></div>`;

  const result = rewriteAstroImports(raw, config);

  expect(result).toContain("dark");
  expect(result).toContain("bg-popover/70");
  expect(result).not.toContain("cn-menu-target");
  expect(result).not.toContain("cn-menu-translucent");
});
