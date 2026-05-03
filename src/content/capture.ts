import { SELECTORS, type SelectorKey } from "./selectors";
import type { CaptureResult, CapturedData, Difficulty } from "./types";

const LOG_PREFIX = "[lc-meta-capture]";

function safe<T>(fn: () => T | undefined): T | undefined {
  try {
    return fn();
  } catch (err) {
    console.warn(LOG_PREFIX, "selector probe threw:", err);
    return undefined;
  }
}

function queryText(key: SelectorKey, root: ParentNode = document): string | undefined {
  const el = root.querySelector(SELECTORS[key].selector);
  const text = el?.textContent?.trim();
  return text && text.length > 0 ? text : undefined;
}

function parseTitleAndNumber(raw: string): { title: string; number?: number } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
  if (match && match[1] && match[2]) {
    return { title: trimmed, number: Number.parseInt(match[1], 10) };
  }
  return { title: trimmed };
}

function parseDifficulty(raw: string | undefined): Difficulty | undefined {
  if (!raw) return undefined;
  const lc = raw.toLowerCase();
  if (lc.includes("easy")) return "Easy";
  if (lc.includes("medium")) return "Medium";
  if (lc.includes("hard")) return "Hard";
  return undefined;
}

function parseFloatOrUndef(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

function captureTopics(): string[] | undefined {
  const tags = Array.from(document.querySelectorAll(SELECTORS.topicTag.selector))
    .map((el) => el.textContent?.trim())
    .filter((t): t is string => !!t && t.length > 0);
  // De-dupe while preserving order; LeetCode sometimes duplicates tags across nav.
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

function captureConstraints(descRoot: Element): string[] | undefined {
  // Constraints are introduced by a heading-like element whose text is "Constraints:".
  // We search across common heading elements rather than relying on a structural index.
  const candidates = Array.from(
    descRoot.querySelectorAll("p, strong, h3, h4"),
  );
  const heading = candidates.find((el) =>
    /^constraints:?$/i.test(el.textContent?.trim() ?? ""),
  );
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

function captureLanguage(): string | undefined {
  // The language picker button's text is the current language. There may be multiple
  // listbox buttons in the page chrome; the editor's is the one whose text matches a
  // known language token, so we take the first match.
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(SELECTORS.languageSelector.selector),
  );
  const langPattern = /^(python3?|javascript|typescript|java|c\+\+|c#|c|go|rust|ruby|swift|kotlin|scala|php|sql|mysql|elixir|erlang|racket|dart)$/i;
  for (const btn of buttons) {
    const txt = btn.textContent?.trim();
    if (txt && langPattern.test(txt)) return txt;
  }
  // Fallback: take the first button's text if it's short and looks like a language word.
  const first = buttons[0]?.textContent?.trim();
  if (first && first.length > 0 && first.length < 20) return first;
  return undefined;
}

export function capture(): CaptureResult {
  const missing: string[] = [];

  const titleRaw = queryText("problemTitle");
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

  const runtimeMs = safe(() => parseFloatOrUndef(queryText("runtimeValue")));
  const runtimePercentile = safe(() => parseFloatOrUndef(queryText("runtimePercentile")));
  const memoryMb = safe(() => parseFloatOrUndef(queryText("memoryValue")));
  const memoryPercentile = safe(() => parseFloatOrUndef(queryText("memoryPercentile")));

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
