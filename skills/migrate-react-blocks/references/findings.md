# Migration findings

These findings summarize practical migrations of static layouts, forms and interactive primitives. Use them to estimate effort and recognize common obstacles; arbitrary blocks still require source inspection and runtime verification.

## Easy: static layout and forms without state

Metric cards, feature grids, highlight sections, team grids, contact cards and static footers need no React runtime. Even an upstream `use client` file can be static when it has no hooks. Source arrays and icon data remain server-side. Typography/theme defaults may differ; preserve layout classes rather than assuming the primitive's defaults match.

Upstream props are not always rendered. A blog block accepted metadata its JSX never displayed; the port kept it accepted but unrendered and made defaulted props optional. Placeholder `#` links stay placeholders rather than gaining invented destinations or backends.

Login, signup and form-layout ports use native validation and server-rendered fields. Upstream frontend previews often have no auth or submission implementation. Adding `required`, repairing a missing form association, or changing Cancel to reset is an explicit behavior change, even if sensible. Do not conflate those repairs with source parity.

## Medium: existing primitive, different composition

Dialogs demonstrate render-prop translation, controlled-to-DOM state and form association. Inspect both source and destination APIs. A prop or attribute accepted by Astro's compiler may do nothing at runtime; only a browser test shows that a close control actually closes.

A handcrafted disclosure can use Bejamas Accordion while preserving single-open/collapsible behavior. Entrance staggering needs separate treatment. Tabbed FAQs can use separate native panels/accordions to avoid stale filtered children and keep each category's state. Test the actual category/accordion relationship rather than merely showing tab labels.

An accordion with a companion image is a derived-display case: the accordion owns selection and keyboard behavior, and a block script listens to its change event to swap the image within its own root. Clicks and keyboard activation stay synchronized, and two copies stay independent.

## Harder: compound local state and semantic composition

Pricing toggles and calculators are derived display: switches and sliders own the interaction, and the block listens to their change events to recompute prices within its own root. Preserve source prices, quantity multipliers and optional add-ons. Read each primitive's event payload rather than assuming React's callback shape. Number/layout springs are animation, not state.

Expandable tables can preserve project/module rows and expansion behavior with valid table markup. Do not emulate React render composition by wrapping tbody in a div. Geometry and expansion animation may differ and need documentation.

Command menus can preserve grouped search and keyboard selection through the primitive. A global shortcut needs one documented owner when several instances exist. If the source never wired command actions, a selected item is not evidence of an executed application command.

## Highest friction: specialized controls and motion

Controls without a matching primitive, such as a saturation/hue color plane, cannot be ported faithfully without new primitive work. Use the closest native or primitive control, record the interaction difference and report the gap. Do not label an approximation pixel/interaction equivalent.

CSS can approximate some animation effects and support reduced motion. Spring, stagger and scroll-linked motion require deliberate translation; removing them cannot be called a faithful animation port.

## Primitive gaps found

Ports that hit these use the closest primitive or a static version. Each is a candidate for `@data-slot` or canonical component work, not for a block-level workaround.

- **Carousel with several visible cards**: the carousel tracks one active slide, so visible neighbours are inert until they become active. Free (non-snapping) drag is not available. Gallery ports use the Carousel and record both differences.
- **Avatar image loading**: the fallback sits beneath the image, but a failed image is not hidden, so some browsers draw a broken-image icon over the fallback.
- **Sidebar**: there is no sidebar component. A fixed sidebar can be static `aside`/`nav` markup; collapse, mobile drawers and persisted state are a gap.
- **Color plane**: no pointer/keyboard saturation-hue control exists.

## Repository and integration obstacles

- Read the checked-in canonical source. `packages/ui` is generated, not the place to fix a primitive.
- Check public component exports: a wildcard pointing to flat Astro files does not resolve component barrels in subdirectories. Recheck the receiving package before adding aliases.
- Icon libraries may lack brand marks used upstream. Preserve upstream brand SVGs; substituting arbitrary generic glyphs changes the visual contract.
- External logo/portrait URLs and host-specific font classes need asset decisions. Record external requests and substitutions; production ports should expose props or vendor authorized assets.
- Animation CSS can override `hidden`; expandable-table ports may need explicit styles for hidden rows. Browser-test this instead of trusting an HTML attribute alone.
- Portals reparent overlay content to the body. A root query after opening can miss portalled elements and leave state stale. Capture references at initialization and bind form handlers directly to their forms.
- Semantic SVGs without intrinsic dimensions can collapse icon-only buttons to 0×0. Supply dimensions in the receiving styles when needed.
- A fixed-height panel can push its close control outside a short viewport. Cap panel height to the viewport and record that behavior change.
- Upstream Shadcnblocks blocks rely on a global `container` utility (`margin-inline: auto; padding-inline: 2rem`) that default Tailwind lacks. Copying `container` alone left ports flush at x=0 with no gutter. Express centering and gutters in the block itself.
- A local test harness once injected that missing container CSS, so its screenshots passed while the real docs routes were misaligned. Verify on the actual docs routes.

## Live preview versus source code

- The live Shadcnblocks site drifts from its repository source: images, headings, copy, card composition and CTAs change. These differences are upstream revisions, not mistranslations of the source JSX. Record them separately.
- A raw theme variable is not proof of a compiled breakpoint. The repository stylesheet declared a 1400px `2xl` container, while the live preview computes 1536px. The ports followed the observed live width and the receiving app's standard breakpoint, and recorded the difference.
- Shadcnblocks previews can be loaded directly as their iframe URL, sized to the block viewport rather than the surrounding site. They may vertically center a section in a `min-h-svh` wrapper, so compare positions relative to the block, not the page. To switch color mode in the Bejamas docs app, set `data-theme` as well as the `.dark` class.
- Bejamas themes and primitive styles change colors, borders, typography and controls. Treat Shadcnblocks ports as layout- and behavior-faithful, not pixel-identical.
- The first eight Shadcnblocks ports (pricing-01, cta-01, signup-01, login-01, faq-01, hero-01, testimonials-01, features-02) predate this process. They are adaptations with changed content, widths or composition. Do not cite them as faithful migrations without reconciling them against their source.

For each migration, record build/type results, observed browser behavior and remaining differences.
