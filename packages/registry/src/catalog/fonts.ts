import { type RegistryItem } from "shadcn/schema";

type RegistryFontItem = Extract<RegistryItem, { type: "registry:font" }>;

type FontDefinition = {
  name: string;
  title: string;
  family: string;
  provider: "google";
  variable: "--font-sans" | "--font-serif" | "--font-mono";
  subsets: readonly string[];
  import: string;
};

const FONT_DEFINITIONS = [
  {
    name: "geist",
    title: "Geist",
    family: "'Geist Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Geist",
  },
  {
    name: "inter",
    title: "Inter",
    family: "'Inter Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Inter",
  },
  {
    name: "noto-sans",
    title: "Noto Sans",
    family: "'Noto Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Noto_Sans",
  },
  {
    name: "nunito-sans",
    title: "Nunito Sans",
    family: "'Nunito Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Nunito_Sans",
  },
  {
    name: "figtree",
    title: "Figtree",
    family: "'Figtree Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Figtree",
  },
  {
    name: "roboto",
    title: "Roboto",
    family: "'Roboto Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Roboto",
  },
  {
    name: "raleway",
    title: "Raleway",
    family: "'Raleway Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Raleway",
  },
  {
    name: "dm-sans",
    title: "DM Sans",
    family: "'DM Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "DM_Sans",
  },
  {
    name: "public-sans",
    title: "Public Sans",
    family: "'Public Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Public_Sans",
  },
  {
    name: "outfit",
    title: "Outfit",
    family: "'Outfit Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Outfit",
  },
  {
    name: "oxanium",
    title: "Oxanium",
    family: "'Oxanium Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Oxanium",
  },
  {
    name: "manrope",
    title: "Manrope",
    family: "'Manrope Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Manrope",
  },
  {
    name: "space-grotesk",
    title: "Space Grotesk",
    family: "'Space Grotesk Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Space_Grotesk",
  },
  {
    name: "montserrat",
    title: "Montserrat",
    family: "'Montserrat Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Montserrat",
  },
  {
    name: "ibm-plex-sans",
    title: "IBM Plex Sans",
    family: "'IBM Plex Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "IBM_Plex_Sans",
  },
  {
    name: "source-sans-3",
    title: "Source Sans 3",
    family: "'Source Sans 3 Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Source_Sans_3",
  },
  {
    name: "instrument-sans",
    title: "Instrument Sans",
    family: "'Instrument Sans Variable', sans-serif",
    provider: "google",
    variable: "--font-sans",
    subsets: ["latin"],
    import: "Instrument_Sans",
  },
  {
    name: "jetbrains-mono",
    title: "JetBrains Mono",
    family: "'JetBrains Mono Variable', monospace",
    provider: "google",
    variable: "--font-mono",
    subsets: ["latin"],
    import: "JetBrains_Mono",
  },
  {
    name: "geist-mono",
    title: "Geist Mono",
    family: "'Geist Mono Variable', monospace",
    provider: "google",
    variable: "--font-mono",
    subsets: ["latin"],
    import: "Geist_Mono",
  },
  {
    name: "noto-serif",
    title: "Noto Serif",
    family: "'Noto Serif Variable', serif",
    provider: "google",
    variable: "--font-serif",
    subsets: ["latin"],
    import: "Noto_Serif",
  },
  {
    name: "roboto-slab",
    title: "Roboto Slab",
    family: "'Roboto Slab Variable', serif",
    provider: "google",
    variable: "--font-serif",
    subsets: ["latin"],
    import: "Roboto_Slab",
  },
  {
    name: "merriweather",
    title: "Merriweather",
    family: "'Merriweather Variable', serif",
    provider: "google",
    variable: "--font-serif",
    subsets: ["latin"],
    import: "Merriweather",
  },
  {
    name: "lora",
    title: "Lora",
    family: "'Lora Variable', serif",
    provider: "google",
    variable: "--font-serif",
    subsets: ["latin"],
    import: "Lora",
  },
  {
    name: "playfair-display",
    title: "Playfair Display",
    family: "'Playfair Display Variable', serif",
    provider: "google",
    variable: "--font-serif",
    subsets: ["latin"],
    import: "Playfair_Display",
  },
] as const satisfies readonly FontDefinition[];

function createFontItem(
  definition: FontDefinition,
  role: "body" | "heading",
): RegistryFontItem {
  return {
    name:
      role === "body"
        ? `font-${definition.name}`
        : `font-heading-${definition.name}`,
    title:
      role === "body"
        ? definition.title
        : `${definition.title} (Heading)`,
    type: "registry:font",
    font: {
      family: definition.family,
      provider: definition.provider,
      variable: role === "body" ? definition.variable : "--font-heading",
      subsets: [...definition.subsets],
      import: definition.import,
    },
  } satisfies RegistryFontItem;
}

export const bodyFonts = FONT_DEFINITIONS.map((definition) =>
  createFontItem(definition, "body"),
) satisfies RegistryFontItem[];

export const headingFonts = FONT_DEFINITIONS.map((definition) =>
  createFontItem(definition, "heading"),
) satisfies RegistryFontItem[];

export const fonts = [...bodyFonts, ...headingFonts] satisfies RegistryFontItem[];
