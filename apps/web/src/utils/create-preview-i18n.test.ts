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

  it("includes the new overview and icon demo copy in every supported language", () => {
    const english = getCreatePreviewCopy("en");
    const arabic = getCreatePreviewCopy("ar");
    const persian = getCreatePreviewCopy("fa");
    const hebrew = getCreatePreviewCopy("he");

    expect(english["overview.title"]).toBe("Style overview");
    expect(english["icons.title"]).toBe("Card with icons");
    expect(arabic["overview.description"]).toBeTruthy();
    expect(arabic["icons.description"]).toBeTruthy();
    expect(persian["overview.description"]).toBeTruthy();
    expect(persian["icons.description"]).toBeTruthy();
    expect(hebrew["overview.description"]).toBeTruthy();
    expect(hebrew["icons.description"]).toBeTruthy();
  });
});
