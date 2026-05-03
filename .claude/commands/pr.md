---
description: Draft a copy-paste GitHub PR title and body from current changes
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
argument-hint: optional base branch (default main)
---

Draft a **GitHub pull request** title and body the user will copy and paste. Do **not** open a PR or push branches unless explicitly asked.

## What to do

1. Inspect `git status -sb`, `git diff`, and `git diff --cached`. Use `git log --oneline -10` for recent context if helpful.
2. Base branch: if `$ARGUMENTS` names a branch (e.g. `main`, `master`), mention what you compared when relevant; otherwise assume the diff is the full change set to ship.

## Content

- **Title**: ≤72 characters, imperative, Conventional-Commit style optional (e.g. `feat(content): harden submission metadata parsing`).
- **Body**: summary of changes, **test plan** (how you verified: `bun run typecheck`, manual steps on leetcode.com, etc.), risks/follow-ups, breaking changes if any.

## Output (strict)

- If there are **no** changes, one short sentence — no fenced block.
- Otherwise output **exactly one** markdown fenced code block labeled `markdown` containing:
  - First line: PR title (no `#` heading).
  - Blank line.
  - Rest: PR body in GitHub-flavored markdown (use `##` sections for Test plan / Notes if useful).
- **No** commentary outside the fence.
