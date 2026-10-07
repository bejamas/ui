import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type { Browser } from "playwright-core";
import { loadPage } from "../browser";
import type { SideQuality, TextDifference } from "../types";

export const QUALITY_VIEWPORT = { width: 1280, height: 800 };

const require = createRequire(import.meta.url);
let axeSource: string | undefined;
function readAxeSource() {
  axeSource ??= readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  return axeSource;
}

const CONTEXT_WORDS = 12;

/** Locate the first region where the visible text of the two pages differs. */
export function compareText(original: string, ported: string): TextDifference {
  const a = original.split(" ").filter(Boolean);
  const b = ported.split(" ").filter(Boolean);
  const result: TextDifference = {
    identical: original === ported,
    originalWords: a.length,
    portedWords: b.length,
  };
  if (result.identical) return result;

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const excerpt = (words: string[], end: number) => {
    const from = Math.max(0, start - CONTEXT_WORDS);
    const to = Math.min(
      words.length,
      Math.max(end, start) + CONTEXT_WORDS,
      from + 80,
    );
    return `${from > 0 ? "… " : ""}${words.slice(from, to).join(" ")}${to < words.length ? " …" : ""}`;
  };
  return { ...result, original: excerpt(a, endA), ported: excerpt(b, endB) };
}

export async function measureQuality(
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
    const errors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(
        `${request.url()} (${request.failure()?.errorText ?? "failed"})`,
      );
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        failedRequests.push(`${response.url()} (HTTP ${response.status()})`);
    });

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
      textHash: createHash("sha256").update(data.text).digest("hex"),
      violations: violations.sort((a, b) => a.id.localeCompare(b.id)),
      errors,
      failedRequests: [...new Set(failedRequests)],
    };
  } finally {
    await context.close();
  }
}
