/**
 * Isolated-world bridge: dispatches a request `CustomEvent` and resolves editor text from the MAIN-world listener
 * (`main-world.ts`) via a matching response event (same window).
 */

const REQ = "lc-meta-capture:req-code";
const RESP = "lc-meta-capture:resp-code";

/**
 * Asks the main-world script for the current Monaco model text.
 *
 * @param timeoutMs - How long to wait for a correlated response before resolving `undefined`.
 * @returns Editor buffer trimmed to non-empty string, or `undefined` on timeout / empty / missing bridge.
 */
export function captureCode(timeoutMs = 1500): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const cleanup = (): void => {
      window.clearTimeout(timer);
      window.removeEventListener(RESP, onResp);
    };

    const onResp = (ev: Event): void => {
      const e = ev as CustomEvent<{ reqId?: string; code?: string }>;
      if (e.detail?.reqId !== reqId) return;
      cleanup();
      const c = e.detail.code;
      resolve(typeof c === "string" && c.length > 0 ? c : undefined);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(undefined);
    }, timeoutMs);

    window.addEventListener(RESP, onResp);
    window.dispatchEvent(new CustomEvent(REQ, { detail: { reqId } }));
  });
}
