import { definePinnedPackage } from "@/src/utils/pinned-npm-exec";

export const PINNED_SHADCN = definePinnedPackage({
  name: "shadcn",
  version: "4.21.0",
  bin: "shadcn",
  prefixDir: "bejamas-shadcn",
});
