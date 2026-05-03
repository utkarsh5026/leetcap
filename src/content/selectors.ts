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

/** One keyed entry in {@link SELECTORS}: CSS selector, human note, and last manual verification date. */
export interface SelectorEntry {
  readonly selector: string;
  readonly note: string;
  readonly testedOn: string;
}

/** Central registry of DOM probes; keys are referenced by `capture.ts` and surfaced in logs/UI when edits are needed. */
export const SELECTORS = {
  problemTitle: {
    selector:
      'div[class*="text-title-large"] a[href^="/problems/"], a[href^="/problems/"][class*="text-title"]',
    note: "Problem title link in the description pane header — text like '1. Two Sum'. First branch matches today's UI (text-title-large is on the wrapper div); second branch is a fallback if LC ever moves the class onto the <a>.",
    testedOn: "2026-05-03",
  },

  difficultyBadge: {
    selector: 'div[class*="text-difficulty-"]',
    note: "Difficulty label near the title; LeetCode uses color-coded classes per difficulty.",
    testedOn: "2026-05-03",
  },

  topicTag: {
    selector: 'a[href^="/tag/"]',
    note: "Individual topic tag link. Tags live in the (collapsed-by-default) 'Topics' section but the <a> nodes are always in the DOM, so no container selector is needed.",
    testedOn: "2026-05-03",
  },

  descriptionContainer: {
    selector: 'div[data-track-load="description_content"]',
    note: "Problem description body. Contains the prose, examples, and constraints list.",
    testedOn: "2026-05-03",
  },

  acceptedIndicator: {
    selector: 'span[data-e2e-locator="submission-result"]',
    note: "Span whose text reads 'Accepted' on a successful submission. Anchors the entire submission panel; capture.ts walks up from this to find the panel root and locate the metric cards.",
    testedOn: "2026-05-03",
  },

  runtimeMetricIcon: {
    selector: 'svg[data-icon="clock"]',
    note: "Anchor for the Runtime card on the Accepted submission view (FontAwesome clock icon). LC stopped emitting data-e2e-locator on the value/percentile rows in the 2026 redesign, so capture.ts walks up from this icon to find the card and extracts the spans by text shape.",
    testedOn: "2026-05-03",
  },

  memoryMetricIcon: {
    selector: 'svg[data-icon="microchip"]',
    note: "Anchor for the Memory card on the Accepted submission view (FontAwesome microchip icon). Same walk-up pattern as runtimeMetricIcon.",
    testedOn: "2026-05-03",
  },

  languageSelector: {
    selector: 'button[aria-haspopup="dialog"]',
    note: "Language picker button in the editor toolbar (a Radix Dialog trigger as of 2026; its text is the active language, e.g. 'Java'). The page has other dialog-trigger buttons (share, etc.); captureLanguage() filters by a language-name regex to pick the right one.",
    testedOn: "2026-05-03",
  },
} as const satisfies Record<string, SelectorEntry>;

/** Union of registry keys (used to type `queryText` / failure diagnostics). */
export type SelectorKey = keyof typeof SELECTORS;
