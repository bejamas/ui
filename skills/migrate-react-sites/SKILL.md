---
name: migrate-react-sites
description: Port a React/Next.js + shadcn/ui website or landing page to Astro with bejamas/ui, matching the original's layout, tokens, fonts, assets and behavior. Use when recreating a whole site, page or live demo in Astro/bejamas.
---

# React/shadcn site → Astro / bejamas/ui

The target is the **live site**, not the repository. The source code tells you the content, structure and intent. The demo tells you what the browser actually renders: which token block wins, which font is wired, which classes survived tailwind-merge. Port that **effective cascade**, and measure fidelity in pixels instead of judging it by eye.

Effort concentrates in four places. Plan for them from the start:

1. **Parity resets**: bejamas defaults (Button, Card, Badge, Accordion, menus, inputs) differ from shadcn's.
2. **Motion**: framer-motion and third-party effects rebuilt in CSS.
3. **Mobile nav**: Sheet → Drawer or Collapsible.
4. **Effective tokens and fonts**: finding the ones that actually render.

## Workflow

### 1. Inventory: what exactly is being ported

- Clone the source with `git clone --depth 1` and open the demo.
- List the home page's sections **from the live DOM**, then map each one to its source file.
- Check for **drift** between the repo and the demo. If the copy, sections or styling differ, find the revision the demo serves:
  - `git fetch --unshallow`, then `git log -S "<demo-only text>"`.
  - The demo may also be another build (`vite-version/`) or a newer pro site.
- Task descriptions are often wrong about which sections are on the page. The DOM settles it.

**Done when** every visible section is listed with its source file (or marked *demo-only*), the ported revision is named, and every drift is written down.

### 2. Extract the effective design system from the demo

Run `scripts/tokens.mjs <demo>` in both color schemes. Then record:

- **Tokens:** every `:root`/`.dark` custom property as the browser computes it. Repos can have two token blocks, layered palettes that lose, or tokens that come from a framework (fumadocs) or a customizer. Trust computed values over the CSS file.
- **Fonts:** the families actually rendered (computed `font-family`, `document.fonts`), with weights. Check the optical-size axis for Inter.
  - Declared-but-unwired fonts render the system stack. Port the system stack.
  - `next/font/local` without a `weight` is a 400 face. Its bold text is synthesized.
- **Color mode:** read the `ThemeProvider` props (`defaultTheme`, `enableSystem`, `storageKey`), or note that there is no provider. This decides whether the port loads dark, follows the system, or is light-only.
- **Radius:** measure the rendered `rounded-md`/`rounded-lg` in px and derive `--radius`. Check whether the radius scale is additive or multiplicative.

**Done when** you have the token values for both schemes, font families with weights and axes, the color-mode default and the radius, each taken from the live page.

### 3. Scaffold

```sh
mkdir -p /tmp/scaffold && cd /tmp/scaffold
npm_config_user_agent=bun bunx bejamas@latest init -t astro -b neutral -y -d -f   # creates ./my-app
mv my-app <port-dir> && cd <port-dir> && git init
bun add bejamas@latest
bunx bejamas add button --overwrite -y   # the template's Button predates the registry one
```

Then:

1. **Tokens:** replace the theme `:root` and `.dark` blocks wholesale with the step 2 values. The scaffold's primary color is blue even with `-b neutral`. Wrap v3 HSL triplets in `hsl()`.
2. **Fonts:**
   - Configure them in `astro.config.mjs` (`BEJAMAS_ASTRO_FONTS`) with explicit `weights` (`["100 900"]` for variable fonts).
   - Map `--font-sans`, `--font-heading` and `--font-mono` the way the original does.
   - Delete the scaffold's `--font-heading: var(--font-sans)` once a heading font exists.
   - If the site uses the system stack, set `BEJAMAS_ASTRO_FONTS = []`, remove `<Font>`, and write the stack literally. The scaffold's `--font-sans: var(--font-sans)` is self-referential without a `<Font>`.
