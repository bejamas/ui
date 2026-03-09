import { describe, expect, it } from "bun:test";
import { getCreatePreviewCopy } from "./create-preview-i18n";

describe("create preview i18n", () => {
  it("returns English starter copy by default", () => {
    const copy = getCreatePreviewCopy("en");

    expect(copy["hero.title"]).toContain("Astro design system");
    expect(copy["actions.createProject"]).toBe("Create project");
  });

  it("returns RTL-specific translated copy", () => {
    const arabic = getCreatePreviewCopy("ar");
    const persian = getCreatePreviewCopy("fa");
    const hebrew = getCreatePreviewCopy("he");

    expect(arabic["actions.previewDocs"]).toBe("معاينة التوثيق");
    expect(persian["actions.createProject"]).toBe("ایجاد پروژه");
    expect(hebrew["people.coreBadge"]).toBe("ליבה");
  });
});
