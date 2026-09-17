// @ts-nocheck
import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fixAstroImports,
  getConfiguredSourceRoots,
  isPathWithin,
  rewriteAstroImports,
} from "../src/utils/astro-imports";
import type { Config } from "../src/utils/get-config";

function makeConfig(partial: Partial<Config>): Config {
  // Minimal stub that satisfies the shape we need in tests.
  return {
    style: "new-york",
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

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

test("rewrites Bejamas block imports to the project's UI alias", () => {
  const source = `---\nimport { Button } from "@/registry/bejamas/ui/button";\nimport { Card } from "@/registry/bejamas/ui/card";\n---\n`;

  const standalone = rewriteAstroImports(
    source,
    makeConfig({
      aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/ui" },
    }),
  );
  expect(standalone).toContain(`from "@/ui/button"`);
  expect(standalone).toContain(`from "@/ui/card"`);

  const monorepoApp = rewriteAstroImports(
    source,
    makeConfig({
      aliases: {
        components: "@/components",
        utils: "@repo/ui/lib/utils",
        ui: "@repo/ui/components",
      },
    }),
  );
  expect(monorepoApp).toContain(`from "@repo/ui/components/button"`);
  expect(monorepoApp).not.toContain("@/registry/");
});

test("repairs only the listed files when scoped to installed block files", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "bejamas-imports-"));
  tempDirs.push(cwd);
  const blockFile = path.join(
    cwd,
    "src/components/blocks/features-01/Features01.astro",
  );
  const barrelFile = path.join(
    cwd,
    "src/components/blocks/features-01/index.ts",
  );
  const untouchedFile = path.join(cwd, "src/components/Untouched.astro");
  const registryImport = `---\nimport { Button } from "@/registry/bejamas/ui/button";\n---\n`;
  await fs.mkdir(path.dirname(blockFile), { recursive: true });
  await fs.writeFile(blockFile, registryImport);
  await fs.writeFile(
    barrelFile,
    `export { default as Features01 } from "./Features01.astro";\n`,
  );
  await fs.writeFile(untouchedFile, registryImport);

  const config = makeConfig({
    aliases: { components: "@/widgets", utils: "@/lib/utils", ui: "@/ui" },
    resolvedPaths: {
      cwd,
      components: path.join(cwd, "src/widgets"),
      ui: path.join(cwd, "src/ui"),
      lib: path.join(cwd, "src/lib"),
    },
  });

  await fixAstroImports(cwd, false, config, {
    kind: "files",
    paths: [
      path.relative(cwd, blockFile),
      barrelFile,
      "src/components/blocks/missing.astro",
      "src/styles/blocks.css",
    ],
  });

  expect(await fs.readFile(blockFile, "utf8")).toContain(`from "@/ui/button"`);
  expect(await fs.readFile(barrelFile, "utf8")).toContain(
    `from "./Features01.astro"`,
  );
  expect(await fs.readFile(untouchedFile, "utf8")).toContain(
    `from "@/registry/bejamas/ui/button"`,
  );
});

test("exposes configured source roots and path containment checks", () => {
  const config = makeConfig({
    resolvedPaths: {
      cwd: "/repo",
      components: "/repo/src/components",
      ui: "/repo/src/components",
      lib: "/repo/src/lib",
      hooks: "",
    },
  });

  expect(getConfiguredSourceRoots(config)).toEqual([
    "/repo/src/components",
    "/repo/src/lib",
  ]);
  expect(
    isPathWithin(
      "/repo/src/components/ui/Button.astro",
      "/repo/src/components",
    ),
  ).toBe(true);
  expect(isPathWithin("/repo/src/components", "/repo/src/components")).toBe(
    true,
  );
  expect(
    isPathWithin("/repo/src/componentsx/A.astro", "/repo/src/components"),
  ).toBe(false);
  expect(
    isPathWithin("/repo/src/pages/index.astro", "/repo/src/components"),
  ).toBe(false);
});

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

  expect(result).not.toContain("@lucide/astro/icons/chevron-down");
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

test("rewrites command and dialog icons to selected non-lucide svg markup", () => {
  const config = makeConfig({
    iconLibrary: "tabler",
    aliases: {
      components: "@workspace/ui/components",
      utils: "@workspace/ui/lib/utils",
    },
  });

  const raw = `---
import { cn } from "@/lib/utils";
import { SearchIcon } from "@lucide/astro";
import SemanticIcon from "../icon/SemanticIcon.astro";
---

<div class={cn("flex", className)}>
  <SearchIcon class="size-4 opacity-50" data-slot="command-input-icon" />
  <SemanticIcon name="x" class="size-4" data-slot="dialog-close-icon" />
</div>
`;

  const result = rewriteAstroImports(raw, config);

  expect(result).not.toContain("@lucide/astro");
  expect(result).not.toContain("SearchIcon");
  expect(result).not.toContain("SemanticIcon");
  expect(result).toContain("<svg");
  expect(result).toContain('data-slot="command-input-icon"');
  expect(result).toContain('data-slot="dialog-close-icon"');
  expect(result).toContain('class="size-4 opacity-50"');
  expect(result).toContain('class="size-4"');
  expect(result).toContain('stroke="currentColor"');
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

test("repairs shortened lib aliases in frontmatter, client scripts and helper exports", () => {
  const config = makeConfig({
    aliases: {
      components: "@repo/ui/components",
      ui: "@repo/ui/components",
      lib: "@repo/ui/lib",
      utils: "@repo/ui/lib/utils",
      hooks: "@repo/ui/hooks",
    },
  });
  const source = `---
import { cn } from "@repo/lib/utils";
import { toggle } from "@/lib/toggle-shared";
---
<script>import { controller } from "@repo/lib/toggle-group-controller";</script>
export { toggle } from "@repo/lib/toggle-shared";
const lazy = import("@repo/lib/toggle-shared");
import { other } from "@repo/other/lib/helper";`;
  const output = rewriteAstroImports(source, config);
  expect(output).not.toContain('"@repo/lib/');
  expect(output).not.toContain('"@/lib/');
  expect(output).toContain('"@repo/ui/lib/utils"');
  expect(output).toContain('"@repo/ui/lib/toggle-shared"');
  expect(output).toContain('"@repo/ui/lib/toggle-group-controller"');
  expect(output).toContain('"@repo/other/lib/helper"');
});
