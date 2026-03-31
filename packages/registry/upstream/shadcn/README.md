# Upstream Shadcn Style Snapshots

This directory stores raw style CSS snapshots copied from the vendored shadcn source in `tmp/shadcn-ui/apps/v4/registry/styles`, plus reviewed `cn-*` token audit fixtures generated from `tmp/shadcn-ui/apps/v4/registry/bases/base/ui`.

- The raw CSS files under `styles/` should stay verbatim or as close to verbatim as possible.
- They are review baselines, not runtime inputs.
- The adapted runtime styles live in `packages/registry/src/styles`.
- `base-cn-tokens.json` and `base-cn-diff-summary.txt` are committed audit fixtures; refresh them with `bun run packages/registry/scripts/refresh-shadcn-cn-audit.ts` when the local `tmp/shadcn-ui` checkout changes.
- `juno` is Bejamas-authored, so there is no upstream raw `style-juno.css` snapshot here.
