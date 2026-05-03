import type { CapturedData } from "./types";

const SUMMARY_MAX = 200;

function commentMarker(language: string | undefined): string {
  if (!language) return "//";
  const lc = language.toLowerCase();
  if (lc.startsWith("python") || lc === "ruby") return "#";
  if (lc === "sql" || lc === "mysql") return "--";
  return "//";
}

function truncateSummary(raw: string): string {
  const single = raw.replace(/\s+/g, " ").trim();
  if (single.length <= SUMMARY_MAX) return single;

  const window = single.slice(0, SUMMARY_MAX);
  // Prefer the last sentence boundary within the window.
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

export function format(data: CapturedData): string {
  const c = commentMarker(data.language);
  const lines: string[] = [];

  lines.push(`${c} LEETCODE METADATA`);

  const problemLine =
    data.problemNumber !== undefined && !/^\d+\.\s/.test(data.problemTitle)
      ? `${data.problemNumber}. ${data.problemTitle}`
      : data.problemTitle;
  lines.push(`${c} Problem: ${problemLine}`);
  lines.push(`${c} Url: ${data.problemUrl}`);

  if (data.difficulty) lines.push(`${c} Difficulty: ${data.difficulty}`);
  if (data.topics && data.topics.length > 0) {
    lines.push(`${c} Topics: ${data.topics.join(", ")}`);
  }
  lines.push(`${c} Submitted: ${data.capturedAt}`);
  if (data.language) lines.push(`${c} Language: ${data.language}`);
  if (data.runtimeMs !== undefined) {
    lines.push(`${c} Runtime: ${formatRuntime(data.runtimeMs, data.runtimePercentile)}`);
  }
  if (data.memoryMb !== undefined) {
    lines.push(`${c} Memory: ${formatMemory(data.memoryMb, data.memoryPercentile)}`);
  }
  if (data.constraints && data.constraints.length > 0) {
    lines.push(`${c} Constraints:`);
    for (const item of data.constraints) {
      lines.push(`${c}   ${item}`);
    }
  }
  if (data.summary) {
    lines.push(`${c} Summary: ${truncateSummary(data.summary)}`);
  }
  lines.push(`${c} END METADATA`);

  // Reflection block — always emitted, always blank. The user fills it in by hand;
  // it's the only manual data entry the system requires and the part where their
  // input is genuinely valuable (process information the DOM cannot reveal).
  lines.push(`${c}`);
  lines.push(`${c} REFLECTION`);
  lines.push(`${c} Time taken:`);
  lines.push(`${c} First instinct:`);
  lines.push(`${c} Changed approach:`);
  lines.push(`${c} Got stuck on:`);
  lines.push(`${c} END REFLECTION`);
  lines.push("");

  return lines.join("\n");
}
