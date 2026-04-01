---
"bejamas": patch
---

Fix published `bejamas init` project creation by falling back to starter templates downloaded from the `bejamas/ui` GitHub repo when local bundled templates are unavailable, and make starter projects resolve `bejamas/tailwind.css` correctly by publishing a root CSS entrypoint and updating templates to depend on the current `0.3.x` package line.
