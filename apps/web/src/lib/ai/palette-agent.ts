import { OPENAI_API_KEY } from "astro:env/server";
import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Schema for the generated color palette
 * Uses OKLCH color format for consistency with the existing theme system
 */
export const paletteColorSchema = z.object({
  background: z.string().describe("Background color in oklch() format"),
  foreground: z.string().describe("Foreground/text color in oklch() format"),
  card: z.string().describe("Card background color"),
  "card-foreground": z.string().describe("Card text color"),
  popover: z.string().describe("Popover background color"),
  "popover-foreground": z.string().describe("Popover text color"),
  primary: z.string().describe("Primary brand color"),
  "primary-foreground": z.string().describe("Text on primary color"),
  secondary: z.string().describe("Secondary color"),
  "secondary-foreground": z.string().describe("Text on secondary color"),
  muted: z.string().describe("Muted background color"),
  "muted-foreground": z.string().describe("Muted text color"),
  accent: z.string().describe("Accent/highlight color"),
  "accent-foreground": z.string().describe("Text on accent color"),
  destructive: z.string().describe("Destructive/error color"),
  "destructive-foreground": z.string().describe("Text on destructive color"),
  border: z.string().describe("Border color"),
  input: z.string().describe("Input field border/background color"),
  ring: z.string().describe("Focus ring color"),
  "chart-1": z.string().describe("Chart color 1"),
  "chart-2": z.string().describe("Chart color 2"),
  "chart-3": z.string().describe("Chart color 3"),
  "chart-4": z.string().describe("Chart color 4"),
  "chart-5": z.string().describe("Chart color 5"),
});

export const paletteOutputSchema = z.object({
  name: z.string().describe("A creative name for this palette"),
  light: paletteColorSchema.describe("Light mode colors"),
  dark: paletteColorSchema.describe("Dark mode colors"),
  reasoning: z
    .string()
    .nullable()
    .describe("Brief explanation of color choices"),
});

export type PaletteOutput = z.infer<typeof paletteOutputSchema>;

/**
 * Progress events emitted during palette generation
 */
export type ProgressEvent =
  | { type: "starting"; message: string }
  | { type: "searching"; message: string }
  | {
      type: "found_sources";
      message: string;
      sources: Array<{ url: string; title?: string }>;
    }
  | { type: "generating"; message: string }
  | {
      type: "complete";
      palette: PaletteOutput;
      reasoning?: string;
      sources: Array<{ type: string; url: string }>;
    }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = `You are an expert color palette designer for web applications. You specialize in creating beautiful, accessible color palettes compatible with shadcn/ui and Tailwind CSS.

## Your Task
Generate a complete color palette with both light and dark mode variants based on the user's request. The palette must be:
1. Visually harmonious and aesthetically pleasing
2. WCAG AA compliant (4.5:1 contrast ratio for text)
3. Consistent between light and dark modes

## Color Format
ALL colors MUST be in OKLCH format: oklch(L C H) where:
- L = Lightness (0 to 1)
- C = Chroma (0 to ~0.4, typically 0-0.3 for usable colors)
- H = Hue (0 to 360 degrees)

## Color Token Guidelines

### Background/Foreground Pairs
Each background color needs a foreground that has sufficient contrast:
- Light mode: backgrounds are light (L > 0.9), foregrounds are dark (L < 0.3)
- Dark mode: backgrounds are dark (L < 0.25), foregrounds are light (L > 0.9)

### Primary Color
- Should be the main brand color
- Needs high visual impact
- primary-foreground must contrast well against primary

### Secondary & Muted
- Secondary: slightly muted version for secondary actions
- Muted: very subtle background for inactive/disabled states
- Keep chroma low for these (C < 0.05)

### Accent
- A vibrant color for highlights and focus states
- Can be more saturated than primary
- Often used for links and interactive elements

### Destructive
- Red-based color for errors and destructive actions
- Hue typically between 0-30 (red-orange range)

### Chart Colors
- Create a harmonious 5-color palette for data visualization
- Use varied hues for clear distinction
- Maintain similar lightness/chroma for visual balance

## Web Search
If the user mentions a specific brand, company, or reference, use web search to find their official brand colors and incorporate them into the palette.

## Important
- Generate BOTH light and dark mode variants
- All colors must be valid OKLCH values
- Ensure foreground colors have sufficient contrast against their backgrounds
- Use consistent hue families across related tokens`;

export interface GeneratePaletteOptions {
  prompt: string;
  images?: { data: string; mediaType: string }[];
}

