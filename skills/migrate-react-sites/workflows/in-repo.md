# In-repo workflow: migrate a site to Astro inside its own repository

The existing React/Next app is the **legacy app**. A new **Astro app** grows next to it in the same repository. It starts by rendering the legacy pages in place, swaps them for Astro section by section at pixel parity, and takes over the migrated routes at cutover. The legacy app's production build is the reference: where the shared references say *demo*, read *legacy build*; where they say *source*, read *legacy code*.

When a step doesn't fit what you find in the repo, follow the repo, and record the mismatch under *Skill feedback* in the ledger.

## Scope and ground rules

- **Marketing sites:** pages, content, CMS or MDX data, simple forms, analytics. Auth-gated product areas, dashboards and app logic built on server actions stay on the legacy app. If they're most of the repo, stop after the survey and tell the developer which parts this workflow can't cover.
- **Partial migrations are normal.** Routes left out of scope keep running on the legacy app after cutover, so phase 0 plans how both apps share the domain.
- **Pixel parity:** the migration changes the stack, not the design. Design changes and fixes to legacy bugs go to the ledger as follow-ups.
- **The legacy app stays as it is** until cutover: it is the reference, and it keeps shipping. Change only what building and testing it locally needs, gated behind env vars, and record each change in the ledger.
- **React islands are a starting point, not a destination.** Legacy code rendered as islands gets the Astro app to parity on day one; sections are then swapped out one by one. At cutover, no published page renders an island. React code may only stay for section types no published page uses, listed in the ledger. Removing React entirely belongs to the optional legacy removal.
- **Local checks and deployment checks are separate.** Every "done when" below is checkable locally. Checks that need a deployment (host redirects and headers, ISR, CI) go into the ledger's *Deployment checks* and become the developer's cutover checklist.
- **Work on a migration branch**, commit per phase or per route, and use the repo's own package manager, lint and format config.
- **Keep this skill's folder out of the repo's formatting.** When the skill is vendored into the repo (e.g. `.agents/skills/`), add that folder to `.prettierignore` and the lint ignores: a `prepare` or `build` script that runs `prettier --write .` rewrites it.

## Astro source

