---
"bejamas": minor
---

Add `docs:check` command to validate component documentation completeness

- Scans all `.astro` components and validates JSDoc documentation
- Reports components as complete, incomplete (missing recommended fields), or missing docs (missing required fields)
- Required fields: `@component`, `@title`, `@description`
- Recommended fields: `@preview`, `@usage`, `@figmaUrl`
- Supports `--json` flag for CI integration
- Exits with code 1 when components are missing required documentation

