---
"bejamas": patch
---

Fix interactive component installs so internal semantic icon registry items are not installed as user dependencies. Components added through `bejamas add` now rely on the icon library selected during init, and shadcn failure output is surfaced when dependency installation fails.
