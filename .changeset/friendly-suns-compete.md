---
"bejamas": patch
---

Pin Bejamas-managed `shadcn` calls back to `shadcn@3.8.5` for compatibility with the current Bejamas registry/init flow. This restores the legacy `init --base-color` behavior and stops routing `init` and `add` through `shadcn@latest`.
