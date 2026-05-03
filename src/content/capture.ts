import { SELECTORS, type SelectorKey } from "./selectors";
import type { CaptureResult, CapturedData, Difficulty } from "./types";

/**
 * DOM → {@link CapturedData}: reads {@link SELECTORS} only (no Monaco). Optional submission metrics require an
 * Accepted panel in the DOM; `metricsReady` gates the observer until percentiles exist.
 */

const LOG_PREFIX = "[lc-meta-capture]";

/** Runs a selector-derived probe; on throw logs once and returns `undefined` so optional fields never fail capture. */
function safe<T>(fn: () => T | undefined): T | undefined {
  try {
    return fn();
  } catch (err) {
    console.warn(LOG_PREFIX, "selector probe threw:", err);
    return undefined;
  }
}

/** First matching element’s non-empty `textContent` for a registry selector, or `undefined`. */
function queryText(key: SelectorKey, root: ParentNode = document): string | undefined {
  const el = root.querySelector(SELECTORS[key].selector);
  const text = el?.textContent?.trim();
  return text && text.length > 0 ? text : undefined;
}

/** Preserves full title string; extracts `N` when the UI uses a `N. Rest` prefix. */
function parseTitleAndNumber(raw: string): { title: string; number?: number } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
  if (match && match[1] && match[2]) {
    return { title: trimmed, number: Number.parseInt(match[1], 10) };
  }
  return { title: trimmed };
}

/**
 * Maps badge copy to a fixed label via case-insensitive substring (`easy` / `medium` / `hard`).
 */
function parseDifficulty(raw: string | undefined): Difficulty | undefined {
  if (!raw) return undefined;
  const lc = raw.toLowerCase();
  if (lc.includes("easy")) return "Easy";
  if (lc.includes("medium")) return "Medium";
  if (lc.includes("hard")) return "Hard";
  return undefined;
}

