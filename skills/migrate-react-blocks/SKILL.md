---
name: migrate-react-blocks
description: Migrate React, shadcn/ui, Radix or Base UI blocks (including Shadcnblocks) to native Astro components using Bejamas UI, preserving layout and behavior. Use when porting a block or component from React/TSX to Astro, converting a shadcnblocks.com block, or adding a ported block to this repository's registry or a Bejamas Astro application.
---

# React blocks → Astro / Bejamas UI

Produce a usable Astro port, with explicit evidence of preserved behavior and any remaining differences. Start from the actual source and its dependencies. A matching screenshot alone does not establish an interactive migration.

## Workflow

1. **Approach**: classify the source behavior and choose an Astro approach.
2. **Port**: translate markup, data, layout dependencies and icons.
3. **Behavior**: map interactive state to native HTML or `@data-slot` primitives; report gaps instead of reimplementing them.
4. **Register**: add the block, docs example and registry entry (registry ports only).
5. **Verify**: run type, registry and smoke checks, then compare layout and check wiring in the real docs route.
6. **Record**: classify the result and record differences, repairs and unverified behavior.

## Repository contract

- Canonical primitives live in `packages/registry/src/ui`; shared runtime helpers live in `packages/registry/src/lib`. `packages/ui/src` is generated output. Change canonical source when a primitive needs a fix, then follow [the generation workflow](../../packages/ui/README.md).
- Registry blocks live in `packages/registry/src/blocks/<id>/` and import primitives through `@bejamas/registry/ui/<name>`. Application ports use `@bejamas/ui/components/<name>`. Follow the receiving application's conventions rather than rewriting its package setup.
- Read the destination component's Props and its `@data-slot` package README before translating composition or controlled state. React API names do not prove that Astro supports the same contract.
- Check package exports against actual files. A wildcard targeting `components/*.astro` will not resolve barrels at `components/<name>/index.ts`; add an explicit export or import the `.astro` file directly, following the receiving application's existing pattern.

## Choose a migration approach from the source

| Source behavior                                       | Preferred Astro approach                                        |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| Static arrays, JSX, icon grids, metric cards          | Render from frontmatter; no client runtime                      |
| Forms, disclosure, links                              | Native HTML first                                               |
| Dialogs, menus, tabs, accordions, carousels, toggles  | Bejamas component backed by `@data-slot`                        |
| Display derived from control state, such as pricing   | Listen to primitive events and update the block's own output    |
| React render composition changes HTML structure       | Reconstruct semantic markup around the primitive                |
| Behavior with no matching primitive, custom animation | Closest primitive or a static version; report the primitive gap |

Read [the migration findings](references/findings.md) when estimating difficult ports and choosing an implementation approach.

## Port the markup and data

The upstream source code is the contract for content, markup and behavior. Read its supporting components, data, utilities and global CSS, not only the block file. The live preview is evidence of the upstream's runtime CSS and configuration where the source code is ambiguous or incomplete (global utilities, compiled breakpoints). When the two disagree, follow the source code for content and structure, and record any layout value taken from the live preview as a deliberate choice.

Move imports, static data and initial prop normalization into Astro frontmatter. Use `astro/types` HTML attribute types where useful. Translate `className` → `class`, `htmlFor` → `for`, SVG attribute spelling and HTML autocomplete values. Remove React keys, React types, `use client`, and Next Link/Image only after accounting for what they did. Keep responsive and container-query ancestry: a metric-card layout may need `@container/main`; replacing its container queries with viewport breakpoints changes behavior.

Audit upstream global CSS, Tailwind configuration and primitive-generated markup for layout dependencies before copying utility classes. `container` does not imply centering or horizontal padding in default Tailwind. Carry required margins, gutters and responsive widths into the installable block, rather than fixing only the docs wrapper or injecting them into a test harness. Inspect computed styles at breakpoint boundaries. When swapping one component for another, account for the layout classes the source component applied by default (padding, gaps, negative margins).

Use Bejamas primitives where they supply the required behavior. Preserve source text, data, control ranges, initial state and responsive hierarchy. SVG icons can use `@lucide/astro`; when the icon library lacks a glyph (often brand marks), keep the upstream SVG. When an icon component is stored in an array, bind it to a capitalized local `Icon` in the render expression.

Check source rendering as well as its prop types and description. Defaulted props may be incorrectly marked required, and accepted metadata may never appear in the JSX. Record typing repairs without silently adding new rendered content.

Distinguish block dependencies from upstream preview/designer machinery. An icon placeholder may read a configurator's selected icon library; use a concrete icon variant in a standalone port and record that choice instead of porting the configurator into the receiving application.

## Interactive behavior

Interactive behavior belongs to `@data-slot` primitives, which ship as a dependency rather than copied code. A port wires markup to primitives; it does not reimplement them. Fixes to focus, keyboard and ARIA handling then reach every block through a version bump.

Astro frontmatter runs on the server; it cannot replace a React setter during interaction. For each piece of React state in the source, pick the first option that fits:

