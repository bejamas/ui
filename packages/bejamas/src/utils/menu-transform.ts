const TRANSLUCENT_CLASSES = [
  "animate-none!",
  "relative",
  "bg-popover/70",
  "before:pointer-events-none",
  "before:absolute",
  "before:inset-0",
  "before:-z-1",
  "before:rounded-[inherit]",
  "before:backdrop-blur-2xl",
  "before:backdrop-saturate-150",
  "**:data-[slot$=-item]:focus:bg-foreground/10",
  "**:data-[slot$=-item]:data-highlighted:bg-foreground/10",
  "**:data-[slot$=-separator]:bg-foreground/5",
  "**:data-[slot$=-trigger]:focus:bg-foreground/10",
  "**:data-[slot$=-trigger]:aria-expanded:bg-foreground/10!",
  "**:data-[variant=destructive]:focus:bg-foreground/10!",
  "**:data-[variant=destructive]:text-accent-foreground!",
  "**:data-[variant=destructive]:**:text-accent-foreground!",
];

function transformMenuTokens(tokens: string[], menuColor?: string) {
  const transformed: string[] = [];

  for (const token of tokens) {
    if (token === "cn-menu-target") {
      if (menuColor === "inverted") {
        transformed.push("dark");
      } else if (menuColor === "default-translucent") {
        transformed.push(...TRANSLUCENT_CLASSES);
      } else if (menuColor === "inverted-translucent") {
        transformed.push("dark", ...TRANSLUCENT_CLASSES);
      }
      continue;
    }

    if (token === "cn-menu-translucent") {
      if (
        menuColor === "default-translucent" ||
        menuColor === "inverted-translucent"
      ) {
        transformed.push(...TRANSLUCENT_CLASSES);
      }
      continue;
    }

    transformed.push(token);
  }

  return Array.from(new Set(transformed));
}

export function rewriteAstroMenus(content: string, menuColor?: string) {
  if (
    !content.includes("cn-menu-target") &&
    !content.includes("cn-menu-translucent")
  ) {
    return content;
  }

  return content.replace(/(["'])([^"']*\bcn-menu-(?:target|translucent)\b[^"']*)\1/g, (_match, quote, classes) => {
    const transformed = transformMenuTokens(
      String(classes)
        .split(/\s+/)
        .filter(Boolean),
      menuColor,
    );

    return `${quote}${transformed.join(" ")}${quote}`;
  });
}
