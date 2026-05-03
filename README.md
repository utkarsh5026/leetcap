# LeetCode Metadata Capture

A personal Chrome extension that captures metadata from accepted LeetCode submissions and copies a formatted comment block to your clipboard, ready to paste at the top of a solution file.

The extension does **not** write to disk, talk to GitHub, or send data anywhere. Its only side effect is putting a string on your clipboard. The hand-paste step into your repo is intentional — that is where you decide what the file should contain.

## Build

```sh
bun install
bun run build
```

That produces a `dist/` directory containing the loadable extension.

For development with HMR:

```sh
bun run dev
```

Type-check without building:

```sh
bun run typecheck
```

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` directory.
4. Visit any `https://leetcode.com/problems/<slug>/` page and submit a solution. On **Accepted**, a panel appears bottom-right with the captured metadata and a copy button.

The extension only requests two permissions: `clipboardWrite` and host access to `https://leetcode.com/*`.

## When LeetCode redesigns their UI

LeetCode will eventually change their DOM and the extension will start reporting "not captured" for fields, or fail entirely. When that happens:

1. Open `src/content/selectors.ts`. Every selector lives there with a comment describing what it targets and the date it was last verified.
2. Update the broken selector. Update its `testedOn` date in the same edit — that comment is the running record of when the LeetCode DOM changed.
3. Rebuild (`bun run build`) and reload the extension from `chrome://extensions`.

If capture fails entirely, the floating panel shows which selector keys did not match — start with those.

## Adding a new captured field

Adding a field requires changes in three files (and only three):

1. `src/content/types.ts` — add the field to `CapturedData`.
2. `src/content/capture.ts` — extract the value from the DOM and include it in the returned object.
3. `src/content/formatter.ts` — emit the new line in the comment block (skip it when `undefined`).

Keeping these three in sync is what gives you end-to-end type safety.

## Honest expectations

This is a personal tool, not a polished product. It will break when LeetCode redesigns their interface (and they will). The structure is built to make recovery cheap — one selectors file, dated comments, visible "not captured" markers in the panel — but it is not built to be self-healing.