1. **Native HTML**: forms and validation, `<details>`, anchors, inputs.
2. **A Bejamas component backed by `@data-slot`**: map by behavior, not by name. Source components may use different part names, polymorphism (`asChild`, `render`, `as`) or controlled props (`open`/`onOpenChange`, `value`/`onValueChange`). Read the destination component's Props and its `@data-slot` README for the equivalent: default-value props for initial state, DOM events for changes, set-events for commands. Prefer the component's built-in parts (controls, triggers, close buttons) over custom ones.
3. **Derived display only**: a block script may listen to primitive events and update the block's own static output, such as a price label or a companion image. It must not handle focus, keyboard, pointer or drag interaction, open/close state or ARIA state.
4. **No fitting primitive, or the closest one behaves differently**: do not build a block-level replacement. Use the closest primitive and record the difference, or ship a static/non-interactive version. Report a primitive gap: the missing capability, the source block that needs it and what the port does instead. Ask the user whether to extend `@data-slot` or the canonical component.

Keep these regardless of the option:

- **Semantic structure**: never insert wrapper elements into tables or lists to emulate React composition; rebuild valid markup around the primitive.
- **Instances**: prefix every user-facing ID and its references per instance (SVG gradients, label `for`, `aria-controls`, descriptions). Scope any block script to its own root, guard against double initialization, clean up on page transitions, and test two instances on one page.
- **Portals**: overlay content may move outside the block root. Bind handlers to the elements themselves or capture references before opening.

## Register a block in this repository

Skip this section for ports into another application. The registry under `apps/web/public/r` is checked in: regenerate it and commit it with the block. Deploying the docs site is what publishes it. For a registry block `<id>` (for example `team-01`) with component `<Name>` (for example `Team01`):

1. **Component**: `packages/registry/src/blocks/<id>/<Name>.astro`, an `index.ts` that re-exports it (`export { default as <Name> } from "./<Name>.astro";`).
2. **Registry entry**: add a `registry:block` item to `apps/web/registry.json`. Include `title`, `description`, `registryDependencies` (the Bejamas primitives used; `[]` for static blocks), `meta.source` (the upstream block URL), and each file with `target: src/components/blocks/<id>/...`. Items whose `meta.source` starts with `https://www.shadcnblocks.com/block/` are also published in the `@shadcnblocks` sub-registry (`apps/web/public/r/shadcnblocks/`); no separate entry is needed.
3. **Docs example**: `apps/web/src/pages/blocks/<category>/<id>.astro` renders the block inside `BlockExampleLayout` with `title` and `sourceUrl`. Add the gallery item (`label`, `id`, `description`, `href`, `sourceUrl`) to `apps/web/src/content/docs/blocks.json`.
4. **Tests**: update the expected Shadcnblocks port counts in `packages/registry/test/block-registry.test.ts` and `apps/web/src/lib/block-gallery.test.ts`. Add `[id, Name]` to the block list in `packages/bejamas/scripts/smoke-blocks-local.ts`.

## Verify the port

Verify the port's markup, layout and wiring. Primitive behavior (focus, keyboard, ARIA) is `@data-slot`'s responsibility and is not re-tested here.

**Checks.** In another application, run its type check and the build for the route that renders the block. In this repository, from the root:

```sh
bun run --cwd apps/web build:artifacts
bun run --cwd apps/web check-types
bun test packages/registry/test/block-registry.test.ts apps/web/src/lib/block-gallery.test.ts
bun run --cwd packages/bejamas build
bun run --cwd packages/bejamas smoke:blocks:local
```

`build:artifacts` regenerates the checked-in registry under `apps/web/public/r`; commit it with the block. The smoke test installs every block with the local CLI into fresh standalone and monorepo Astro apps and builds both.

**Layout.** Run the docs app (`bun run --cwd apps/web start`) and open `/blocks/<category>/<id>`. Compare the rendered block with the source's own rendering at a desktop and a mobile width, in the same color mode. Where edges, widths or gaps differ, measure the rendered boxes and computed styles instead of reading class names. Never add CSS to a test page that the real app lacks. Record differences caused by the source changing since you read it separately from port defects.

**Wiring.** Check that each primitive starts up without console errors and that the block's controls drive it. Check that derived display updates, and that two instances on one page stay independent. Check for duplicate IDs, nested interactive controls, accessible names on icon-only controls, and overflow at the narrow width. A successful build or a source search is not runtime proof.

## Record the result

Classify the result accurately: a faithful UI port, a documented visual/motion approximation, or a partial port blocked on a primitive gap. Record observed obstacles, repaired upstream defects, changes to interaction semantics, unverified behavior and reproducible acceptance steps. Put migration reports in the PR description, not in this skill. Pending tests are not passes.

Update this skill only from demonstrated findings, and add general lessons to [the findings](references/findings.md) rather than per-session reports. Avoid turning an individual experiment's workaround into a universal rule.
