# Annix How-To Watcher

VS Code extension that surfaces how-to guides affected by the file you're
currently editing. Pairs with the blocking pre-commit prompt
(`scripts/howto-pre-commit-prompt.ts`) to keep documentation in sync with
code.

## What it does

- On startup, scans every `annix-frontend/src/app/*/how-to/guides/*.md`
  file and parses the `relatedPaths` from each guide's frontmatter.
- Whenever you switch the active editor, checks the active file path
  against every guide's `relatedPaths` (prefix match).
- If at least one match is found, shows a status-bar item:
  `📖 affects N how-to guide(s)`.
- Clicking the status item opens the affected guide(s) in a side editor
  (or shows a Quick Pick if multiple).

## Install (local dev)

```bash
cd tools/vscode-howto-watcher
pnpm install
pnpm build
```

Then in VS Code:

1. `F1` → `Developer: Install Extension from Location…`
2. Pick the `tools/vscode-howto-watcher/` directory.

The extension activates on startup of any workspace that contains an
`annix-frontend/src/app/*/how-to/guides/` directory.

## Why

The pre-push freshness check is reactive — it tells you the guide is
stale only when you push. The pre-commit prompt is interactive but only
fires at the moment you commit, by which point you're context-switching
out. The status-bar item closes the loop: while you're still editing
the file, you can see at a glance whether a guide tracks it. Lowest
ergonomic cost; opt-in, never blocks.

## Limitations

- Reads guide frontmatter once on startup + on save of any guide. If you
  add a brand-new guide while VS Code is running, reload the window.
- Prefix-match only (same logic as the pre-commit prompt + pre-push
  checker). A guide that lists a directory matches every file inside it.

## Roadmap

- A "draft update with Claude" command that mirrors the pre-commit
  prompt's `draft-with-claude` action without leaving the editor.
- Inline highlight in the affected guide for which paragraph triggered
  the warning.
