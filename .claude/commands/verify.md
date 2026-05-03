---
description: Run typecheck and production build; report or fix failures
allowed-tools: Bash(bun run typecheck:*), Bash(bun run build:*), Read, Grep, Glob
argument-hint: optional focus (e.g. file or area)
---

Run **leetcap** quality checks from the repository root.

## Steps

1. Run `bun run typecheck` then `bun run build`. If the first fails, still attempt the second only if useful for extra signal (otherwise stop after typecheck).
2. If `$ARGUMENTS` is set, prioritize issues touching that path or topic when summarizing or fixing.

## Outcome

- Print a short **summary**: pass/fail per step, key errors (file:line when available).
- If anything failed: either **fix the code** until both pass (preferred when fixes are local and obvious) **or** list concrete next steps if blocked (missing deps, env, etc.).
- Do not change unrelated code or bump `manifest.json` version unless the user’s arguments explicitly ask for it.
