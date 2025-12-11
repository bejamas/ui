/// <reference path="./virtual-modules.d.ts" />
/// <reference path="./virtual-internal.d.ts" />

import type { I18nT } from "@astrojs/starlight/utils/createTranslationSystem";
import type { StarlightRouteData } from "@astrojs/starlight/utils/routing/types";

declare global {
  namespace App {
    interface Locals {
      t: I18nT;
      starlightRoute: StarlightRouteData;
    }
  }
}

export {};