function captureTopics(): string[] | undefined {
  const tags = Array.from(document.querySelectorAll(SELECTORS.topicTag.selector))
    .map((el) => el.textContent?.trim())
    .filter((t): t is string => !!t && t.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Finds a “Constraints” heading inside the description, then the following `<ul>`/`<ol>` (with a parent-sibling fallback).
 */
function captureConstraints(descRoot: Element): string[] | undefined {
  // Constraints are introduced by a heading-like element whose text is "Constraints:".
  // We search across common heading elements rather than relying on a structural index.
  const candidates = Array.from(descRoot.querySelectorAll("p, strong, h3, h4"));
  const heading = candidates.find((el) => /^constraints:?$/i.test(el.textContent?.trim() ?? ""));
  if (!heading) return undefined;

  // The list usually follows in the next sibling (a <ul>). Walk forward until we find one.
  let cursor: Element | null = heading.nextElementSibling;
  while (cursor && cursor.tagName !== "UL" && cursor.tagName !== "OL") {
    // Some LeetCode problems wrap the heading inside a <p>; check parent's siblings.
    cursor = cursor.nextElementSibling;
  }
  if (!cursor) {
    // Fallback: heading itself may be inside a <p>; try the parent's next sibling.
    const parentNext = heading.parentElement?.nextElementSibling ?? null;
    if (parentNext && (parentNext.tagName === "UL" || parentNext.tagName === "OL")) {
      cursor = parentNext;
    }
  }
  if (!cursor) return undefined;

  const items = Array.from(cursor.querySelectorAll("li"))
    .map((li) => li.textContent?.trim().replace(/\s+/g, " "))
    .filter((s): s is string => !!s && s.length > 0);
  return items.length > 0 ? items : undefined;
}

function captureSummary(descRoot: Element): string | undefined {
  const firstPara = descRoot.querySelector("p");
  const text = firstPara?.textContent?.trim().replace(/\s+/g, " ");
  return text && text.length > 0 ? text : undefined;
}

/**
 * Locates an ancestor of the Accepted chip that contains both runtime and memory metric icons (bounded walk).
 */
function getAcceptedPanelRoot(): Element | null {
  const indicator = document.querySelector(SELECTORS.acceptedIndicator.selector);
  if (!indicator) return null;
  // Walk up to the smallest ancestor that holds both metric cards. Cap the walk
  // so we never end up scanning the whole document if the panel layout changes.
  let node: Element | null = indicator;
  for (let i = 0; i < 12 && node; i++) {
    if (
      node.querySelector(SELECTORS.runtimeMetricIcon.selector) &&
      node.querySelector(SELECTORS.memoryMetricIcon.selector)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * From a metric card icon, walks up ancestors until sibling `span`s include a plain number and a `%` percentile.
 *
 * @returns Parsed floats for value and percentile, or both `undefined` if the card shape does not match.
 */
function captureMetric(
  panelRoot: Element,
  iconKey: "runtimeMetricIcon" | "memoryMetricIcon",
): { value: number | undefined; percentile: number | undefined } {
  const icon = panelRoot.querySelector(SELECTORS[iconKey].selector);
  if (!icon) return { value: undefined, percentile: undefined };
  // Walk up from the icon until the spans inside the ancestor include both a
  // plain-number value and a percentile. That ancestor is the metric card.
  let card: Element | null = icon;
  for (let i = 0; i < 8 && card; i++) {
    const spans = Array.from(card.querySelectorAll("span"));
    const valueSpan = spans.find((s) => /^-?\d+(\.\d+)?$/.test(s.textContent?.trim() ?? ""));
    const pctSpan = spans.find((s) => /^\d+(\.\d+)?%$/.test(s.textContent?.trim() ?? ""));
    if (valueSpan && pctSpan) {
      return {
        value: Number.parseFloat(valueSpan.textContent!.trim()),
        percentile: Number.parseFloat(pctSpan.textContent!.trim()),
      };
    }
    card = card.parentElement;
  }
  return { value: undefined, percentile: undefined };
}

/**
 * `true` when both runtime and memory cards expose a numeric value and a percentile (used to delay capture until UI settles).
 */
export function metricsReady(): boolean {
  const root = getAcceptedPanelRoot();
  if (!root) return false;
  const r = captureMetric(root, "runtimeMetricIcon");
  const m = captureMetric(root, "memoryMetricIcon");
  return (
    r.value !== undefined &&
    r.percentile !== undefined &&
    m.value !== undefined &&
    m.percentile !== undefined
  );
}

/** Picks the dialog-trigger button whose label matches a strict known-language regex (avoids share/settings buttons). */
function captureLanguage(): string | undefined {
  // The language picker button's text is the current language. The page also has
  // other dialog-trigger buttons (share, etc.); we disambiguate by matching the
  // text against a known-language regex rather than guessing on the first match —
  // a wrong language would silently produce wrong comment markers downstream.
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(SELECTORS.languageSelector.selector),
  );
  const langPattern =
    /^(python3?|javascript|typescript|java|c\+\+|c#|c|go|rust|ruby|swift|kotlin|scala|php|sql|mysql|elixir|erlang|racket|dart)$/i;
  for (const btn of buttons) {
    const txt = btn.textContent?.trim();
    if (txt && langPattern.test(txt)) return txt;
  }
  return undefined;
}

/**
 * Builds a {@link CaptureResult} from the current document. Title may be recovered via slug-link fallback; URL must stay on `leetcode.com/problems/`.
 *
 * Runtime/memory/percentiles appear only when the Accepted submission panel is present; other fields remain optional on the ok branch.
 */
export function capture(): CaptureResult {
  const missing: string[] = [];

  let titleRaw = queryText("problemTitle");
  if (!titleRaw) {
    const slug = window.location.pathname.match(/\/problems\/([^/]+)/)?.[1];
    if (slug) {
      const link = document.querySelector(`a[href="/problems/${slug}/"]`);
      const txt = link?.textContent?.trim();
      if (txt && /^\d+\.\s/.test(txt)) titleRaw = txt;
    }
  }
  const url = window.location.href;

  if (!titleRaw) missing.push("problemTitle");
  if (!url || !url.startsWith("https://leetcode.com/problems/")) {
    missing.push("problemUrl");
  }
  if (missing.length > 0) {
    return { kind: "failure", missingSelectors: missing };
  }

  const { title, number } = parseTitleAndNumber(titleRaw!);

  const difficulty = safe(() => parseDifficulty(queryText("difficultyBadge")));
  const topics = safe(captureTopics);

  const descRoot = document.querySelector(SELECTORS.descriptionContainer.selector);
  const constraints = descRoot ? safe(() => captureConstraints(descRoot)) : undefined;
  const summary = descRoot ? safe(() => captureSummary(descRoot)) : undefined;

  const language = safe(captureLanguage);

  const panelRoot = getAcceptedPanelRoot();
  const runtime = panelRoot ? safe(() => captureMetric(panelRoot, "runtimeMetricIcon")) : undefined;
  const memory = panelRoot ? safe(() => captureMetric(panelRoot, "memoryMetricIcon")) : undefined;

  const runtimeMs = runtime?.value;
  const runtimePercentile = runtime?.percentile;
  const memoryMb = memory?.value;
  const memoryPercentile = memory?.percentile;

  const data: CapturedData = {
    problemTitle: title,
    problemUrl: url,
    capturedAt: new Date().toISOString(),
    ...(number !== undefined ? { problemNumber: number } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(topics !== undefined ? { topics } : {}),
    ...(constraints !== undefined ? { constraints } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(language !== undefined ? { language } : {}),
    ...(runtimeMs !== undefined ? { runtimeMs } : {}),
    ...(runtimePercentile !== undefined ? { runtimePercentile } : {}),
    ...(memoryMb !== undefined ? { memoryMb } : {}),
    ...(memoryPercentile !== undefined ? { memoryPercentile } : {}),
  };

  return { kind: "ok", data };
}
