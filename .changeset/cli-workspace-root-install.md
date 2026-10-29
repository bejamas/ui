---
"bejamas": patch
---

`bejamas add` and `bejamas init` now install dependencies in a project that is its own pnpm workspace root, instead of failing with `ERR_PNPM_ADDING_TO_ROOT`.
