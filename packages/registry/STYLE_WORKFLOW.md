# Style Workflow

`packages/registry` is the editable source of truth for Bejamas UI.

## Source Of Truth

- Edit component source in `packages/registry/src/ui`.
- Edit shared support code in `packages/registry/src/lib`.
- Edit adapted style layers in `packages/registry/src/styles/style-*.css`.
- Do not hand-edit `packages/ui/src/components` or `packages/ui/src/lib`.

`packages/ui` is generated output from the built style registry, with `juno` as the default generated style.

## Default UI Package

After changing registry source or style CSS:

1. Rebuild the style registry.
2. Regenerate `packages/ui` from the built Juno style bundle.
3. Run the sync check and targeted tests.

Typical commands:

```bash
bun run --cwd apps/web build:style-registry
bun run --cwd packages/ui generate
bun run --cwd packages/ui check:sync
```

## Upstream Shadcn Styles

Raw upstream shadcn style snapshots live in `packages/registry/upstream/shadcn/styles`.

- These files stay as close as possible to upstream.
- `juno` is Bejamas-authored and does not have an upstream raw snapshot.
- Shared styles like `lyra`, `maia`, `mira`, `nova`, and `vega` should keep a committed raw snapshot for diffing and review.

The adapted runtime styles in `packages/registry/src/styles` are the Base UI / `data-slot` compatible versions we actually ship.

## Update Process

When shadcn releases a style update:

1. Copy the new upstream raw CSS into `packages/registry/upstream/shadcn/styles`.
2. Review the diff against the current adapted `packages/registry/src/styles/style-*.css`.
3. Apply the required Bejamas changes:
   - remove or rewrite Radix-specific assumptions
   - keep Base UI / `data-slot` ownership
   - reapply Bejamas-only adjustments such as the navigation-menu indicator
4. Rebuild the style registry and regenerate `packages/ui`.
5. Run the style parity and package sync tests.

## AI-Agent Checklist

When using an agent to adopt a shadcn style update:

1. Treat `packages/registry` as the only editable source.
2. Use the raw snapshot in `packages/registry/upstream/shadcn/styles` as the upstream baseline.
3. Preserve Bejamas-only deltas explicitly instead of deleting them as “drift”.
4. Regenerate `packages/ui` from the built style registry, not by editing it directly.
