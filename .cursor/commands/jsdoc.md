# jsdoc

Add **accurate JSDoc** to the file the user names (path relative to repo root or absolute). If they named multiple files, process each in order.

## Before editing

1. Read the full file (and any types it imports that are needed for `@param` / `@returns` accuracy).
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

- If the file is `.ts` or `.tsx` in this repo, run `bun run typecheck` from the repo root and fix any issues introduced by the edit.

## Outcome

- Brief summary: which symbols received JSDoc and anything intentionally skipped (with reason).
