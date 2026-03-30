import type { DesignSystemConfig } from "@bejamas/create-config/browser";
import type {
  CreateFontGroup,
  CreateLockableParam,
} from "@/utils/create-sidebar";
import type { ThemeMode, ThemeOverrides } from "@/utils/themes/create-theme";

export type CreateConfig = DesignSystemConfig;
export type HistoryMode = "push" | "replace";
export type CreateSidebarPanel = "main" | "theme-list" | "palette-editor";

export type PreviewMessage = {
  type: "bejamas:create-preview";
  config: CreateConfig;
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
};

export type PreviewShortcutMessage = {
  type: "bejamas:create-navigate-open";
};

export type ColorInputElement = HTMLElement & {
  dataset: DOMStringMap & {
    createThemeMode?: ThemeMode;
    token?: string;
  };
  setColor?: (value: string) => void;
};

export type PaletteSnapshot = {
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
} | null;

export type CreateSidebarRenderState = {
  config: CreateConfig;
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
  themeMode: ThemeMode;
  lockedParams: Set<CreateLockableParam>;
  lockedFontGroup: CreateFontGroup | null;
};

declare global {
  interface Window {
    __BEJAMAS_CREATE__?: {
      styleCssByStyle: Record<string, string>;
      initialThemeRef?: string | null;
      initialThemeOverrides?: Partial<ThemeOverrides> | null;
    };
    __BEJAMAS_CREATE_PREVIEW__?: {
      styleCssByStyle: Record<string, string>;
      initialThemeOverrides?: Partial<ThemeOverrides> | null;
      initialConfig?: CreateConfig | null;
    };
    StarlightThemeProvider?: {
      updatePickers?: (themeChoice: ThemeMode) => void;
    };
  }
}
