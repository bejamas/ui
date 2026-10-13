// Minimal headless Chrome driver over the DevTools protocol, shared by the other scripts.
// No npm dependencies: needs Node 22+ (or Bun) and an installed Chrome, Chromium, Edge or Brave.
// Set CHROME_PATH when the browser isn't in a standard location.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const local = process.env.LOCALAPPDATA ?? "";
  const programFiles = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], local].filter(Boolean);
  const candidates = {
    darwin: ["Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser"].map((n) => `/Applications/${n}.app/Contents/MacOS/${n}`),
    win32: programFiles.flatMap((p) => [join(p, "Google/Chrome/Application/chrome.exe"), join(p, "Microsoft/Edge/Application/msedge.exe")]),
  }[process.platform] ?? ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]
    .flatMap((n) => (process.env.PATH ?? "").split(delimiter).map((d) => join(d, n)));
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome/Chromium/Edge found. Install one or set CHROME_PATH.");
  return found;
}

export async function launch() {
  const chrome = findChrome();
  const userDataDir = mkdtempSync(join(tmpdir(), "port-chrome-"));
  const proc = spawn(chrome, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "--hide-scrollbars",
    "--no-first-run", "--no-default-browser-check", "--mute-audio", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  // Don't leave Chrome and its profile behind when a script throws before close().
  const cleanup = () => { proc.kill(); rmSync(userDataDir, { recursive: true, force: true }); };
  process.once("exit", cleanup);
  const wsUrl = await new Promise((resolve, reject) => {
    let log = "";
    const fail = (message) => { clearTimeout(timer); reject(new Error(`${message}\n${log}`)); };
    const timer = setTimeout(() => fail("Chrome didn't open DevTools within 30s:"), 30000);
    const onData = (d) => {
      log += d;
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      // Stop collecting once ready; the stream keeps draining so Chrome never blocks on a full pipe.
      if (m) { clearTimeout(timer); proc.stderr.off("data", onData); proc.stderr.resume(); resolve(m[1]); }
    };
    proc.stderr.on("data", onData);
    proc.once("error", (e) => fail(`Couldn't start ${chrome}: ${e.message}. Set CHROME_PATH to a Chrome, Chromium, Edge or Brave binary.`));
    proc.once("exit", (code, signal) => fail(`Chrome exited (${code ?? signal}) before DevTools was ready:`));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else for (const fn of listeners) fn(msg);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { userAgent } = await send("Browser.getVersion");

  return {
    // width, height, dark: emulate prefers-color-scheme; reducedMotion; localStorage: { key: value } seeded before any page script runs.
    async newPage({ width = 1440, height = width < 768 ? 844 : 900, dark = false, reducedMotion = false, localStorage = {} } = {}) {
      // A window per page: background tabs are hidden, which pauses rAF and in-view effects.
      const { targetId } = await send("Target.createTarget", { url: "about:blank", newWindow: true });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      const cmd = (method, params) => send(method, params, sessionId);
      await cmd("Page.enable");
      await cmd("Network.enable");
      // Headless Chrome advertises "HeadlessChrome", which some sites block or serve differently.
      await cmd("Emulation.setUserAgentOverride", { userAgent: userAgent.replace("HeadlessChrome", "Chrome") });
      await cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await cmd("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-color-scheme", value: dark ? "dark" : "light" },
        { name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" },
      ] });
      if (Object.keys(localStorage).length) {
        await cmd("Page.addScriptToEvaluateOnNewDocument", {
          source: `try { for (const [k, v] of Object.entries(${JSON.stringify(localStorage)})) localStorage.setItem(k, v); } catch {}`,
        });
      }
      const page = {
        width, height,
        // Navigate, then wait for the load event and 500ms without network requests (60s cap).
        // Throws when the page fails to load or responds with an HTTP error.
        async goto(url, timeout = 60000) {
          const inflight = new Set();
          let loaded = false;
          let status;
          let lastActivity = Date.now();
          const onEvent = (msg) => {
            if (msg.sessionId !== sessionId) return;
            if (msg.method === "Page.loadEventFired") loaded = true;
            else if (msg.method === "Network.responseReceived" && msg.params.type === "Document" && status === undefined) status = msg.params.response.status;
            else if (msg.method === "Network.requestWillBeSent") inflight.add(msg.params.requestId);
            else if (msg.method === "Network.loadingFinished" || msg.method === "Network.loadingFailed") inflight.delete(msg.params.requestId);
            else return;
            lastActivity = Date.now();
          };
          listeners.add(onEvent);
          const { errorText } = await cmd("Page.navigate", { url });
          if (errorText) { listeners.delete(onEvent); throw new Error(`Failed to load ${url}: ${errorText}`); }
          const start = Date.now();
          while (Date.now() - start < timeout && !(loaded && inflight.size === 0 && Date.now() - lastActivity > 500)) {
            await new Promise((r) => setTimeout(r, 100));
          }
          listeners.delete(onEvent);
          if (status >= 400) throw new Error(`Failed to load ${url}: HTTP ${status}`);
          if (Date.now() - start >= timeout) {
            console.error(`warning: ${url} ${loaded ? `still had ${inflight.size} request(s) in flight` : "never fired load"} after ${timeout / 1000}s; measuring anyway`);
          }
        },
        // Run fn(arg) in the page and return its (awaited, JSON-serializable) result.
        async evaluate(fn, arg) {
          const { result, exceptionDetails } = await cmd("Runtime.evaluate", {
            expression: `(${fn})(${JSON.stringify(arg)})`, awaitPromise: true, returnByValue: true,
          });
          if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
          return result.value;
        },
        // PNG of the current viewport, as a Buffer.
        async screenshot() {
          const { data } = await cmd("Page.captureScreenshot", { format: "png" });
          return Buffer.from(data, "base64");
        },
        // Scroll through the whole page so lazy images load and in-view effects run, then return to the top.
        async scrollThrough(step = 500, pause = 100) {
          await page.evaluate(async ({ step, pause }) => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, pause)); }
            scrollTo(0, 0);
          }, { step, pause });
        },
        wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        close: () => send("Target.closeTarget", { targetId }),
      };
      return page;
    },
    async close() {
      ws.close();
      proc.kill();
      await new Promise((r) => (proc.exitCode !== null || proc.signalCode !== null ? r() : proc.once("exit", r)));
      process.off("exit", cleanup);
      rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

// Shared flag parsing: positional args plus --key=value / --flag.
export function parseArgs(argv = process.argv.slice(2)) {
  const flags = Object.fromEntries(argv.filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.length ? v.join("=") : true];
  }));
  return { positional: argv.filter((a) => !a.startsWith("--")), flags };
}

// Positional viewport width in px; a non-number usually means a flag was written as "--key value".
export const widthArg = (arg, fallback = 1440) => {
  const width = Number(arg ?? fallback);
  if (!Number.isInteger(width) || width <= 0) throw new Error(`Invalid width "${arg}": pass pixels, and write flags as --key=value (e.g. --json=out.json).`);
  return width;
};

// Exit with the script's usage line when required positional args are missing.
export const requireArgs = (values, usage) => {
  if (values.some((v) => !v)) { console.error(`Usage: ${usage}`); process.exit(1); }
};

// --storage=key=value seeds localStorage, e.g. --storage=theme=dark for enableSystem={false} sites.
export const storageFlag = (flags) => {
  if (typeof flags.storage !== "string") return {};
  const [k, ...v] = flags.storage.split("=");
  return { [k]: v.join("=") };
};