For a React/Next source, continue at [The ledger](#the-ledger).

When the site already runs on Astro and only its styling stack changes (PandaCSS, vanilla-extract, CSS modules → Tailwind and bejamas/ui), there's no legacy app and no new app: the site is ported **in place**, one component at a time. The measuring scripts, the parity method and the primitive guidance apply unchanged. The phases change like this:

- **Reference:** the untouched baseline commit, served from a worktree on its own port (`git worktree add --detach <ref-dir> <commit>`). Wherever this workflow says *legacy build*, read *that worktree*.
- **Dev servers** are acceptable on both sides when a production build per change is too slow (a Worker adapter, a CMS-heavy build), because they share the site's CSS pipeline. Turn HMR off on the port (`vite: { server: { hmr: false } }` behind an env var) so a save can't reload a page mid-measurement, and pre-bundle the `@data-slot/*` packages (see the dev-server row in [known issues](../references/known-issues.md#astro-gotchas)). Record the choice in *How to resume*.
- **Ledger:** keep *Routes*, *e2e baseline*, *Deployment checks*, gaps, follow-ups and skill feedback. In place of *Providers*, *Next features*, *Shared code* and *Islands*, keep **Work units** (each component or style module to port, `todo` → `ported` → `verified`) and **Porting conventions** (the old-styles → Tailwind mapping every unit uses, so each session translates the same way).
- **Phase 0:** steps 1, 2, 4 and 9 apply, with the source's styling system surveyed in place of Next: where its CSS lives and in which cascade layers, its tokens, breakpoints and conditions, and its text styles (see [two styling systems at once](../references/other-libraries.md#two-styling-systems-at-once)). Step 3 is the reference worktree; steps 5–8 don't apply.
- **Phase 1:** run `bejamas init` in the site itself, apply the *Setup and CLI* fixes in [known issues](../references/known-issues.md), and set up Tailwind **beside** the old system: layer order, reset deltas and tokens copied 1:1. **Done when** the site builds with both systems and `compare-boxes.mjs` shows no diff on any route.
- **Phases 2 and 3** become one pass over the work units. Replace each unit's style definitions with Tailwind classes (translation traps in [recipes](../references/recipes.md#other-styling-systems--tailwind)), or with a bejamas component or `@data-slot` primitive (see [other libraries](../references/other-libraries.md)). Then measure every route that renders the unit as in phase 3b. There are no islands, so 3a doesn't apply.
- **Phases 4, 5 and 8 don't apply.** Once the last unit is `verified`, remove the old styling system in one step (packages, config, codegen output, imports), run phase 6 again, and finish with phase 7's checklist and PR description.
- **`<ClientRouter />`:** if the site uses it, read the ClientRouter row in [known issues](../references/known-issues.md#components) before porting the first interactive component.

## The ledger

Create `MIGRATION.md` at the repository root in phase 0 (the Astro app's folder doesn't exist yet) and keep it current. It is the single record of progress, so a later session resumes from it. Start it with *How to resume*: the exact commands that start the content source, the legacy build and the Astro production server. Sections:

- **Routes:** URL, legacy file, the legacy modules it depends on, status (`todo` → `island` → `ported` → `verified`), notes.
- **Providers:** every provider the legacy layout wraps pages in.
- **Next features:** each feature in use, its Astro mapping, status.
- **Shared code:** each module, its class (*portable*, *React-bound*, *Next-bound*), and how the Astro app gets it.
- **Islands:** each section type still rendered by legacy code, and whether a published page uses it.
- **Coexistence plan**, **e2e baseline**, **Deployment checks**.
- **Gaps and approximations**, **Follow-ups**, **Skill feedback**.

### 0. Survey

1. **Project facts:** package manager (lockfile), workspace layout, Next and React versions, router (`app/` or `pages/`), Tailwind v3 or v4, the source component library (see *Identify the source library* in SKILL.md), deploy target (`vercel.json`, `netlify.toml`, Dockerfile, host settings the developer tells you), CI workflows, and test suites (Playwright, Cypress, Vitest).
2. **Content source:** the legacy build needs its real data. Ask the developer for the env values build-time data needs (CMS tokens, API keys), read-only where possible. Without them, replay what you can offline (see [recipes](../references/recipes.md#offline-content)) and mark every route that has no offline content as *unverifiable offline*: it isn't verified until it passes on real content.
3. **Legacy build:** build and start it in production mode (`next build && next start -p 3000`), not `next dev`; dev mode adds overlays and different CSS chunking that skew measurements.
4. **Routes:** every `page.tsx` (or `pages/` file), including route groups and dynamic segments, with how each dynamic segment gets its params (`generateStaticParams`, CMS query). List real URLs, not just patterns. Mark each route in scope or out of scope.
5. **Providers:** every provider the root and nested layouts wrap pages in (UI library provider, URL-state adapters such as nuqs, data clients such as React Query, theme, i18n). Legacy code rendered as an island fails, or renders differently, without them.
6. **Next features:** search for `from "next/` imports and `"use server"`; read `next.config.*` (redirects, rewrites, headers, images, i18n, `basePath`, `trailingSlash`, `output`), `middleware.ts`/`proxy.ts`, route handlers (`route.ts`), `revalidate` exports, `sitemap.ts`, `robots.ts`, `opengraph-image.*`, `manifest.*`, analytics, and every `process.env.*` read.
7. **Shared code:** classify each module under `lib/`, `data/`, `content/`, `types/`, `hooks/`, `config/`: *portable* (plain TS, data, zod, content), *React-bound* (hooks, JSX), *Next-bound* (imports `next/*`; often reusable through the stand-ins in [recipes](../references/recipes.md#next-stand-ins)).
8. **Coexistence plan:** when routes stay on the legacy app, agree with the developer which app owns the domain and how the other one is reached (rewrites to a `LEGACY_ORIGIN`, including `/_next/*`), and list in-scope pages that call legacy APIs from the browser (see [recipes](../references/recipes.md#partial-migrations)).
9. **e2e baseline:** run the repo's e2e suite against the legacy build, pick the in-scope subset, and record pass or fail per test. Later runs against the Astro app are compared test by test with this baseline, never by pass count.

**Done when** the legacy build serves every in-scope route locally on its real content (or the routes it can't are marked *unverifiable offline*), and the ledger lists every route with real URLs and scope, every provider, every Next feature with a planned Astro mapping (see [recipes](../references/recipes.md#in-repo-migration)), every shared module with its class, the coexistence plan, and the e2e baseline.

### 1. Scaffold the Astro app next to the legacy app

**Location:** in a workspace monorepo, a new app beside the legacy one (e.g. `apps/<name>-astro`). In a single-app repo, an `astro/` folder at the root with its own `package.json`, so the legacy app stays untouched.

```sh
# <astro-dir> must not exist yet. Run init through the repo's package manager
# (pnpm dlx / npx / yarn dlx / bunx) so the app gets the matching lockfile and scripts.
test ! -e <astro-dir> && scaffold="$(mktemp -d)" &&
  <pm-dlx> bejamas@latest init -t astro -b neutral -y -d -f -c "$scaffold" &&
  mv "$scaffold/my-app" <astro-dir>
```

Before installing, rename the app's package (`my-app`) to the repo's naming scheme. Align shared tool versions (TypeScript, ESLint) with the workspace. In a workspace, delete the app's own lockfile and install from the repo root. Then, in the Astro app:

1. **Setup fixes:** the cleanup items from [rebuild step 3](rebuild.md#3-scaffold) and the *Setup and CLI* table in [known issues](../references/known-issues.md).
2. **Tokens:** copy the legacy `:root`/`.dark` blocks, then confirm them against the legacy build with `tokens.mjs` in both schemes; computed values win where they disagree.
3. **Fonts:** reuse the legacy app's font choices and files (`next/font/local` files move into `src/assets/fonts/`); see the font rows in [recipes](../references/recipes.md#nextjs-features).
4. **Color mode:** the head script from [recipes](../references/recipes.md#color-mode) when the legacy app uses next-themes, with its storage key.
5. **Shared code and assets:** import legacy modules through the `@legacy` alias and its resolver, add the Next stand-ins, and share the legacy `public/` with `publicDir` (all in [recipes](../references/recipes.md#in-repo-migration)), so content edits merged into the legacy app during the migration reach both apps.
6. **Adapter and local production server:** a fully prerendered app can use `astro preview` without an adapter. Once any route needs server rendering (endpoints, actions, middleware or ISR), configure an adapter for local builds too: disabling it makes `astro build` fail. Use the deployment adapter's supported local runner, or a [Node adapter in standalone mode](https://docs.astro.build/en/guides/integrations-guide/node/) with `node ./dist/server/entry.mjs` when the deployment adapter doesn't support `astro preview`. Keep the deployment adapter on the host, and record both configurations and the exact build/start commands in the ledger. Verify host-specific behavior on a preview deployment.
7. **Scripts:** `dev`, `build`, `preview` (the local production runner chosen above), `check` (`astro check`), plus the repo's lint and format, wired the way the repo runs its other apps. If `astro preview` returns immediately, it's running in the background: `astro preview stop|status|logs`.

**Done when** the Astro app builds and lints with the repo's package manager, and its preview serves an empty layout with the legacy app's background, text color and font.

### 2. Shell

Port the root layout and what every page shares: `<head>` from the root `metadata` (title template, description, icons, OG defaults, `theme-color`), fonts, color-mode script, header, footer, mobile nav, the 404 page and global CSS. Apply the porting rules from [rebuild step 4](rebuild.md#4-port-section-by-section) and the behavior ladder from [rebuild step 5](rebuild.md#5-behavior).

**Done when** on the 404 page (its content needs nothing from phase 3), header, footer and body match the legacy build within 2px at 1440, 768 and 390 in every supported color scheme (`--allow-status=404`), and the mobile nav and theme toggle behave the same in `run.mjs`.

### 3. Routes: islands first, then swap sections

**3a. Render every in-scope route through the legacy code.** Create each page under `src/pages/` at the same URL; dynamic routes produce their params in `getStaticPaths` from the same data or CMS query the legacy app uses. Render the page body with the legacy page or section renderer as a React island ([recipes](../references/recipes.md#legacy-islands)):

- **Server-only by default:** without a `client:*` directive an island ships no JavaScript. Add one only to sections whose interaction you haven't ported yet.
- **Wrapped in every provider** from the ledger.
- **Reported at build time:** the island wrapper logs each route and section type it renders, which phase 5 uses.

Measure each route with `compare-boxes.mjs`: it should already match. Set routes that do to `island`.

**3b. Swap sections for Astro, one at a time.** For each section type, most used first:

1. Port it following [rebuild steps 4–6](rebuild.md#4-port-section-by-section) (components, classes, behavior, motion); for a non-shadcn source, styling follows [other libraries](../references/other-libraries.md).
2. Re-measure every route that uses it with `compare-boxes.mjs http://localhost:3000<route> http://localhost:4321<route> <width>` at 1440, 768 and 390 in each scheme, and compare its behavior with `run.mjs`.
3. Run the e2e tests that touch it and compare them with the baseline: e2e catches focus and keyboard regressions that pixels and behavior traces miss.
4. Commit. A route whose sections are all Astro becomes `ported`, then `verified` once its checks pass.

When legacy changes land during the migration, rebase and re-verify the routes whose legacy modules changed (the route table lists them).

**Done when** every in-scope route is `verified` (no unexplained box diff above 2px at any width or scheme, identical `run.mjs` traces, e2e matching the baseline) or explicitly left at `island` with a reason in the ledger.

### 4. Next features

Implement each ledger entry using the mappings in [recipes](../references/recipes.md#in-repo-migration): redirects and headers, middleware, form endpoints, ISR, env vars, sitemap, robots, OG images, analytics, i18n routing, and the coexistence rewrites. Features that need a server (endpoints, actions, middleware) bring an adapter matching the deploy target and the local production server from phase 1; keep everything else prerendered.

**Done when** every *Next features* entry is implemented and its local part checked on the Astro production server from phase 1 (sitemap and robots list the same URLs, head and analytics match, each in-scope form submits end to end), env var names are listed for the host, and every check that needs a deployment (redirect statuses, headers, middleware, ISR, rewrites) is written under *Deployment checks*.

### 5. Replace the islands on published pages

Build the Astro app on the full real content and read the island report. Port every section type it lists, following phase 3b. For section types no published page uses, decide with the developer: port them anyway, keep the island code listed in the ledger, or drop them after a content audit.

**Done when** the full-content build reports no island on any page, and the ledger lists any island code kept for unused section types with the developer's decision.

### 6. Verify the whole site

Build both apps on the full real content and run them side by side, then:

- **Pixels:** `compare-boxes.mjs` on every in-scope route at 1440, 768 and 390 in each scheme; page heights match within a few px. A route that renders legacy-API data (see the coexistence plan) differs locally by design: record it.
- **Behavior:** `run.mjs` traces for each interactive section.
- **URLs:** every in-scope legacy URL (route list, legacy sitemap, redirect sources) returns the same status and redirect target (the URL parity check in [recipes](../references/recipes.md#url-parity)); host-level behavior goes to *Deployment checks*.
- **Head:** per route, the same title, description, canonical, robots and OG/Twitter tags.
- **e2e:** the in-scope subset, compared test by test with the baseline. Unit and component tests of React code become follow-ups for the legacy removal.

**Done when** every check above passes locally and every remaining difference is explained in the ledger.

### 7. Cutover

1. Prepare the switch in the repo: deploy configuration (root directory, build command, output) for the Astro app, CI workflows that build, check and test it, the env vars from phase 4, and the coexistence rewrites with their second deploy job when routes stay on the legacy app.
2. Give the developer the cutover checklist: host-side settings, the domain plan, and every *Deployment checks* entry to run on a preview deployment.
3. Write the PR description from the ledger: fidelity verdict, route table, feature mapping, approximations, follow-ups, verification evidence.

**Done when** the repo-side configuration is in place, the checklist and PR description are written, and, where the repo has a remote and preview deployments, CI passes and the *Deployment checks* pass on a preview.

### 8. Remove the legacy app (optional, ask first)

Ask the developer whether to remove the legacy app now, and wait for the answer. Tell them what removal covers and that keeping it for a while after go-live leaves an easy rollback. Removal isn't possible while routes stay on the legacy app by the coexistence plan.

- **Yes:** port or drop the remaining island code (it imports legacy modules); move the modules the Astro app imports through the alias into the Astro app and update the imports; remove the Next stand-ins and `@astrojs/react`; move the Astro app to the legacy app's location if the developer wants (`git mv`); delete the legacy app, its config (`next.config.*`, `next-env.d.ts`, `.next` ignores) and its React tests; remove dependencies nothing imports any more (`next`, `react`, `react-dom`, the source component library, framer-motion, next-themes and the like).
- **No:** add the removal to the ledger's follow-ups with the list above.

**Done when** the developer has answered, and after a removal: build, lint and tests pass, no file imports `next` or `react`, and neither appears in any `package.json`.
