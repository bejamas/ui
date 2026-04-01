declare global {
  namespace App {
    interface Locals {
      bejamasTheme?: {
        iconLibrary?:
          | "lucide"
          | "hugeicons"
          | "tabler"
          | "phosphor"
          | "remixicon";
      };
    }
  }

  interface Window {
    astroThemeToggle?: {
      getTheme: () => "dark" | "light";
      setTheme: (theme: "dark" | "light") => void;
    };
  }

  const astroThemeToggle: {
    getTheme: () => "dark" | "light";
    setTheme: (theme: "dark" | "light") => void;
  };
}

export {};
