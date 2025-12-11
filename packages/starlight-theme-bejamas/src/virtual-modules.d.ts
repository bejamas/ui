// import type { StarlightConfig } from "@astrojs/starlight";

declare module "virtual:starlight/user-config" {
  const Config: import("@astrojs/starlight/types").StarlightConfig;
  export default Config;
}

declare module "virtual:starlight/user-images" {
  type ImageMetadata = import("astro").ImageMetadata;
  export const logos: {
    dark?: ImageMetadata;
    light?: ImageMetadata;
  };
}

declare module "virtual:starlight-theme-bejamas/user-config" {
  import type { StarlightThemeBejamasConfig } from "./config";

  const config: StarlightThemeBejamasConfig;
  export default config;
}

declare module "virtual:starlight-theme-bejamas/components/*" {
  const Component: import("astro/runtime/server").AstroComponentFactory;
  export default Component;
}

export {};
