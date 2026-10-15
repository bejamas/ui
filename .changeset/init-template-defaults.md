---
"bejamas": patch
---

Fix the projects `bejamas init` creates:

- `-b <base-color>` now applies that base color's theme. `-b neutral` used to keep the blue `bejamas-blue` primary. The accepted base colors now match the design system (adds mauve, olive, mist and taupe; drops gray and slate, which failed).
- Fonts load their whole weight range instead of only 400, and the body and heading font variables no longer override Astro's `<Font>`.
- `bejamas add select` installs `lib/select.ts` and `@data-slot/select`, so the component builds.
- The layout gets `<html lang="en">` without a double space and `initial-scale=1`; the project's package takes the project name and pins the running `bejamas` version; the templates ship the current registry Button.
