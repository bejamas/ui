type AstroVirtualComponent =
  import("astro/runtime/server/index.js").AstroComponentFactory;

declare module "virtual:starlight/user-config" {
  const config: import("@astrojs/starlight/types").StarlightConfig;
  export default config;
}

declare module "virtual:starlight/components/LanguageSelect" {
  const LanguageSelect: AstroVirtualComponent;
  export default LanguageSelect;
}

declare module "virtual:starlight/components/Search" {
  const Search: AstroVirtualComponent;
  export default Search;
}

declare module "virtual:starlight/components/SiteTitle" {
  const SiteTitle: AstroVirtualComponent;
  export default SiteTitle;
}

declare module "virtual:starlight/components/SocialIcons" {
  const SocialIcons: AstroVirtualComponent;
  export default SocialIcons;
}

declare module "virtual:starlight/components/ThemeSelect" {
  const ThemeSelect: AstroVirtualComponent;
  export default ThemeSelect;
}

declare module "virtual:starlight/pagefind-config" {
  export const pagefindUserConfig: Record<string, unknown>;
}

declare module "virtual:starlight-theme-bejamas/user-config" {
  const config: import("starlight-theme-bejamas/config").StarlightThemeBejamasConfig;
  export default config;
}

declare module "virtual:starlight-theme-bejamas/components/button" {
  export { Button as default, Button } from "@bejamas/registry/ui/button";
  export * from "@bejamas/registry/ui/button";
}
