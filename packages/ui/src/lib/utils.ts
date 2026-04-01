// Generated from packages/registry/src/lib. Do not edit packages/ui/src/lib/utils.ts directly.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
