import panelCss from "../styles/panel.css?inline";
import { captureCode } from "./code-bridge";
import { formatWithCode } from "./formatter";
import type { CaptureResult, CapturedData } from "./types";

/**
 * In-page floating UI after Accepted: injects scoped styles, renders capture rows, and copies `formatWithCode` output on demand.
 */

const ROOT_ID = "lc-meta-capture-root";
const STYLE_ID = "lc-meta-capture-style";
const LOG_PREFIX = "[lc-meta-capture]";

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = panelCss;
  document.head.appendChild(style);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fieldRow(label: string, value: string | undefined): HTMLDivElement {
  const row = el("div", "lc-meta-capture-row");
  row.appendChild(el("div", "lc-meta-capture-label", label));
  if (value === undefined || value === "") {
    row.appendChild(el("div", "lc-meta-capture-value lc-meta-capture-missing", "not captured"));
  } else {
    row.appendChild(el("div", "lc-meta-capture-value", value));
  }
  return row;
}

/** Success layout plus a copy button that awaits {@link captureCode}, writes the clipboard, and arms auto-dismiss. */
function renderOk(data: CapturedData): { body: HTMLElement; footer: HTMLElement } {
  const body = el("div", "lc-meta-capture-body");

  body.appendChild(fieldRow("Title", data.problemTitle));
  body.appendChild(fieldRow("Number", data.problemNumber?.toString()));
  body.appendChild(fieldRow("Url", data.problemUrl));
  body.appendChild(fieldRow("Difficulty", data.difficulty));
  body.appendChild(fieldRow("Topics", data.topics?.join(", ")));
  body.appendChild(fieldRow("Language", data.language));
  body.appendChild(
    fieldRow(
      "Runtime",
      data.runtimeMs !== undefined
        ? `${data.runtimeMs} ms${data.runtimePercentile !== undefined ? ` (beats ${data.runtimePercentile}%)` : ""}`
        : undefined,
    ),
  );
  body.appendChild(
    fieldRow(
      "Memory",
      data.memoryMb !== undefined
        ? `${data.memoryMb} MB${data.memoryPercentile !== undefined ? ` (beats ${data.memoryPercentile}%)` : ""}`
        : undefined,
    ),
  );
  body.appendChild(
    fieldRow(
      "Constraints",
      data.constraints && data.constraints.length > 0 ? data.constraints.join("\n") : undefined,
    ),
  );
  body.appendChild(fieldRow("Summary", data.summary));
  body.appendChild(fieldRow("Captured at", data.capturedAt));

  const footer = el("div", "lc-meta-capture-footer");
  const copyBtn = el("button", "lc-meta-capture-button", "Copy comment + code");
  let autoDismissTimer: number | undefined;
  copyBtn.addEventListener("click", async () => {
    const code = await captureCode();
    const text = formatWithCode(data, code);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = code !== undefined ? "Copied" : "Copied (code missing)";
      copyBtn.disabled = true;
      window.setTimeout(() => {
        copyBtn.textContent = "Copy comment + code";
        copyBtn.disabled = false;
      }, 1500);
      if (autoDismissTimer !== undefined) window.clearTimeout(autoDismissTimer);
      autoDismissTimer = window.setTimeout(dismissPanel, 10_000);
    } catch (err) {
      console.error(LOG_PREFIX, "clipboard write failed:", err);
      copyBtn.textContent = "Copy failed (see console)";
    }
  });
  footer.appendChild(copyBtn);

  return { body, footer };
}

/** Error layout listing missing gates; footer intentionally has no copy action. */
function renderFailure(missing: string[]): { body: HTMLElement; footer: HTMLElement } {
  const body = el("div", "lc-meta-capture-body");
  const err = el("div", "lc-meta-capture-error");
  err.appendChild(el("div", undefined, "Capture failed — required selectors did not match:"));
  const list = el("ul");
  for (const name of missing) {
    const li = el("li");
    li.textContent = name;
    list.appendChild(li);
  }
  err.appendChild(list);
  err.appendChild(el("div", undefined, "Edit src/content/selectors.ts to fix."));
  body.appendChild(err);

  const footer = el("div", "lc-meta-capture-footer");
  // No copy button on failure — partial garbage is worse than nothing.
  return { body, footer };
}

/** Removes the floating root if present (idempotent). */
export function dismissPanel(): void {
  document.getElementById(ROOT_ID)?.remove();
}

/**
 * Ensures inline CSS, replaces any prior panel, and appends a new root for `result` (ok vs failure chrome).
 */
export function mountPanel(result: CaptureResult): void {
  ensureStyle();
  // Idempotent: if a panel is already up (e.g. from a prior submission on the same
  // page), replace it rather than stacking.
  dismissPanel();

  const root = el("div", "lc-meta-capture-root");
  root.id = ROOT_ID;

  const header = el("div", "lc-meta-capture-header");
  header.appendChild(el("div", "lc-meta-capture-title", "LeetCode Metadata Capture"));
  const closeBtn = el("button", "lc-meta-capture-close", "×");
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", dismissPanel);
  header.appendChild(closeBtn);
  root.appendChild(header);

  const { body, footer } =
    result.kind === "ok" ? renderOk(result.data) : renderFailure(result.missingSelectors);

  root.appendChild(body);
  root.appendChild(footer);
  document.body.appendChild(root);
}
