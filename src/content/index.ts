import { capture, metricsReady } from "./capture";
import { mountPanel } from "./panel";
import { SELECTORS } from "./selectors";

/**
 * Isolated-world content script: observes Accepted submissions, waits for metric UI, mounts the floating panel,
 * patches `history` for SPA route changes, and answers `lc-meta-capture/getCurrent` for the toolbar popup.
 */

const LOG_PREFIX = "[lc-meta-capture]";

let activeObserver: MutationObserver | undefined;
let lastHandledUrl: string | undefined;
let inFlight = false;

function isProblemPage(): boolean {
  return /^https:\/\/leetcode\.com\/problems\/[^/]+/.test(window.location.href);
}

function findAcceptedResult(): boolean {
  const node = document.querySelector(SELECTORS.acceptedIndicator.selector);
  const text = node?.textContent?.trim().toLowerCase();
  return text === "accepted";
}

/**
 * Polls `predicate` on a fixed interval until true or attempts exhausted (~`attempts * intervalMs` worst case).
 *
 * @returns Whether `predicate` became true before the cap.
 */
async function waitFor(
  predicate: () => boolean,
  attempts = 20,
  intervalMs = 250,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) return true;
    await new Promise((r) => window.setTimeout(r, intervalMs));
  }
  return false;
}

/** Debounced pipeline: wait for percentiles, `capture()`, then `mountPanel()` (logs ok/failure). */
async function handleAccepted(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const ready = await waitFor(metricsReady);
    if (!ready) {
      console.warn(LOG_PREFIX, "metrics did not populate within the wait window; capturing anyway");
    }
    const result = capture();
    mountPanel(result);
    if (result.kind === "ok") {
      console.info(LOG_PREFIX, "captured", result.data);
    } else {
      console.warn(LOG_PREFIX, "capture failed; missing:", result.missingSelectors);
    }
  } finally {
    inFlight = false;
  }
}

function installObserver(): void {
  if (activeObserver) return;
  if (!document.body) return;

  const observer = new MutationObserver(() => {
    if (!findAcceptedResult()) return;
    void handleAccepted();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  activeObserver = observer;
  console.info(LOG_PREFIX, "observer installed");
}

function teardown(): void {
  activeObserver?.disconnect();
  activeObserver = undefined;
}

function onUrlChange(): void {
  const url = window.location.href;
  if (url === lastHandledUrl) return;
  lastHandledUrl = url;
  teardown();
  if (isProblemPage()) {
    installObserver();
  }
}

/**
 * Wraps `pushState`/`replaceState` and listens to `popstate`, dispatching `lc-meta-capture:locationchange` so the observer rebinds per problem.
 */
function patchHistory(): void {
  const wrap = (key: "pushState" | "replaceState") => {
    const original = history[key].bind(history) as (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) => void;
    history[key] = function patched(data: unknown, unused: string, url?: string | URL | null) {
      original(data, unused, url ?? null);
      window.dispatchEvent(new Event("lc-meta-capture:locationchange"));
    } as History[typeof key];
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", () =>
    window.dispatchEvent(new Event("lc-meta-capture:locationchange")),
  );
  window.addEventListener("lc-meta-capture:locationchange", onUrlChange);
}

/** Handles `chrome.runtime` messages: `lc-meta-capture/getCurrent` responds synchronously with `capture()`. */
function installMessageHandler(): void {
  // The popup queries the active tab for the current problem context. We respond
  // with whatever capture() can pull from the page right now — on a problem page
  // without a submission, that means title/topics/language but no runtime/memory.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (
      msg &&
      typeof msg === "object" &&
      (msg as { type?: string }).type === "lc-meta-capture/getCurrent"
    ) {
      sendResponse(capture());
      return false;
    }
    return false;
  });
}

/** One-time wiring: history patches, message listener, initial URL handling. */
function boot(): void {
  patchHistory();
  installMessageHandler();
  onUrlChange();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
