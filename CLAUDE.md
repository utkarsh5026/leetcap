# leetcap

Personal Chrome extension (MV3, TypeScript, Vite) that captures metadata from accepted LeetCode submissions and copies a language-idiomatic comment block plus the live editor source to the clipboard. The user pastes into a solution file in their practice repo; a downstream analysis tool reads it.

## Non-negotiable design constraints

These came from the original spec. Do not relax them without explicit instruction.

- **No filesystem write, no GitHub API, no external server.** The only side effect is `navigator.clipboard.writeText`. The hand-paste is intentional — that is where the user exercises judgment.
- **Code on copy only.** Metadata is captured from the DOM when the submission is Accepted. The solution source is read from the live Monaco editor (main-world bridge) only when the user clicks Copy, then concatenated below the comment block. Nothing is written to disk or sent to a server.
- **No auto-copy.** Floating panel + explicit copy button, so rapid resubmissions don't clobber the clipboard.
- **All DOM selectors live in [src/content/selectors.ts](src/content/selectors.ts).** When LeetCode redesigns, that is the only file that should need editing. Each entry has a `testedOn` date — update it when you change the selector.
- **Capture only on Accepted.** Wrong answer / TLE / runtime error / compile error → do nothing.
- **Wait for percentiles to populate** before capture (they appear a beat after the runtime/memory numbers).
- **Partial capture is valid.** Only fail hard when `problemTitle` or `problemUrl` are missing. Optional fields render as italic "not captured" in the panel.
- **Permissions stay minimal:** `clipboardWrite` + host `https://leetcode.com/*`. Do not add `tabs`, `storage`, or `activeTab` unless a feature genuinely requires it.
- **Strict TS:** `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`. Don't loosen these.

## Layout

```
manifest.json                   # MV3, two content scripts: isolated + world MAIN (Monaco bridge)
vite.config.ts                  # @crxjs/vite-plugin
src/
  content/
    index.ts                    # MutationObserver, SPA-nav handling, message handler
    main-world.ts               # MAIN world: reads monaco.editor.getModels(), answers req-code events
    code-bridge.ts              # isolated: captureCode() via CustomEvent to main-world
    selectors.ts                # ALL DOM selectors, dated
    capture.ts                  # DOM → CapturedData
    panel.ts                    # floating in-page panel
    formatter.ts                # CapturedData → language-idiomatic comment block; formatWithCode appends editor text
    types.ts                    # CapturedData, CaptureResult
  popup/
    index.html                  # toolbar popup (title/difficulty/tags/language)
    popup.ts                    # queries active tab via chrome.tabs.sendMessage
    popup.css                   # dark minimal, Source Code Pro
  background/
    index.ts                    # intentionally empty — clipboard works from content script
  styles/
    panel.css                   # in-page panel styles, lc-meta-capture- prefixed
public/icons/{16,48,128}.png
```

## Three-file rule for new captured fields

Adding a field to the capture/output requires touching exactly three files, in this order:

1. [src/content/types.ts](src/content/types.ts) — add the optional field to `CapturedData`.
2. [src/content/capture.ts](src/content/capture.ts) — extract it from the DOM (use the `safe()` helper, never throw on optionals).
3. [src/content/formatter.ts](src/content/formatter.ts) — emit a line inside `metadataContentLines`; **skip the line entirely** when the value is `undefined` (never emit `Field: undefined`).

If the value comes from Monaco or page JS instead of the DOM, add a fourth touch point (e.g. [src/content/main-world.ts](src/content/main-world.ts) / [src/content/code-bridge.ts](src/content/code-bridge.ts)) and document it in the PR.

If the popup should also surface the field, add a row in [src/popup/index.html](src/popup/index.html) and wire it in [src/popup/popup.ts](src/popup/popup.ts).

## How the pieces talk

- Content script auto-runs on `https://leetcode.com/problems/*`. It installs a `MutationObserver` and patches `history.pushState`/`replaceState` to handle SPA navigation (LeetCode never reloads between problems).
- On Accepted: waits up to ~5s for percentiles, then `capture()` → `mountPanel(result)`.
- Popup: `chrome.tabs.sendMessage(tabId, { type: "lc-meta-capture/getCurrent" })` → content script responds with the same `CaptureResult` shape. On a problem page without a submission, runtime/memory will be undefined.

## Comment style (formatter)

Language-idiomatic wrapper around the same metadata lines: Python module `"""…"""` (falls back to `#` if the body contains both triple-quote kinds), Ruby `=begin` / `=end`, SQL/MySQL `/* … */`, Go and unknown languages `//` lines, JavaScript/TypeScript/Java/C/C++/C#/Swift/Kotlin/Scala/PHP/Dart/Rust (and other C-family-style langs in capture) use a `/** … */` block with `*` line prefixes.

## Build / verify

```sh
bun install
bun run typecheck      # tsc --noEmit; must be clean
bun run build          # produces dist/
```

Load `dist/` via `chrome://extensions → Developer mode → Load unpacked`. Reload after every rebuild.

End-to-end check requires an actual LeetCode submission — the build does not validate selectors. When in doubt, open the in-page panel and look for "not captured" markers; they tell you which selector keys to update in [src/content/selectors.ts](src/content/selectors.ts).

## Style

- Default to no comments. Only comment WHY something non-obvious is the way it is (e.g. why the background worker is empty, why the panel auto-dismiss only fires after a successful copy). The TS types already say WHAT.
- Avoid clever code in `capture.ts` and `formatter.ts` — these get debugged at 3 a.m. after a LeetCode redesign. Boring beats clever.
- No dependency injection, event bus, or state library. This is a content script that captures data and shows a panel.
