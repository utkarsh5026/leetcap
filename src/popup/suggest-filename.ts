import type { CapturedData } from "../content/types";

/**
 * Builds human-readable suggested save names for the toolbar popup from {@link CapturedData} fields (no filesystem access).
 */

/**
 * How to combine optional LeetCode problem number, slug, and file extension for a suggested save name.
 *
 * - **kebab** variants use hyphen separators and the URL slug when available (e.g. `two-sum`).
 * - **snake** variants use underscores (`two_sum`).
 * - **padded** uses a 4-digit number (`0001`); **plain** uses the integer as-is (`1`).
 * - **slug-only** omits the number entirely.
 *
 * When no problem number is known, the numeric prefix is omitted: `*-kebab` matches `slug-only`; `*-snake` uses the same slug with hyphens replaced by underscores (so it can differ from `slug-only`).
 */
export type FilenameConvention =
  | "padded-kebab"
  | "plain-kebab"
  | "slug-only"
  | "padded-snake"
  | "plain-snake";

/**
 * Options shown in the popup `<select>`; `label` values use `.ext` as a stand-in for the real extension from the current language.
 */
export const FILENAME_CONVENTIONS: ReadonlyArray<{
  value: FilenameConvention;
  label: string;
}> = [
  { value: "padded-kebab", label: "0001-two-sum.ext" },
  { value: "plain-kebab", label: "1-two-sum.ext" },
  { value: "slug-only", label: "two-sum.ext" },
  { value: "padded-snake", label: "0001_two_sum.ext" },
  { value: "plain-snake", label: "1_two_sum.ext" },
];

/** Parses a leading `123. ` prefix as used in LeetCode problem titles; returns `undefined` if absent or invalid. */
function parseNumberFromTitle(title: string): number | undefined {
  const m = title.trim().match(/^(\d+)\.\s*/);
  if (!m?.[1]) return undefined;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

function urlSlug(problemUrl: string): string | undefined {
  const m = problemUrl.match(/\/problems\/([^/?#]+)/);
  const s = m?.[1]?.trim();
  return s && s.length > 0 ? s : undefined;
}

function titleWithoutLeadingNumber(title: string): string {
  return title.replace(/^\d+\.\s*/, "").trim();
}

/**
 * Builds a kebab-case slug from the human-readable title when the URL slug cannot be used (non-alphanumeric → `-`, collapsed).
 */
function kebabFromReadableTitle(title: string): string {
  const base = titleWithoutLeadingNumber(title);
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/** Prefers the canonical `/problems/<slug>/` segment; otherwise derives kebab-case from `problemTitle`. */
function kebabSlug(data: Pick<CapturedData, "problemTitle" | "problemUrl">): string {
  const fromUrl = urlSlug(data.problemUrl);
  if (fromUrl) return fromUrl;
  return kebabFromReadableTitle(data.problemTitle);
}

function kebabToSnake(kebab: string): string {
  return kebab.replace(/-/g, "_");
}

/**
 * Maps LeetCode’s language picker label to a file extension (lowercased, whitespace stripped).
 *
 * @returns Known languages get their usual suffix; missing or unknown language yields `.txt`.
 */
function languageToExtension(language: string | undefined): string {
  if (!language) return ".txt";
  const key = language.trim().toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    python: ".py",
    python3: ".py",
    javascript: ".js",
    typescript: ".ts",
    java: ".java",
    "c++": ".cpp",
    cpp: ".cpp",
    "c#": ".cs",
    csharp: ".cs",
    c: ".c",
    go: ".go",
    rust: ".rs",
    ruby: ".rb",
    swift: ".swift",
    kotlin: ".kt",
    scala: ".scala",
    php: ".php",
    sql: ".sql",
    mysql: ".sql",
    dart: ".dart",
    elixir: ".ex",
    erlang: ".erl",
    racket: ".rkt",
  };
  return map[key] ?? ".txt";
}

/** Uses `problemNumber` from capture when set; otherwise parses the leading `N. ` form from `problemTitle`. */
function problemNumber(
  data: Pick<CapturedData, "problemTitle" | "problemNumber">,
): number | undefined {
  if (data.problemNumber !== undefined) return data.problemNumber;
  return parseNumberFromTitle(data.problemTitle);
}

/**
 * Produces a single-line filename string for pasting into an editor or file dialog, using capture fields from the active LeetCode tab.
 *
 * Slug source: URL path segment first, then title-derived kebab-case. Extension follows `language` when recognized, else `.txt`.
 * If no number is available, `*-kebab` patterns match `slug-only`; `*-snake` patterns use only the underscore slug (see {@link FilenameConvention}).
 *
 * @param data - Subset of {@link CapturedData} required for naming; `problemUrl` and `problemTitle` must match the page LeetCode shows.
 * @param convention - Which separator style and number formatting to apply.
 * @returns A filename including extension (e.g. `0001-two-sum.py`), safe for display/copy — not a validated OS path.
 */
export function suggestedFilename(
  data: Pick<CapturedData, "problemTitle" | "problemUrl" | "problemNumber" | "language">,
  convention: FilenameConvention,
): string {
  const kebab = kebabSlug(data);
  const snake = kebabToSnake(kebab);
  const ext = languageToExtension(data.language);
  const num = problemNumber(data);

  const padded = num !== undefined ? String(num).padStart(4, "0") : undefined;
  const plain = num;

  switch (convention) {
    case "slug-only":
      return `${kebab}${ext}`;
    case "padded-kebab":
      return padded !== undefined ? `${padded}-${kebab}${ext}` : `${kebab}${ext}`;
    case "plain-kebab":
      return plain !== undefined ? `${plain}-${kebab}${ext}` : `${kebab}${ext}`;
    case "padded-snake":
      return padded !== undefined ? `${padded}_${snake}${ext}` : `${snake}${ext}`;
    case "plain-snake":
      return plain !== undefined ? `${plain}_${snake}${ext}` : `${snake}${ext}`;
    default: {
      const _exhaustive: never = convention;
      return _exhaustive;
    }
  }
}
