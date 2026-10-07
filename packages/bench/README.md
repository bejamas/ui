# @bejamas/bench

Compare an original site with its ported version. Built for checking framework
migrations, such as a React + shadcn/ui site ported to Astro + b/ui, but it
works with any two URLs.

```bash
npx @bejamas/bench http://localhost:3000 http://localhost:4321
# or through the Bejamas CLI
npx bejamas bench http://localhost:3000 http://localhost:4321
```

Requires Node.js 22.19+ and Google Chrome. Set `CHROME_PATH` or pass
`--chrome-path` if Chrome is installed in a nonstandard location.

## What it measures

| Stage        | What it compares                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lighthouse` | Median performance score, FCP, LCP, TBT, CLS and Speed Index. Runs alternate between the two URLs (original first, then ported first) so drift affects both equally.                                                                                   |
| `assets`     | Every response of a cold load at 412×823: JavaScript, CSS, HTML, fonts, images and other requests. HTML, CSS and JavaScript are recompressed with gzip level 9 and Brotli quality 11, so a local server without compression and a CDN compare equally. |
| `quality`    | Visible text, title, description and `lang`, heading outline, axe-core violations, console and page errors, failed requests, DOM size and nested interactive controls.                                                                                 |
| `visual`     | Visible `data-slot` components matched by slot name, text and order, then compared by size. Top-level header, main, section and footer regions are compared by position and size. Full-page screenshots are pixel-diffed.                              |

Accessibility violations, browser errors and failed requests only fail the run
when they are new in the ported page. Problems that the original already has are
reported as warnings.

## Production builds only

Development servers ship unminified code and HMR clients. When a Vite, Astro,
Next.js or webpack dev server is detected, the `assets` and `lighthouse` stages
are skipped. Pass `--allow-dev` to measure anyway.

Lighthouse timings are reported as not comparable when one URL is local and the
other is remote, and timing budgets are skipped. Asset budgets still apply
because their compression is recomputed locally.

## Budgets

`--fail-on` takes comma-separated budgets, and can be repeated. Size and timing
budgets compare the change from original to ported:

| Budget       | Fails when                                                       |
| ------------ | ---------------------------------------------------------------- |
| `lcp>10%`    | LCP grows by more than 10%                                       |
| `tbt>50ms`   | TBT grows by more than 50 ms                                     |
| `score<-5`   | The performance score drops by more than 5 points                |
| `js>0`       | Route JavaScript (gzip) grows at all                             |
| `total>20kb` | HTML + CSS + JS (gzip) + fonts grow by more than 20 KiB          |
| `requests>0` | The page makes more requests                                     |
| `pixels>1%`  | More than 1% of screenshot pixels differ at any width (absolute) |

Metrics: `score`, `fcp`, `lcp`, `tbt`, `cls`, `si`, `js`, `css`, `html`,
`fonts`, `total`, `requests`, `pixels`.

## Output

The summary is printed to the terminal: checks, budgets, Lighthouse, route
assets, visual parity and page quality. Nothing is written to disk unless you
pass `--out <dir>`, which adds:

- `report.md`: the readable report
- `report.json`: every measurement, including per-run Lighthouse values and per-request assets
- `screenshots/`: `original-<width>.png`, `ported-<width>.png` and `diff-<width>.png`
- `lighthouse/`: the full Lighthouse JSON for every run

Exit codes: `0` when all checks and budgets pass, `1` when any fail, `2` when
the run cannot complete. Use `--report-only` to always exit with `0` for
checks and budgets. Use `--json` to print the report to stdout for scripts and
agents.

## Options

```
-o, --out <dir>         also write report files to this directory
-r, --runs <count>      Lighthouse runs per URL (default: 5)
-w, --widths <list>     viewport widths for visual parity (default: 412,1280)
--form-factor <type>    mobile or desktop Lighthouse emulation (default: mobile)
--only <stages>         run only these stages
--skip <stages>         skip these stages
--tolerance <px>        allowed size difference (default: 0.5)
--fail-on <budgets>     budgets, see above
--report-only           exit with 0 even when checks or budgets fail
--allow-dev             measure assets and Lighthouse on dev servers
--chrome-path <path>    Chrome executable
--timeout <ms>          navigation timeout (default: 60000)
--json                  print the JSON report to stdout
```

## Programmatic use

```ts
import { runBench } from "@bejamas/bench";

const { report } = await runBench({
  original: "http://localhost:3000",
  ported: "http://localhost:4321",
  outDir: "bench-report", // optional; omit to skip writing files
  runs: 5,
  widths: [412, 1280],
  formFactor: "mobile",
  stages: ["assets", "quality", "visual", "lighthouse"],
  tolerance: 0.5,
  budgets: ["lcp>10%"],
  allowDev: false,
  timeout: 60_000,
});
```

## Limitations

- Lab measurements of one route, not field Core Web Vitals.
- Assets are those loaded without interaction. Code loaded only after a click is not counted.
- Interaction latency is not measured yet.
- Pages with randomized or time-based content will report text and pixel differences.
