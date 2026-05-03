import { capture } from "./capture";
import { mountPanel } from "./panel";
import { SELECTORS } from "./selectors";

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

function percentilesReady(): boolean {
  // Capture should wait until the percentile values are populated. They appear
  // a beat after the runtime/memory numbers themselves.
  const rp = document.querySelector(SELECTORS.runtimePercentile.selector);
  const mp = document.querySelector(SELECTORS.memoryPercentile.selector);
  const rpText = rp?.textContent?.trim();
  const mpText = mp?.textContent?.trim();
  return !!rpText && !!mpText && /\d/.test(rpText) && /\d/.test(mpText);
}

async function waitFor(predicate: () => boolean, attempts = 20, intervalMs = 250): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) return true;
    await new Promise((r) => window.setTimeout(r, intervalMs));
  }
  return false;
}

async function handleAccepted(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const ready = await waitFor(percentilesReady);
    if (!ready) {
      console.warn(LOG_PREFIX, "percentiles did not populate within the wait window; capturing anyway");
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

// LeetCode is an SPA, so the content script only loads once. We patch history
// methods to detect SPA navigation and re-install the observer per problem.
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

function installMessageHandler(): void {
  // The popup queries the active tab for the current problem context. We respond
  // with whatever capture() can pull from the page right now — on a problem page
  // without a submission, that means title/topics/language but no runtime/memory.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && typeof msg === "object" && (msg as { type?: string }).type === "lc-meta-capture/getCurrent") {
      sendResponse(capture());
      return false;
    }
    return false;
  });
}

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
