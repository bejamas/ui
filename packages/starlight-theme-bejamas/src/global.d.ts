declare global {
  interface Window {
    StarlightThemeProvider?: {
      refreshThemeColors?: (theme?: string) => void;
      updatePickers?: (theme?: string) => void;
    };
  }

  const StarlightThemeProvider: {
    refreshThemeColors?: (theme?: string) => void;
    updatePickers?: (theme?: string) => void;
  };

  namespace App {
    interface Locals {
      t: I18nT;
      starlightRoute: StarlightRouteData;
    }
  }
}
