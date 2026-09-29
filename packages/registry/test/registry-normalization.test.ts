import { describe, expect, it } from "bun:test";
import {
  inferRegistryFileType,
  normalizeRegistryImports,
  normalizeRegistryPath,
  REGISTRY_UI_ALIAS,
} from "../scripts/registry-normalization";

describe("registry normalization", () => {
  it("maps every source location to its published prefix", () => {
    expect(
      normalizeRegistryPath(
        "../../packages/ui/src/components/button/Button.astro",
      ),
    ).toBe("ui/button/Button.astro");
    expect(
      normalizeRegistryPath("../../packages/registry/src/ui/card/Card.astro"),
    ).toBe("ui/card/Card.astro");
    expect(
      normalizeRegistryPath("../../packages/registry/src/lib/utils.ts"),
    ).toBe("lib/utils.ts");
    expect(
      normalizeRegistryPath(
        "../../packages/registry/src/blocks/footer-01/Footer01.astro",
      ),
    ).toBe("blocks/footer-01/Footer01.astro");
    expect(normalizeRegistryPath("ui/button/Button.astro")).toBe(
      "ui/button/Button.astro",
    );
  });

  it("rewrites workspace imports to installer aliases", () => {
    expect(
      normalizeRegistryImports(
        [
          'import { cn } from "@bejamas/registry/lib/utils";',
          'import { select } from "@bejamas/registry/lib/select";',
          'import { Button } from "@bejamas/registry/ui/button";',
          'import { cn as legacy } from "@bejamas/ui/lib/utils";',
        ].join("\n"),
      ),
    ).toBe(
      [
        'import { cn } from "@/lib/utils";',
        'import { select } from "@/lib/select";',
        `import { Button } from "${REGISTRY_UI_ALIAS}button";`,
        'import { cn as legacy } from "@/lib/utils";',
      ].join("\n"),
    );
  });

  it("infers file types from published paths", () => {
    expect(inferRegistryFileType("ui/button/Button.astro")).toBe("registry:ui");
    expect(inferRegistryFileType("lib/utils.ts")).toBe("registry:lib");
    expect(inferRegistryFileType("blocks/footer-01/index.ts")).toBe(
      "registry:component",
    );
    expect(inferRegistryFileType("styles/globals.css")).toBeNull();
  });
});
