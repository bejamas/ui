import { describe, expect, it } from "bun:test";
import {
  buildRegistryBaseCss,
  buildRegistryBaseItem,
  buildRegistryStyleCss,
} from "../src/server";

describe("registry base item", () => {
  it("keeps init css slim while style css stays self-styled", () => {
    const baseItem = buildRegistryBaseItem({
      style: "juno",
      font: "inter",
      iconLibrary: "lucide",
      baseColor: "neutral",
      theme: "neutral",
      radius: "default",
      menuAccent: "subtle",
      menuColor: "default",
    });
    const styleCss = buildRegistryStyleCss("juno");

    expect(baseItem.css).toEqual(buildRegistryBaseCss());
    expect(JSON.stringify(baseItem.css)).not.toContain(".cn-card");
    expect(JSON.stringify(baseItem.css)).not.toContain(".cn-button");
    expect(JSON.stringify(styleCss)).toContain(".cn-card");
  });
});
