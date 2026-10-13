# In-repo workflow: migrate a site to Astro inside its own repository

The existing React/Next app is the **legacy app**. A new **Astro app** grows next to it in the same repository, reaches pixel parity route by route, and replaces it at cutover. The legacy app's production build is the reference: where the shared references say *demo*, read *legacy build*; where they say *source*, read *legacy code*.

**Status: unproven.** This workflow applies the rebuild workflow's lessons but hasn't been run on a real migration yet. When a step doesn't fit what you find in the repo, follow the repo, and record the mismatch under *Skill feedback* in the ledger.

## Scope and ground rules

- **Marketing sites:** pages, content, CMS or MDX data, simple forms, analytics. Auth-gated product areas, dashboards and app logic built on server actions are out of scope; if they're a substantial part of the repo, stop after the survey and tell the developer which parts this workflow can't cover.
- **Pixel parity:** the migration changes the stack, not the design. Design changes and fixes to legacy bugs go to the ledger as follow-ups.
- **The legacy app stays as it is** until cutover: it is the reference, and it keeps shipping. Run it; change only what's needed to build it locally.
- **React islands are temporary.** A widget that would block a route can ship as a React island (`@astrojs/react`) during the migration. Every island is logged and replaced before cutover; the end state has no React.
- **Work on a migration branch**, commit per phase or per route, and use the repo's own package manager, lint and format config.

## The ledger

Create `MIGRATION.md` at the Astro app's root in phase 0 and keep it current. It is the single record of progress, so a later session resumes from it. Sections:

- **Routes:** URL, legacy file, the legacy modules it depends on, status (`todo` → `ported` → `verified`), notes.
- **Next features:** each feature in use, its Astro mapping, status.
- **Shared code:** each module, its class (*portable*, *React-bound*, *Next-bound*), and how the Astro app gets it.
- **Islands:** each React island, why, and its replacement plan.
- **Gaps and approximations**, **Follow-ups**, **Skill feedback**.

### 0. Survey

1. **Project facts:** package manager (lockfile), workspace layout, Next and React versions, router (`app/` or `pages/`), Tailwind v3 or v4, `components.json` style, deploy target (`vercel.json`, `netlify.toml`, Dockerfile, host settings the developer tells you), CI workflows, and test suites (Playwright, Cypress, Vitest).
2. **Legacy build:** build and start it in production mode (`next build && next start -p 3000`), not `next dev`; dev mode adds overlays and different CSS chunking that skew measurements. Take env vars from `.env.example`; ask the developer for values that build-time data needs (CMS tokens, API keys).
3. **Routes:** every `page.tsx` (or `pages/` file), including route groups and dynamic segments, with how each dynamic segment gets its params (`generateStaticParams`, CMS query). List real URLs, not just patterns.
4. **Next features:** search for `from "next/` imports and `"use server"`; read `next.config.*` (redirects, rewrites, headers, images, i18n, `basePath`, `trailingSlash`, `output`), `middleware.ts`, route handlers (`route.ts`), `revalidate` exports, `sitemap.ts`, `robots.ts`, `opengraph-image.*`, `manifest.*`, analytics, and every `process.env.*` read.
5. **Shared code:** classify each module under `lib/`, `data/`, `content/`, `types/`, `hooks/`, `config/`: *portable* (plain TS, data, zod, content), *React-bound* (hooks, JSX), *Next-bound* (imports `next/*`).

