# Sources built on other component libraries

[parity](parity.md) covers the happy path: shadcn/ui and kits built the same way (Tailwind utilities merged with tailwind-merge over Radix or Base UI primitives), where a bejamas component plus a few reset classes reproduces the source. This file covers everything else: PrimeReact, MUI, Chakra, Mantine, Ant Design, an in-house design system on top of one of them.

Learned from one port (an in-house design system on PrimeReact v11 styled mode). Treat it as the method, and check each step against what the source actually renders.

## Identify how the source styles itself

Before porting a component, answer three questions from the live page and the source:

| Question | How to tell | Why it matters |
|---|---|---|
| Where does the library's CSS live? | `document.styleSheets` and `<style>` tags: a cascade layer (`@layer primereact`), CSS-in-JS tags (emotion `css-*`, `data-emotion`), or a plain stylesheet | It decides what wins against utilities. Prime's low layer means **any** utility beats even its `:hover` rules; unlayered CSS-in-JS beats every layered utility |
| How are classes joined? | the source's `cn`/`cx` helper | Without tailwind-merge, conflicting classes are **all kept** and the cascade decides. Join ported classes plainly; bejamas `cn` would silently drop classes the source kept |
| Which tokens drive it? | computed custom properties (`--p-*`, `--mui-*`, `--chakra-*`) with `tokens.mjs` | Port them with their resolved values next to the site's own tokens |

## Port styling: copy the rendered rules into the same layer

Resetting bejamas components with utilities can't reproduce another library's cascade order. What worked instead:

1. Render the legacy **markup** (element structure, classes, data attributes) in Astro.
2. Extract the library's **rendered rules** for that component from the live page: walk `document.styleSheets` for its selectors (in its layer, or its CSS-in-JS tags), switch the component into each state you need first (open, checked, invalid, hover classes), and resolve the referenced tokens to computed values. A headless script on `scripts/browser.mjs` does this in a few lines.
3. Put those rules into the Astro app's CSS **inside the same layer name** (`@layer primereact { … }`), declared in the same layer order as the source, so utilities keep winning exactly as before.
4. Measure with `compare-boxes.mjs`: boxes and colors should match on the first try. When they don't, a state wasn't captured in step 2.

## Two styling systems at once

An in-place port ([Astro source](../workflows/in-repo.md#astro-source)) runs the old styling system and Tailwind side by side until the last unit is ported. Style objects and atomic classes translate into Tailwind utilities one declaration at a time ([recipes](recipes.md#other-styling-systems--tailwind) lists the traps). Parity holds during the overlap only if both systems share one cascade the way the old one did alone. Read that cascade from the old system's generated CSS, not its config:

- **One layer order**, declared at the top of the global CSS, with Tailwind's layers slotted where the old system's equivalents were.
- **Nested layers recreated.** A system can emit composite styles (text styles, layer styles) into a layer nested inside its utilities layer. Then any plain utility beats a text style, and a text style a parent sets on a child (`& .x { … }`) beats the child's own. Port them as utilities that emit into a nested layer of the same name, named outside Tailwind's namespaces (`typo-*`; `text-*` is font size):
  ```css
  @utility typo-heading-small {
    @layer compositions { font-size: var(--text-heading-small); line-height: 1.2em; }
  }
  ```
- **Reset deltas:** keep Tailwind's preflight, and add one rule per thing the old reset did that preflight doesn't (font smoothing, `text-wrap: balance` on headings, transparent control backgrounds), so swapping resets moves nothing.
- **Breakpoints:** copy the queries the old system generated, not its config values. A "below breakpoint" condition can compile to `max-width: <breakpoint − 0.0025rem>`, not the breakpoint itself. Tailwind orders custom variants by declaration, so declare the `max-width` variants widest first and the narrowest wins.
- **bejamas base rules:** the style's `* { border-border outline-ring/50 }` recolors every border that defaults to `currentColor`, and the browser focus ring. Scope it to the components: `[data-slot] { border-color: var(--border) }`.
- **The rendered result:** systems that compile style objects can drop invalid values silently (a token name inside a shorthand string, a token that doesn't exist), so the browser default renders. Port that default and list the intended values as follow-ups.

## Port behavior: primitives, not styled components

Use the `@data-slot` primitives (navigation-menu, drawer, collapsible, accordion, carousel, dialog, dropdown-menu) under the legacy markup for open state, focus and keyboard. bejamas styled components bring their own look, which you would then have to undo. Where a primitive's model differs from the library's (a combobox that commits on close when the source allows free text), a native element (`<datalist>`) can be closer.

## Measuring traps

- The library's internal wrappers can carry `data-slot` or similar attributes (Prime sets `data-slot="root|outer|inner"`). `compare-boxes.mjs` ignores Prime's; for another library, filter its wrappers before reading *missing* elements as port gaps.
- CSS-in-JS injects styles at runtime, so measure after hydration; `compare-boxes.mjs` already waits for the network to go idle and scrolls the page first.
