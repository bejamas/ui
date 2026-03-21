# `@bejamas/ui`

This package is the default checked-in Bejamas UI package surface.

It is **generated output**, not the primary editing surface.

## Source of truth

Edit source here instead:

- `packages/registry/src/ui`
- `packages/registry/src/lib`
- `packages/registry/src/styles/style-*.css`

Do not hand-edit:

- `packages/ui/src/components`
- `packages/ui/src/lib`

`packages/ui` is generated from the built style registry, with `juno` as the default generated style.

## Regenerate the package

After changing registry source or style CSS:

```bash
bun run --cwd apps/web build:style-registry
bun run --cwd packages/ui generate
bun run --cwd packages/ui check:sync
```

You can also run the generator through the app package:

```bash
bun run --cwd apps/web generate:ui-package
```

To generate a style into a different destination root instead of `packages/ui/src`:

```bash
bun run --cwd packages/ui generate -- --style nova --out-dir packages/ui/styles/nova
```

That writes:

- `packages/ui/styles/nova/components/*`
- `packages/ui/styles/nova/lib/*`

## What gets generated

- `src/components/*` comes from the built style-registry component payloads.
- `src/lib/*` is synced from the canonical registry lib source.
- `src/styles/globals.css` stays on the shared Bejamas base/global contract.

## Style updates

For upstream shadcn style adoption and the raw snapshot workflow, see:

- `packages/registry/STYLE_WORKFLOW.md`
- `packages/registry/upstream/shadcn/styles`

Short version:

1. Update the raw upstream snapshot in `packages/registry/upstream/shadcn/styles`.
2. Adapt the runtime style in `packages/registry/src/styles`.
3. Rebuild the style registry.
4. Regenerate `packages/ui`.

## Sanity checks

- `bun run --cwd packages/ui check:sync`
- `bun test packages/ui/test`

If `check:sync` fails, `packages/ui` is stale relative to the built default Juno style bundle.
