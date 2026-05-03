/**
 * All LeetCode DOM selectors live here. When the LeetCode interface changes,
 * this is the only file that should need editing.
 *
 * Selector preference, in order:
 *   1. data-* attributes (most stable)
 *   2. aria-* attributes
 *   3. semantic-looking stable class names (e.g. `text-difficulty-medium`)
 *   4. structural CSS as a last resort
 *
 * Hard rules:
 *   - Never use Tailwind utility classes — they change between deploys.
 *   - Never use :nth-child — breaks for trivial reordering.
 *   - When you change a selector, update its `testedOn` date.
 *
 * The selectors below are seeded from the LeetCode UI as of the testedOn date.
 * They are best-effort starting points; expect to update them when the UI shifts.
 */

export interface SelectorEntry {
  readonly selector: string;
  readonly note: string;
  readonly testedOn: string;
}

export const SELECTORS = {
  problemTitle: {
    selector:
      'a[href^="/problems/"][class*="text-title"], div[data-cy="question-title"]',
    note: "Problem title link in the description pane header — text like '42. Trapping Rain Water'.",
    testedOn: "2026-05-03",
  },

  difficultyBadge: {
    selector: 'div[class*="text-difficulty-"]',
    note: "Difficulty label near the title; LeetCode uses color-coded classes per difficulty.",
    testedOn: "2026-05-03",
  },

  topicsContainer: {
    selector: 'div[class*="topic-tag"]',
    note: "Container holding topic tag chips. Often only visible after expanding 'Topics'.",
    testedOn: "2026-05-03",
  },

  topicTag: {
    selector: 'a[href^="/tag/"]',
    note: "Individual topic tag link.",
    testedOn: "2026-05-03",
  },

  descriptionContainer: {
    selector: 'div[data-track-load="description_content"]',
    note: "Problem description body. Contains the prose, examples, and constraints list.",
    testedOn: "2026-05-03",
  },

  submissionResult: {
    selector: 'div[data-e2e-locator="submission-result"]',
    note: "The whole result panel that appears after submitting.",
    testedOn: "2026-05-03",
  },

  acceptedIndicator: {
    selector: 'span[data-e2e-locator="submission-result"]',
    note: "Element whose text reads 'Accepted' on a successful submission.",
    testedOn: "2026-05-03",
  },

  runtimeValue: {
    selector: '[data-e2e-locator="runtime-value"]',
    note: "Numeric runtime value (e.g. '52 ms').",
    testedOn: "2026-05-03",
  },

  runtimePercentile: {
    selector: '[data-e2e-locator="runtime-percentile"]',
    note: "Runtime percentile (e.g. 'Beats 87.30%'). Loads asynchronously after the value.",
    testedOn: "2026-05-03",
  },

  memoryValue: {
    selector: '[data-e2e-locator="memory-value"]',
    note: "Numeric memory value (e.g. '16.8 MB').",
    testedOn: "2026-05-03",
  },

  memoryPercentile: {
    selector: '[data-e2e-locator="memory-percentile"]',
    note: "Memory percentile (e.g. 'Beats 64.10%').",
    testedOn: "2026-05-03",
  },

  languageSelector: {
    selector: 'button[aria-haspopup="dialog"][class*="text-label-2"], button[aria-haspopup="listbox"]',
    note: "Language picker button in the editor toolbar; its text is the active language.",
    testedOn: "2026-05-03",
  },
} as const satisfies Record<string, SelectorEntry>;

export type SelectorKey = keyof typeof SELECTORS;
