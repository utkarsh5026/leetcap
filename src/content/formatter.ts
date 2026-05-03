import type { CapturedData } from "./types";

/**
 * Turns {@link CapturedData} into a language-appropriate metadata comment (and combines with editor code for clipboard export).
 */

const SUMMARY_MAX = 200;

function normalizeLang(language: string | undefined): string {
  if (!language) return "";
  return language.trim().toLowerCase();
}

function isJSDocFamily(lc: string): boolean {
  const set = new Set([
    "javascript",
    "typescript",
    "java",
    "c++",
    "cpp",
    "c#",
    "csharp",
    "c",
    "swift",
    "kotlin",
    "scala",
    "php",
    "dart",
    "rust",
    "elixir",
    "erlang",
    "racket",
  ]);
  return set.has(lc);
}

function lineCommentBlock(marker: string, lines: string[]): string {
  return lines.map((l) => (l === "" ? marker : `${marker} ${l}`)).join("\n");
}

function jsdocBlock(lines: string[]): string {
  const inner = lines.map((l) => (l === "" ? " *" : ` * ${l}`)).join("\n");
  return `/**\n${inner}\n */`;
}

/** Uses `"""` unless the body would break triple-quote balance; falls back to `'''` or `#` lines when both quote kinds appear in the body. */
function pythonDocstringBlock(body: string, lines: string[]): string {
  const hasTripleDouble = body.includes('"""');
  const hasTripleSingle = body.includes("'''");
  if (hasTripleDouble && hasTripleSingle) {
    return lineCommentBlock("#", lines);
  }
  if (hasTripleDouble) {
    return `'''\n${body}\n'''`;
  }
  return `"""\n${body}\n"""`;
}

/** Wraps metadata lines for the detected language (Python docstring, Ruby `=begin`, SQL block, JSDoc family, else `//`). */
function commentBlock(language: string | undefined, lines: string[]): string {
  const lc = normalizeLang(language);
  const body = lines.join("\n");

  if (lc.startsWith("python")) {
    return pythonDocstringBlock(body, lines);
  }
  if (lc === "ruby") {
    return `=begin\n${body}\n=end`;
  }
  if (lc === "sql" || lc === "mysql") {
    return `/*\n${body}\n*/`;
  }
  if (lc === "go") {
    return lineCommentBlock("//", lines);
  }
  if (isJSDocFamily(lc)) {
    return jsdocBlock(lines);
  }
  return lineCommentBlock("//", lines);
}

/** Collapses whitespace, caps length at `SUMMARY_MAX`, prefers ending on a sentence boundary past half the window, else adds an ellipsis. */
function truncateSummary(raw: string): string {
  const single = raw.replace(/\s+/g, " ").trim();
  if (single.length <= SUMMARY_MAX) return single;

  const window = single.slice(0, SUMMARY_MAX);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
  );
  if (sentenceEnd > SUMMARY_MAX * 0.5) {
    return single.slice(0, sentenceEnd + 1);
  }
  return window.trimEnd() + "…";
}

function formatRuntime(ms: number, percentile: number | undefined): string {
  const value = `${ms} ms`;
  return percentile !== undefined ? `${value} (beats ${percentile}%)` : value;
}

function formatMemory(mb: number, percentile: number | undefined): string {
  const value = `${mb} MB`;
  return percentile !== undefined ? `${value} (beats ${percentile}%)` : value;
}

/** Flat metadata + reflection template; omits lines for unset optional fields (never emits `undefined` text). */
function metadataContentLines(data: CapturedData): string[] {
  const lines: string[] = [];

  lines.push("LEETCODE METADATA");

  const problemLine =
    data.problemNumber !== undefined && !/^\d+\.\s/.test(data.problemTitle)
      ? `${data.problemNumber}. ${data.problemTitle}`
      : data.problemTitle;
  lines.push(`Problem: ${problemLine}`);
  lines.push(`Url: ${data.problemUrl}`);

  if (data.difficulty) lines.push(`Difficulty: ${data.difficulty}`);
  if (data.topics && data.topics.length > 0) {
    lines.push(`Topics: ${data.topics.join(", ")}`);
  }
  lines.push(`Submitted: ${data.capturedAt}`);
  if (data.language) lines.push(`Language: ${data.language}`);
  if (data.runtimeMs !== undefined) {
    lines.push(`Runtime: ${formatRuntime(data.runtimeMs, data.runtimePercentile)}`);
  }
  if (data.memoryMb !== undefined) {
    lines.push(`Memory: ${formatMemory(data.memoryMb, data.memoryPercentile)}`);
  }
  if (data.constraints && data.constraints.length > 0) {
    lines.push("Constraints:");
    for (const item of data.constraints) {
      lines.push(`  ${item}`);
    }
  }
  if (data.summary) {
    lines.push(`Summary: ${truncateSummary(data.summary)}`);
  }
  lines.push("END METADATA");
  return lines;
}

/** Metadata comment block only (trailing newline). */
export function format(data: CapturedData): string {
  return `${commentBlock(data.language, metadataContentLines(data))}\n`;
}

/**
 * Clipboard payload: formatted metadata plus trimmed editor source when present (blank line separator).
 * If `code` is empty/missing, returns the metadata block alone (still ends with a newline).
 */
export function formatWithCode(data: CapturedData, code: string | undefined): string {
  const block = format(data).replace(/\n+$/, "");
  const trimmed = code?.trim();
  if (trimmed && trimmed.length > 0) {
    return `${block}\n\n${trimmed}\n`;
  }
  return `${block}\n`;
}
