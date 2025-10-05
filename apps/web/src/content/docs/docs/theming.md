---
title: Theming
description: Why theming in bejamas/ui goes beyond colors.
sidebar:
  order: 3
---

In **bejamas/ui**, theming is how a brand’s identity is expressed through the system.

A theme defines not only the basic look of components, but also the overall feel of a website: from foundational tokens like colors and typography to broader elements such as motion, imagery, and even tone of voice.

For marketing websites, this matters because a theme isn’t decoration. It’s the bridge between a reusable system and a unique brand identity. Two sites can share the same components but feel completely different when their themes are applied.

---

## Theming as a Spectrum

<img src="/theming-spectrum.png" alt="Theming spectrum diagram" class="dark:invert" />

Theming spans a spectrum, from highly codified to loosely expressive:

- On the **left**, you have tokens: colors, fonts, spacing, radii, shadows, motion curves. These are deterministic and live in code.
- In the **middle**, style decisions like shape, elevation, and interaction patterns add brand personality but are still systematic.
- On the **right**, you move into expression: imagery, illustration style, and tone of voice. These aren’t tokens but examples, assets, and content.

This model helps clarify what belongs in code versus what’s better shown through templates and guidelines.

---

## Codified Theme

The codified side of theming lives in `globals.css`.  
Here we define Tailwind v4–compatible tokens, following a shadcn-like convention:

```css
@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(240 10% 3.9%);
  --color-primary: hsl(221 83% 53%);
  --color-primary-foreground: hsl(0 0% 100%);

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Source Serif Pro", serif;

  --motion-default: 200ms ease-in-out;
  --motion-snappy: 120ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

These values form the deterministic foundation of the system.

Every component consumes them, which keeps implementations consistent while still leaving space for expression at higher levels.

---

## A Component in Practice

The spectrum becomes clearer when you look at a single component, like a `Button`:

- **Tokens** define its base: background, font, border radius.

- **Style** refines its feel: hover state, motion, spacing rhythm.

- **Visuals** add brand flavor: a gradient background, a custom icon, maybe even a doodle next to the CTA.

- **Tone** gives it a voice: “Get Started” vs. “Let’s Jam 🚀.”

The same `Button` evolves from a purely coded component into a branded expression, depending on where it sits on the spectrum.

_(A visual “Button evolution” example can be added here.)_

## Beyond Tokens

Not everything can or should be codified.

Visuals — imagery, illustration, icon style — are provided via brand assets or design packs. They’re chosen and swapped at the block/template level, not in tokens.

Tone — microcopy, CTA language, and brand voice — comes from content teams and marketing. It’s best expressed through examples and guidelines, not CSS variables.

In `bejamas/ui`, this separation is deliberate:

- Globals and components handle the systematic side.

- Blocks, templates, and examples demonstrate the expressive side.

## Closing

Theming in bejamas/ui is both systematic and expressive.
We codify what’s stable and reusable in globals.css, and we illustrate what’s expressive through examples and content.

For developers, this means focusing on tokens and styles that can be enforced in code.
For designers and marketers, it means using templates and guidelines to shape visuals and tone.

Together, these two halves make sure marketing websites scale without losing their unique identity.
