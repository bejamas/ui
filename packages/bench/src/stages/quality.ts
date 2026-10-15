import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type { Browser } from "playwright-core";
import { loadPage } from "../browser";
import { bothSides } from "../sides";
import { compareText } from "../text";
import { createProblemLog } from "./problems";
import type { Paired, QualityResult, SideQuality } from "../types";

const QUALITY_VIEWPORT = { width: 1280, height: 800 };

const require = createRequire(import.meta.url);
let axeSource: string | undefined;
function readAxeSource() {
  axeSource ??= readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  return axeSource;
}

export async function measureQuality(
  browser: Browser,
  urls: Paired<string>,
  timeout: number,
): Promise<QualityResult> {
  const sides = await bothSides((side) =>
    measureSide(browser, urls[side], timeout),
  );
  return {
    viewport: QUALITY_VIEWPORT,
    ...sides,
    text: compareText(sides.original.text, sides.ported.text),
  };
}

async function measureSide(
  browser: Browser,
  url: string,
  timeout: number,
): Promise<SideQuality> {
  // CSP would otherwise block injecting axe-core into live sites.
  const context = await browser.newContext({
    viewport: QUALITY_VIEWPORT,
    locale: "en-US",
    bypassCSP: true,
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    const problems = createProblemLog();
    page.on("console", (message) => {
      if (message.type() === "error") problems.consoleError(message.text());
    });
    page.on("pageerror", (error) => problems.pageError(error.message));
    page.on("requestfailed", (request) =>
      problems.requestFailed(
        request.url(),
        request.failure()?.errorText ?? "failed",
      ),
    );
    page.on("response", (response) =>
      problems.response(response.url(), response.status()),
    );

    await loadPage(page, url, timeout);

    const data = await page.evaluate(() => {
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      return {
        title: document.title,
        description:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") ?? null,
        lang: document.documentElement.getAttribute("lang"),
        text: normalize(document.body.innerText),
        headings: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
          .filter((element) => element.checkVisibility())
          .map((element) => ({
            level: Number(element.tagName[1]),
            text: normalize(element.textContent ?? ""),
          })),
        domElements: document.querySelectorAll("*").length,
        domBytes: new TextEncoder().encode(document.documentElement.outerHTML)
          .byteLength,
        nestedInteractiveControls: document.querySelectorAll(
          "button a, a button, button button, a a, button input, a input, button select, a select",
        ).length,
      };
    });

    await page.addScriptTag({ content: readAxeSource() });
    const violations = await page.evaluate(async () => {
      const axe = (globalThis as unknown as { axe: typeof import("axe-core") })
        .axe;
      const result = await axe.run(document);
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodes: violation.nodes.length,
      }));
    });

    return {
      finalUrl: page.url(),
      ...data,
      violations: violations.sort((a, b) => a.id.localeCompare(b.id)),
      ...problems.result(),
    };
  } finally {
    await context.close();
  }
}
