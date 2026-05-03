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

interface FieldRowOptions {
  rowClassName?: string | undefined;
  valueClassName?: string | undefined;
  valueNode?: HTMLElement | undefined;
}

function fieldRow(
  label: string,
  value: string | undefined,
  options: FieldRowOptions = {},
): HTMLDivElement {
  const rowClass = options.rowClassName
    ? `lc-meta-capture-row ${options.rowClassName}`
    : "lc-meta-capture-row";
  const row = el("div", rowClass);
  row.appendChild(el("div", "lc-meta-capture-label", label));
  const valueClass = options.valueClassName
    ? `lc-meta-capture-value ${options.valueClassName}`
    : "lc-meta-capture-value";
  const valueWrap = el("div", valueClass);
  if (options.valueNode) {
    valueWrap.appendChild(options.valueNode);
  } else if (value === undefined || value === "") {
    valueWrap.className = `${valueWrap.className} lc-meta-capture-missing`;
    valueWrap.textContent = "not captured";
  } else {
    valueWrap.textContent = value;
  }
  row.appendChild(valueWrap);
  return row;
}

function difficultyBadge(
  difficulty: CapturedData["difficulty"] | undefined,
): HTMLElement | undefined {
  if (!difficulty) return undefined;
  const tone = difficulty.toLowerCase();
  return el("span", `lc-meta-capture-badge lc-meta-capture-badge--${tone}`, difficulty);
}

function topicsNode(topics: string[] | undefined): HTMLElement | undefined {
  if (!topics || topics.length === 0) return undefined;
  const tags = el("div", "lc-meta-capture-tags");
  for (const topic of topics) {
    tags.appendChild(el("span", "lc-meta-capture-tag", topic));
  }
  return tags;
}

function relativeTimeLabel(input: Date): string {
  const diffMs = Date.now() - input.getTime();
  const past = diffMs >= 0;
  const absMs = Math.abs(diffMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (absMs < minuteMs) return "just now";
  if (absMs < hourMs) {
    const mins = Math.round(absMs / minuteMs);
    return `${mins}m ${past ? "ago" : "from now"}`;
  }
  if (absMs < dayMs) {
    const hours = Math.round(absMs / hourMs);
    return `${hours}h ${past ? "ago" : "from now"}`;
  }
  const days = Math.round(absMs / dayMs);
  return `${days}d ${past ? "ago" : "from now"}`;
}

function capturedAtNode(capturedAt: string): HTMLElement {
  const wrap = el("div", "lc-meta-capture-captured-at");
  const parsed = new Date(capturedAt);
  if (Number.isNaN(parsed.getTime())) {
    wrap.appendChild(el("div", "lc-meta-capture-captured-at-primary", capturedAt));
    return wrap;
  }
  wrap.appendChild(
    el(
      "div",
      "lc-meta-capture-captured-at-primary",
      parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ),
  );
  wrap.appendChild(
    el(
      "div",
      "lc-meta-capture-captured-at-secondary",
      `${parsed.toLocaleDateString()} • ${relativeTimeLabel(parsed)}`,
    ),
  );
  return wrap;
}

/** Success layout plus a copy button that awaits {@link captureCode}, writes the clipboard, and arms auto-dismiss. */
function renderOk(data: CapturedData): { body: HTMLElement; footer: HTMLElement } {
  const body = el("div", "lc-meta-capture-body");

  body.appendChild(fieldRow("Title", data.problemTitle));
  body.appendChild(fieldRow("Number", data.problemNumber?.toString()));
  body.appendChild(
    fieldRow("Url", data.problemUrl, { valueClassName: "lc-meta-capture-value--mono" }),
  );
  body.appendChild(
    fieldRow("Difficulty", data.difficulty, {
      rowClassName: "lc-meta-capture-row--emphasis",
      valueNode: difficultyBadge(data.difficulty),
    }),
  );
  body.appendChild(
    fieldRow("Topics", undefined, {
      rowClassName: "lc-meta-capture-row--emphasis",
      valueNode: topicsNode(data.topics),
    }),
  );
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
  body.appendChild(
    fieldRow("Captured at", data.capturedAt, {
      valueNode: capturedAtNode(data.capturedAt),
      valueClassName: "lc-meta-capture-value--mono",
    }),
  );

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