3. **Color mode:** add the color-mode head script from [recipes](references/recipes.md#color-mode) whenever the original uses next-themes.
4. **Cleanup:**
   - Remove the scaffold favicon and `bejamas.svg`.
   - Fix `<html  lang>` (double space) and the viewport `initial-scale=1`.
   - Remove `shadcn` from devDependencies.
5. **Assets:** copy into `public/` only the assets the page uses, and vendor remote images.

**Done when** `bun run build` passes and an empty page shows the original's background, text color and font.

### 4. Port section by section

For each section, in page order:

- **Content:** read the source component and everything it imports (data, utils, global CSS). Render arrays from frontmatter.
- **Components:** use bejamas components wherever the source uses shadcn ones, and apply **parity resets** from one shared module (e.g. `src/lib/shadcn.ts`). The defaults that differ, and how to override them, are in [parity](references/parity.md). Read it before your first Button, Card, Badge or Accordion.
- **Classes:** port the *post-merge* class list the source actually rendered, not the literal props. Classes that never existed in the source's config are no-ops on the demo, so leave them out.
- **Overrides:** a default with a variant prefix (`md:`, `has-[>svg]:`, `data-[size=default]:`, `group-data-[…]:`, `aria-pressed:`) must be overridden **with the same prefix**. tailwind-merge only dedupes within one variant.
- **Spacing:** use `gap-*` around interactive bejamas components. Astro emits each component's `<script>` as a sibling, which breaks `space-x/y-*` and `:last-child`.
- **Next.js features:** next/image, next/link, next/font, i18n, server data, metadata and SVG components are covered in [recipes](references/recipes.md).
- **Icons:** use `@lucide/astro`. It has no brand icons, so inline those SVGs, copying the path data programmatically. Namespace gradient and `useId` ids per instance.

**Done when** every inventoried section renders, and `scripts/compare-boxes.mjs` at 1440px shows no box diff above 2px that you can't explain.

### 5. Behavior

Interactive behavior comes from `@data-slot` primitives, through bejamas components. Map by behavior, not by name. For each piece of React state, pick the first fit:

1. **Native HTML:** anchors, `<details>`, forms with constraint validation.
2. **A bejamas component with defaults:** use default-value props for initial state, DOM events (`<name>:change`, `:select`) for changes, and set-events (`<name>:set`) for commands.
3. **A small listener that reacts to primitive events** and updates derived display only: a price label, the theme class, link navigation from a menu item, a carousel autoplay tick.
4. **No fitting primitive:** use the closest primitive or a static version, and record the gap.

Interaction logic itself (focus, keyboard, open state, ARIA) stays inside the primitives. Known gaps and their accepted workarounds are in [known issues](references/known-issues.md).

**Done when** a scripted click-through (menus, accordion, carousel, dialogs, mobile nav, theme persistence across reload, keyboard Enter on menu links) passes with no console errors.

### 6. Motion

Rebuild entrance, scroll and loop effects in CSS, using the recipes in [recipes](references/recipes.md#motion):

- `animation-timeline: view()` and `scroll()` for scroll-linked effects
- precomputed keyframes for typewriters, step counters and animated lists
- `@property` for animated gradients

Gate every effect behind `prefers-reduced-motion: no-preference`. Write `animation-*` **longhands**, because Lightning CSS folds `animation` together with `animation-timeline` into an invalid shorthand.

**Done when** each motion effect is reproduced, approximated or dropped, and each of those outcomes is recorded.

### 7. Verify

Build, run the preview, then compare with the scripts in `scripts/`. Each has a usage line at the top. Copy them into a tools directory outside the port and run `bun add playwright` there: Bun resolves `playwright` from the script's own location, not the working directory.

- `compare-boxes.mjs <demo> <port> <width>` at 1440, 768 and 390, in each color scheme the original supports.
  - It reports page height, box diffs in document order (fix the first one and re-run), computed style diffs, and missing or extra elements.
  - Colors are normalized, so `lab()` vs `oklch()` doesn't count as a diff.
- `shot.mjs <url> <out.png> <width> --chunks` for viewport-sized screenshots of both sites, viewed side by side.
- Known headless artifacts to ignore:
  - The scroll lock's `scrollbar-gutter: stable` shifts content 7.5–15px while overlays are open.
  - Autoplaying carousels and marquees differ by phase.
- Some sites set `enableSystem={false}`. For those, `--dark` emulation doesn't switch the theme, so seed `localStorage.theme` instead.

**Done when** page heights match within a few px at every width, the remaining box and style diffs are each explained, and the click-through passes.

### 8. Record

Write the port's findings. Include:

- the fidelity verdict: faithful, close with documented approximations, or partial
- the source revision and any demo drift
- a component mapping
- gaps, with the section that needed each one and the workaround used
- bejamas bugs, with repro steps
- approximations
- verification evidence

Keep upstream defects you reproduced on purpose separate from port defects. Add general lessons to [known issues](references/known-issues.md) or [parity](references/parity.md) only when a port demonstrated them.
