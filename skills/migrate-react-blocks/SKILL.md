---
name: migrate-react-blocks
description: Migrate React, shadcn/ui, Radix or Base UI blocks to native Astro components using Bejamas UI, preserving layout, behavior and source attribution. Use for component or block ports into this repository or a Bejamas Astro application.
---

# React blocks → Astro / Bejamas UI

Produce a usable Astro port, with explicit evidence of preserved behavior and any remaining differences. Start from the actual source and its dependencies. A matching screenshot alone does not establish an interactive migration.

## Repository contract

- Canonical primitives live in `packages/registry/src/ui`; shared runtime helpers live in `packages/registry/src/lib`. `packages/ui/src` is generated output. Change canonical source when a primitive needs a fix, then follow [the generation workflow](../../packages/ui/README.md).
- Application ports use `@bejamas/ui/components/<name>`; registry-distributed blocks use the existing `@bejamas/registry/ui/<name>` convention. Follow the receiving application's conventions rather than rewriting its package setup.
- Inspect actual exports and Props, and the installed `@data-slot/<primitive>` README/runtime, before translating composition or controlled state. React API names do not prove that Astro supports the same contract.
- Check package exports against actual files. A wildcard targeting `components/*.astro` will not resolve barrels at `components/<name>/index.ts`; resolve that mismatch in the receiving application when present.

## Choose a migration approach from the source

| Source behavior | Preferred Astro approach |
|---|---|
| Static arrays, JSX, icon grids, metric cards | Render from frontmatter; no client runtime |
| Dialog, accordion, tabs, switch, popover, command | Let Bejamas/data-slot own primitive behavior |
| Local derived state, such as pricing | Instance-scoped DOM controller/custom element, listening to primitive events |
| React render composition changes HTML structure | Reconstruct semantic markup and preserve interaction |
| Animation runtimes, custom canvas controls | Port the interaction and animation deliberately; document approximations separately |
| Authentication, payment, upload or other service SDK | Separate visual UI from server/service integration; preserve the integration boundary |

Read [the migration findings](references/findings.md) when estimating difficult ports and choosing an implementation approach.

## Port the markup and data

Pin the upstream commit and save its license notice and the files actually used, including supporting components/data. Do not infer a block's MIT license from an unrelated site's free tier. Retain attribution with the derivative and record the source path; filenames and exported component names can differ.

Move imports, static data and initial prop normalization into Astro frontmatter. Use `astro/types` HTML attribute types where useful. Translate `className` → `class`, `htmlFor` → `for`, SVG attribute spelling and HTML autocomplete values. Remove React keys, React types, `use client`, and Next Link/Image only after accounting for what they did. Keep responsive and container-query ancestry: a metric-card layout may need `@container/main`; replacing its container queries with viewport breakpoints changes behavior.

Use Bejamas primitives where they supply the required behavior. Preserve source text, data, control ranges, initial state and responsive hierarchy. SVG icons can use `@lucide/astro`, but its current exports omit brand icons; retain upstream SVG paths/assets where licensed. When an icon component is stored in an array, bind it to a capitalized local `Icon` in the render expression. Prefix every user-facing ID and its references per instance, including SVG gradients, label `for`, `aria-controls` and descriptions.

Distinguish block dependencies from upstream preview/designer machinery. An icon placeholder may read a configurator's selected icon library; use a concrete icon variant in a standalone port and record that choice instead of porting the configurator into the receiving application.

## Translate state ownership and composition

Astro frontmatter runs on the server; it cannot replace a React setter during interaction. Give each state value an owner: a native form/control, an existing data-slot primitive, an instance-scoped script, or an application service.

Concrete differences in this repository:

- `Button as="a" href=...` replaces button-as-link composition. Base UI `render={<Button />}` has no universal translation.
- `DialogTrigger asChild` is supported; `DialogClose asChild` is not. A Bejamas Button with `data-slot="dialog-close"` closes without nested buttons. `data-dialog-close` does not work with the installed runtime.
- `CommandDialog` places its children inside modal content. Keep an external launcher and dispatch `dialog:set` with `{ open: true }` on the dialog root.
- Accordion `type="multiple"` maps to `multiple`; configure `defaultValue` and `collapsible` explicitly. Different source names such as Header/Panel map to Trigger/Content by behavior, not by spelling.
- The currently installed switch emits `switch:change` with `detail.checked` and accepts `switch:set` with `{ checked }`. Slider emits `slider:change`; inspect its single/range value shape before computing totals. Check other event contracts rather than extending this naming pattern by guesswork.
- There is no current Sidebar primitive. A fixed source sidebar can use aside/nav; context-driven collapse, mobile drawers, cookies and keyboard shortcuts require an explicit implementation. BreadcrumbLink/Page can be native elements inside BreadcrumbItem.
- Never insert div-based Collapsible wrappers into table/tbody/tr. Preserve semantic table structure; scope expansion to the appropriate row group and retain button labels and `aria-expanded`.

For block-specific state, scope selectors and listeners to a root custom element or root element. Guard repeat initialization/registration and clean up global listeners or observers when navigation can remove the block. Use the receiving app's page-transition lifecycle where applicable. Test two instances; global hotkeys need a documented owner. Avoid storing a React component/function in a serialized data attribute; serialize only data.

Account for portals: Dialog/Popover content can move outside a custom-element ancestor. Bind form handlers to the form itself, or capture the required content references before reparenting; querying the old ancestor after opening can silently miss content. Global command shortcuts must recognize the currently open portal instance. Check icon-only controls have nonzero dimensions: semantic SVGs may need explicit sizing to make dialog close buttons clickable.

Keep server and browser responsibilities explicit. Real forms should have named successful controls and a configured action (or the app's Astro Actions flow). A preview without a backend must explain local validation rather than report a successful save, login, checkout or upload. A disabled/unconfigured service button is an integration boundary, not a completed service migration.

## Verify the port against its source contract

Run the receiving application's type check and production build using its existing scripts, then start its development or preview server.

Then inspect the rendered block and exercise its actual behaviors: initial state, keyboard activation, dismiss/focus restoration, validation, derived state, and repeated-instance isolation. Wait for dialog presence animations before asserting hidden state or restored focus. Check a narrow viewport, dark mode and reduced motion when the source supports them. Inspect overflow, accessible labels, duplicate IDs, nested interactive controls and browser errors. Do not treat a compiler transform or a source regex as runtime proof.

Classify the result accurately: a faithful UI port, a documented visual/motion approximation, or a service-dependent partial port. Record observed obstacles, repaired upstream defects, changes to interaction semantics, unverified behavior and reproducible acceptance steps. Update this skill only from demonstrated findings; avoid turning an individual experiment's workaround into a universal rule.
