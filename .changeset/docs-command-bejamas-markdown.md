---
"bejamas": minor
---

`bejamas docs <component>` now prints the component's bejamas/ui docs as Markdown instead of forwarding to `shadcn docs`, which returned links to shadcn/ui's React docs. `--json` returns `{ results: [{ component, links, content }] }`, and an unknown component gets an `error` and exit code 1. `--base` and `--cwd` are still accepted but ignored.