export async function generatePalette(
  options: GeneratePaletteOptions,
): Promise<{
  palette: PaletteOutput;
  reasoning?: string;
  sources?: Array<{ type: string; url: string }>;
}> {
  const { prompt, images } = options;

  // Step 1: Gather context with web search if needed
  let contextInfo = "";
  let sources: Array<{ type: string; url: string }> = [];

  const needsSearch =
    /brand|company|logo|official|style guide|color scheme/i.test(prompt) ||
    /costa|starbucks|google|apple|microsoft|amazon|netflix|spotify|slack|notion|figma|vercel|stripe|airbnb/i.test(
      prompt,
    );

  if (needsSearch) {
    try {
      const searchResult = await generateText({
        model: openai("gpt-5.2"),
        system:
          "You are a research assistant. Search for brand colors and design guidelines. Summarize the key brand colors (primary, secondary, accent) with their hex or RGB values.",
        messages: [
          {
            role: "user",
            content: `Find the official brand colors for: ${prompt}`,
          },
        ],
        tools: {
          web_search: openai.tools.webSearch({
            searchContextSize: "medium",
          }),
        },
        maxSteps: 5,
        providerOptions: {
          openai: {
            reasoningSummary: "auto",
          },
        },
      });
      contextInfo = searchResult.text;
      sources = (searchResult.sources || []) as Array<{
        type: string;
        url: string;
      }>;
    } catch (e) {
      console.log("Web search failed, continuing without context:", e);
    }
  }

  // Step 2: Generate the palette using structured output
  const palettePrompt = contextInfo
    ? `${prompt}\n\nBrand research context:\n${contextInfo}`
    : prompt;

  // Build message content with images if provided
  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType?: string }
  > = [{ type: "text", text: palettePrompt }];

  if (images && images.length > 0) {
    messageContent.push({
      type: "text",
      text: "Please analyze the following reference images and extract their dominant colors, mood, and style to inform the palette:",
    });
    for (const img of images) {
      messageContent.push({
        type: "image",
        image: img.data,
        mimeType: img.mediaType,
      });
    }
  }

  const result = await generateObject({
    model: openai("gpt-5.2"),
    schema: paletteOutputSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: messageContent,
      },
    ],
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
      },
    },
  });

  return {
    palette: result.object,
    reasoning: result.object.reasoning || contextInfo || undefined,
    sources,
  };
}

/**
 * Generate a color palette with progress streaming
 * Emits progress events at each stage of the pipeline
 */
export async function generatePaletteWithProgress(
  options: GeneratePaletteOptions,
  onProgress: (event: ProgressEvent) => void,
): Promise<{
  palette: PaletteOutput;
  reasoning?: string;
  sources?: Array<{ type: string; url: string }>;
}> {
  const { prompt, images } = options;

  // Emit starting event
  onProgress({ type: "starting", message: "Analyzing your request..." });

  // Step 1: Gather context with web search if needed
  let contextInfo = "";
  let sources: Array<{ type: string; url: string }> = [];

  const needsSearch =
    /brand|company|logo|official|style guide|color scheme/i.test(prompt) ||
    /costa|starbucks|google|apple|microsoft|amazon|netflix|spotify|slack|notion|figma|vercel|stripe|airbnb/i.test(
      prompt,
    );

  if (needsSearch) {
    onProgress({ type: "searching", message: "Searching for brand colors..." });

    try {
      const searchResult = await generateText({
        model: openai("gpt-5.2"),
        system:
          "You are a research assistant. Search for brand colors and design guidelines. Summarize the key brand colors (primary, secondary, accent) with their hex or RGB values.",
        messages: [
          {
            role: "user",
            content: `Find the official brand colors for: ${prompt}`,
          },
        ],
        tools: {
          web_search: openai.tools.webSearch({
            searchContextSize: "medium",
          }),
        },
        maxSteps: 5,
        providerOptions: {
          openai: {
            reasoningSummary: "auto",
          },
        },
      });
      contextInfo = searchResult.text;
      sources = (searchResult.sources || []) as Array<{
        type: string;
        url: string;
      }>;

      // Emit found_sources event
      const formattedSources = sources.map((s) => ({
        url: (s as any).url || "",
        title: (s as any).title || undefined,
      }));
      onProgress({
        type: "found_sources",
        message: `Found ${sources.length} source${sources.length !== 1 ? "s" : ""}`,
        sources: formattedSources,
      });
    } catch (e) {
      console.log("Web search failed, continuing without context:", e);
    }
  }

  // Step 2: Generate the palette using structured output
  if (images && images.length > 0) {
    onProgress({
      type: "generating",
      message: "Analyzing reference images...",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  onProgress({ type: "generating", message: "Applying color theory..." });

  // Small delay to show the message
  await new Promise((resolve) => setTimeout(resolve, 500));
  onProgress({
    type: "generating",
    message: "Building light & dark palettes...",
  });

  const palettePrompt = contextInfo
    ? `${prompt}\n\nBrand research context:\n${contextInfo}`
    : prompt;

  // Build the message content with text and images
  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType?: string }
  > = [{ type: "text", text: palettePrompt }];

  // Add images if provided - these are crucial for color extraction
  if (images && images.length > 0) {
    messageContent.push({
      type: "text",
      text: "Please analyze the following reference images and extract their dominant colors, mood, and style to inform the palette:",
    });
    for (const img of images) {
      messageContent.push({
        type: "image",
        image: img.data,
        mimeType: img.mediaType,
      });
    }
  }

  const result = await generateObject({
    model: openai("gpt-5.2"),
    schema: paletteOutputSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: messageContent,
      },
    ],
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
      },
    },
  });

  onProgress({ type: "generating", message: "Finalizing colors..." });

  const finalResult = {
    palette: result.object,
    reasoning: result.object.reasoning || contextInfo || undefined,
    sources,
  };

  // Emit complete event
  onProgress({
    type: "complete",
    palette: finalResult.palette,
    reasoning: finalResult.reasoning,
    sources: finalResult.sources,
  });

  return finalResult;
}
