import type { IconLibraryName } from "@bejamas/semantic-icons";

type AstroLike = {
  locals?: {
    bejamasTheme?: {
      iconLibrary?: IconLibraryName;
    };
  };
};

export function resolveActiveIconLibrary(
  astro: AstroLike,
  explicitLibrary?: IconLibraryName,
) {
  return explicitLibrary ?? astro.locals?.bejamasTheme?.iconLibrary ?? "lucide";
}
