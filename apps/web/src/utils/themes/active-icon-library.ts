import {
  decodePreset,
  isPresetCode,
  type IconLibraryName,
} from "@bejamas/create-config/browser";
import { parseThemeCookie } from "./theme-cookie";

export function resolveActiveIconLibrary(
  searchParams: URLSearchParams,
  cookieValue?: string | null,
): IconLibraryName {
  const queryPreset = searchParams.get("preset");

  if (queryPreset && isPresetCode(queryPreset)) {
    return decodePreset(queryPreset)?.iconLibrary ?? "lucide";
  }

  if (cookieValue) {
    const themeId = parseThemeCookie(cookieValue).id;

    if (isPresetCode(themeId)) {
      return decodePreset(themeId)?.iconLibrary ?? "lucide";
    }
  }

  return "lucide";
}
