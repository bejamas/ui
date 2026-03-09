import { describe, expect, it } from "bun:test";
import {
  ICON_DATA,
  ICON_NAME_MAPPINGS,
  SEMANTIC_ICON_NAMES,
  getSemanticIconNameFromLucideExport,
  getSemanticIconNameFromLucidePath,
  renderSemanticIconSvg,
  renderSemanticIconSvgWithAttributeString,
} from "../src/server";

describe("semantic icon mapping", () => {
  it("maps every semantic icon across supported libraries", () => {
    for (const semanticIconName of SEMANTIC_ICON_NAMES) {
      expect(ICON_NAME_MAPPINGS[semanticIconName]).toBeDefined();
      expect(ICON_DATA.lucide[semanticIconName]).toBeDefined();
      expect(ICON_DATA.tabler[semanticIconName]).toBeDefined();
      expect(ICON_DATA.hugeicons[semanticIconName]).toBeDefined();
      expect(ICON_DATA.phosphor[semanticIconName]).toBeDefined();
      expect(ICON_DATA.remixicon[semanticIconName]).toBeDefined();
    }
  });

  it("resolves lucide exports and paths to semantic names", () => {
    expect(getSemanticIconNameFromLucideExport("ChevronDown")).toBe("chevron-down");
    expect(getSemanticIconNameFromLucideExport("Loader2")).toBe("loader-circle");
    expect(getSemanticIconNameFromLucidePath("check")).toBe("check");
    expect(getSemanticIconNameFromLucidePath("chevron-up")).toBe("chevron-up");
  });

  it("renders svg markup with either structured or raw attributes", () => {
    const structured = renderSemanticIconSvg("tabler", "check", {
      class: "size-4",
      "data-slot": "select-item-indicator",
    });
    const raw = renderSemanticIconSvgWithAttributeString(
      "remixicon",
      "loader-circle",
      'class="size-4 animate-spin" aria-hidden="true"',
    );

    expect(structured).toContain("<svg");
    expect(structured).toContain('class="size-4"');
    expect(structured).toContain('data-slot="select-item-indicator"');
    expect(raw).toContain('class="size-4 animate-spin"');
    expect(raw).toContain('aria-hidden="true"');
  });

  it("uses the correct viewBox size for phosphor icons", () => {
    const phosphorChevron = renderSemanticIconSvg("phosphor", "chevron-down");
    const phosphorSpinner = renderSemanticIconSvg("phosphor", "loader-circle");

    expect(phosphorChevron).toContain('viewBox="0 0 256 256"');
    expect(phosphorSpinner).toContain('viewBox="0 0 256 256"');
  });
});
