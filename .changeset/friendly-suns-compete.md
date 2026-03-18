---
"bejamas": patch
---

Fix `bejamas init` against current `shadcn@latest` by removing the obsolete upstream `--base-color` flag, warning on deprecated `bejamas --base-color`, and normalizing generated `components.json` back to Bejamas's default `neutral` base color.
