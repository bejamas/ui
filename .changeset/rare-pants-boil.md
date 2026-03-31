---
"starlight-theme-bejamas": minor
---

Improve the Starlight Bejamas theme runtime and expose the shared theme-choice helpers for consumers that need to integrate with theme state directly.

- Unify light, dark, and auto theme choice handling across the theme picker, page chrome, and preview surfaces so theme state stays in sync more reliably.
- Refresh browser theme-color metadata and the active theme stylesheet more consistently when theme state or presets change.
- Sync semantic icon updates as part of the theme runtime so icon-library changes propagate cleanly with preset-driven theme updates.
- Export `starlight-theme-bejamas/lib/theme-choice` as a public entrypoint for consumers that want to read, apply, or react to the shared theme-choice state.
