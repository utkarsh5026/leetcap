---
description: Draft a copy-paste git commit message from the current diff
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*)
argument-hint: optional paths or scope hint
---

Draft a **git commit message** the user will copy and paste. Do **not** run `git commit`, `git add`, or change git state.

## What to do

1. Run `git status -sb` and inspect changes with `git diff` and, if there are staged changes, `git diff --cached`.
2. If the user passed `$ARGUMENTS`, treat it as optional focus (paths, feature name, or ticket); weight those changes more heavily in the message.
3. Infer intent from the actual diff (this repo is **leetcap**—a browser extension / LeetCode-related tooling when relevant, but do not invent changes not shown in the diff).

## Message style

- **Subject**: imperative mood, ≤72 characters, no trailing period (e.g. `Fix popup layout on narrow viewports`).
- **Body** (optional): blank line after subject; explain _why_ if non-obvious, breaking changes, or follow-ups. Wrap prose around 72 columns.

Prefer [Conventional Commits](https://www.conventionalcommits.org/) when it fits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, etc.) with an optional scope (e.g. `fix(popup): …`).

## Output (strict)

- If there are **no** local changes, reply with one short sentence saying the working tree is clean—**no** fenced block.
- Otherwise output **exactly one** markdown fenced code block labeled `text` containing **only** the commit message (subject, blank line, optional body). **No** text before or after the fence—so the user can copy the block contents in one action.