**Done when** the legacy build serves every route locally, and the ledger lists every route with real URLs, every Next feature with a planned Astro mapping (see [recipes](../references/recipes.md#in-repo-migration)), and every shared module with its class.

### 1. Scaffold the Astro app next to the legacy app

**Location:** in a workspace monorepo, a new app beside the legacy one (e.g. `apps/<name>-astro`). In a single-app repo, an `astro/` folder at the root with its own `package.json`, so the legacy app stays untouched.

```sh
# <astro-dir> must not exist yet. Run init through the repo's package manager
# (pnpm dlx / npx / yarn dlx / bunx) so the app gets the matching lockfile and scripts.
test ! -e <astro-dir> && scaffold="$(mktemp -d)" &&
  <pm-dlx> bejamas@latest init -t astro -b neutral -y -d -f -c "$scaffold" &&
  mv "$scaffold/my-app" <astro-dir>
```

In a workspace, delete the app's own lockfile and install from the repo root so the workspace lockfile picks it up. Then, in the Astro app:

1. **Setup fixes:** `bejamas@latest`, `bejamas add button --overwrite -y`, and the cleanup items from [rebuild step 3](rebuild.md#3-scaffold) and the *Setup and CLI* table in [known issues](../references/known-issues.md).
2. **Tokens:** copy the legacy `:root`/`.dark` blocks, then confirm them against the legacy build with `tokens.mjs` in both schemes; computed values win where they disagree.
3. **Fonts:** reuse the legacy app's font choices and files (`next/font/local` files move into `src/assets/fonts/`); see the font rows in [recipes](../references/recipes.md#nextjs-features).
4. **Color mode:** the head script from [recipes](../references/recipes.md#color-mode) when the legacy app uses next-themes, with its storage key.
5. **Shared code:** import portable modules from the legacy app through an alias instead of copying them (see [recipes](../references/recipes.md#in-repo-migration)), so content edits merged into the legacy app during the migration reach both apps.
6. **Scripts:** `dev`, `build`, `preview`, `check` (`astro check`), plus the repo's lint and format, wired the way the repo runs its other apps.

**Done when** the Astro app builds and lints with the repo's package manager, and its preview serves an empty layout with the legacy app's background, text color and font.

### 2. Shell

Port the root layout and what every page shares: `<head>` from the root `metadata` (title template, description, icons, OG defaults, `theme-color`), fonts, color-mode script, header, footer, mobile nav, the 404 page and global CSS. Apply the porting rules from [rebuild step 4](rebuild.md#4-port-section-by-section) and the behavior ladder from [rebuild step 5](rebuild.md#5-behavior).

**Done when** on the home route, header and footer match the legacy build within 2px at 1440, 768 and 390 in every supported color scheme, and the mobile nav and theme toggle pass a click-through.

### 3. Routes

Take routes in ledger order, home first. For each route:

1. Create the page under `src/pages/` at the same URL. Dynamic routes produce their params in `getStaticPaths` from the same shared data or CMS query the legacy app uses.
2. Port its sections following [rebuild steps 4–6](rebuild.md#4-port-section-by-section) (components with parity resets, post-merge classes, behavior, motion).
3. When a widget would block the route (a complex form, a chart), copy the legacy component and the shadcn components it imports into `src/islands/`, add their packages, render it with a `client:*` directive, and log it under *Islands*.
4. Measure with `compare-boxes.mjs http://localhost:3000<route> http://localhost:4321<route> <width>` at 1440, 768 and 390 in each scheme, and click through its interactive parts.
5. Set the route to `verified` in the ledger and commit.

When legacy changes land during the migration, rebase and re-verify the routes whose legacy modules changed (the route table lists them).

**Done when** every route in the ledger is `verified`: no unexplained box diff above 2px at any width or scheme, and its click-through passes.

### 4. Next features

Implement each ledger entry using the mappings in [recipes](../references/recipes.md#in-repo-migration): redirects and headers, middleware, form endpoints, ISR, env vars, sitemap, robots, OG images, analytics, i18n routing. Features that need a server (endpoints, actions, middleware) bring an adapter matching the deploy target; keep everything else prerendered.

**Done when** every *Next features* entry is implemented and checked (host-level redirects and headers on a preview deployment, the rest on `astro preview`): each redirect returns the legacy status and location, each form submits end to end, sitemap and robots list the same URLs, and env var names are updated in the app and listed for the host.

### 5. Replace the islands

Rebuild each island with bejamas components and the behavior ladder from [rebuild step 5](rebuild.md#5-behavior), re-measure its route, and remove it from the ledger. Then remove `@astrojs/react`, `react` and `react-dom` from the Astro app.

**Done when** the Astro app has no `client:` directives, no React imports and no React dependencies, and the affected routes are re-verified.

### 6. Verify the whole site

Run the legacy build and the Astro preview side by side, then:

- **Pixels:** `compare-boxes.mjs` on every route at 1440, 768 and 390 in each scheme; page heights match within a few px.
- **URLs:** every legacy URL (route list, legacy sitemap, redirect sources) returns the same status and redirect target (the URL parity check in [recipes](../references/recipes.md#url-parity)).
- **Head:** per route, the same title, description, canonical, robots and OG/Twitter tags.
- **Tests:** the repo's e2e suite passes against the preview (point its base URL at it). Unit and component tests of React code become follow-ups for the legacy removal.
- **CI and deploy:** CI builds, checks and tests the Astro app; a preview deployment of it works. Host-side settings belong to the developer: list the exact changes for them.

**Done when** every check above passes and every remaining difference is explained in the ledger.

### 7. Cutover

1. Switch production to the Astro app: deploy configuration (root directory, build command, output), CI workflows, and the env vars from phase 4. Give the developer the host-side steps as a checklist.
2. Write the PR description from the ledger: fidelity verdict, route table, feature mapping, approximations, follow-ups, verification evidence.

**Done when** the deploy configuration and CI target the Astro app, CI passes, and the PR description is written.

### 8. Remove the legacy app (optional, ask first)

Ask the developer whether to remove the legacy app now, and wait for the answer. Tell them what removal covers and that keeping it for a while after go-live leaves an easy rollback.

- **Yes:** move the portable modules the Astro app imports through the alias into the Astro app and update the imports; move the Astro app to the legacy app's location if the developer wants (`git mv`); delete the legacy app, its config (`next.config.*`, `next-env.d.ts`, `.next` ignores) and its React tests; remove dependencies nothing imports any more (`next`, `react`, `react-dom`, Radix, framer-motion, next-themes and the like).
- **No:** add the removal to the ledger's follow-ups with the list above.

**Done when** the developer has answered, and after a removal: build, lint and tests pass, no file imports `next` or `react`, and neither appears in any `package.json`.
