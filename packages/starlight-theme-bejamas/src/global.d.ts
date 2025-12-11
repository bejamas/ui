declare global {
  interface Window {
    StarlightThemeProvider?: {
      updatePickers: (theme?: string) => void;
    };
  }

  const StarlightThemeProvider: {
    updatePickers: (theme?: string) => void;
  };

  namespace App {
    interface Locals {
      t: I18nT;
      starlightRoute: StarlightRouteData;
    }
  }
}
