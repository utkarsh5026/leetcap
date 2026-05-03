---
description: Add accurate JSDoc to a named TypeScript/JavaScript file
allowed-tools: Read, StrReplace, Write, Grep, Glob, Bash(bun run typecheck:*)
argument-hint: file path(s), e.g. src/content/capture.ts
---

Add **accurate JSDoc** to the file(s) named in `$ARGUMENTS` (paths relative to repo root or absolute). If multiple paths are given, process each in order.

## Before editing

1. Read the full file (and any imported types needed for correct `@param` / `@returns` wording).
2. Prefer **implementation-derived** descriptions: infer behavior from the body and call sites, not generic filler.

## What to document

- **Exported** functions, methods, classes, and public-facing constants — primary focus.
- **Non-exported** helpers only when they are non-obvious (complex preconditions, side effects, units, or invariants). Skip trivial one-liners.
- For **TypeScript**: JSDoc should complement types — use `@param` / `@returns` for semantics, edge cases, and units; avoid restating types the signature already expresses unless narrowing or documenting overload behavior.
- Use `@template`, `@typedef`, `@deprecated`, `@throws` / `@returns {never}` when the code warrants it.
- For **callbacks / options objects**, document important shape fields in the main block or with `@param` property syntax where appropriate.

## Style

- Use `/** ... */` blocks immediately above the symbol (no blank line between block and declaration).
- First sentence is a concise summary; optional paragraph for behavior, errors, or performance notes.
- Match any existing JSDoc tone and tag style in the file; otherwise follow [TypeScript JSDoc reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) conventions.
- Do **not** remove or rewrite unrelated code. Do **not** add redundant comments inside function bodies unless clarifying non-obvious invariants.

## After editing

- For each edited `.ts` or `.tsx` file under this repo, run `bun run typecheck` from the repo root once after all edits; fix any issues introduced.

## Outcome

- Brief summary: which symbols received JSDoc and anything intentionally skipped (with reason).
