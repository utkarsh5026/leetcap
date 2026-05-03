/** Difficulty label normalized from the badge DOM text (substring match in capture). */
export type Difficulty = "Easy" | "Medium" | "Hard";

/**
 * Snapshot of problem + submission context read from the LeetCode DOM (and optional Monaco via a separate path).
 *
 * Required fields are the minimum for a successful capture; everything else is best-effort and may be absent
 * before an Accepted submission or if selectors drift.
 */
export interface CapturedData {
  /** Title string from the problem header (often `N. Problem Name` when LeetCode includes the number). */
  problemTitle: string;
  /** Full `window.location.href` while on a `/problems/...` page. */
  problemUrl: string;
  /** ISO timestamp when this object was built (not LeetCode server time). */
  capturedAt: string;

  /** Leading index from the title (`1. Two Sum`) when parseable; omitted if the title has no numeric prefix. */
  problemNumber?: number;
  difficulty?: Difficulty;
  /** Distinct topic labels from `/tag/` links in the description area. */
  topics?: string[];
  /** Bullet lines under a “Constraints” heading in the description. */
  constraints?: string[];
  /** First paragraph of the description, used as a short blurb in the comment block. */
  summary?: string;
  /** Language name from the editor picker (e.g. `Python3`), used for comment style and optional tooling. */
  language?: string;
  /** Runtime from the Accepted submission card (milliseconds). */
  runtimeMs?: number;
  /** “Beats X%” percentile when present on the same card as runtime. */
  runtimePercentile?: number;
  /** Memory from the Accepted submission card (megabytes as shown by LeetCode). */
  memoryMb?: number;
  /** “Beats X%” percentile when present on the same card as memory. */
  memoryPercentile?: number;
}

/**
 * Outcome of a single `capture()` pass: either usable data or a hard failure listing missing required inputs.
 * As implemented, failures only occur when `problemTitle` and/or `problemUrl` cannot be resolved (partial capture does not fail).
 */
export type CaptureResult =
  | { kind: "ok"; data: CapturedData }
  | { kind: "failure"; missingSelectors: string[] };
