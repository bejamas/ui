export const STYLES = [
  {
    name: "juno",
    id: "bejamas-juno",
    title: "Juno",
    description: "Balanced and versatile baseline for Bejamas interfaces.",
  },
  {
    name: "vega",
    id: "bejamas-vega",
    title: "Vega",
    description: "Clean, neutral, and familiar.",
  },
  {
    name: "nova",
    id: "bejamas-nova",
    title: "Nova",
    description: "Reduced padding and tighter spacing.",
  },
  {
    name: "lyra",
    id: "bejamas-lyra",
    title: "Lyra",
    description: "Boxy and sharp for mono-heavy interfaces.",
  },
  {
    name: "maia",
    id: "bejamas-maia",
    title: "Maia",
    description: "Rounded and softer with larger surfaces.",
  },
  {
    name: "mira",
    id: "bejamas-mira",
    title: "Mira",
    description: "Compact and text-dense with smaller controls.",
  },
] as const;

export type Style = (typeof STYLES)[number];
