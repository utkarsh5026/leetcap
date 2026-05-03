---
description: MV3 extension review — security, permissions, fragile DOM capture
allowed-tools: Read, Grep, Glob
argument-hint: optional paths or focus (e.g. content/, popup)
---

Perform a **focused code review** for **leetcap**: a Manifest V3 Chrome extension that captures LeetCode submission metadata and copies formatted text (see `package.json` / `manifest.json`).

## Review dimensions

1. **Extension surface**: `manifest.json` — permissions, `host_permissions`, content script `matches` / `run_at`, service worker vs expectations, paths to built assets.
2. **Security & privacy**: least privilege, no unnecessary hosts, clipboard usage, no exfiltration, no eval / dynamic code from untrusted input.
3. **Reliability**: DOM selectors and parsing (`src/content/`); what breaks if LeetCode changes layout; error handling and user-visible failures.
4. **TypeScript & structure**: clear boundaries between content, background, popup; avoid duplicated logic; types for parsed payloads.
5. **UX**: popup and capture flow; empty states; feedback when copy fails.

If `$ARGUMENTS` names files or directories, center the review there; otherwise cover the whole `src/` and `manifest.json`.

## Output format

- **Blocking** — must fix before merge (with file refs).
- **Should fix** — important improvements.
- **Nice to have** — polish.

End with a one-paragraph **risk summary** (e.g. selector fragility, permission creep). Be specific; avoid generic platitudes.
