declare global {
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
