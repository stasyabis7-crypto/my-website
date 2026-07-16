Auto-commit watcher

This repository includes an optional file-watcher that will automatically stage and commit local changes when files are modified.

Usage:

1. Install dependencies (Node.js >=14 required):

```bash
npm install
```

2. Start the watcher:

```bash
npm run auto-commit
```

3. By default the script will NOT push to remote. To enable pushing, set the `AUTO_PUSH` env var:

```bash
AUTO_PUSH=1 npm run auto-commit
```

Notes & safety:
- Commits use the message `Auto: update <file list>` and skip commit hooks via `--no-verify`.
- This is intended for demos or local workflows. Review the generated commits and consider adjusting the script if you want finer control (sign commits, co-author, etc.).
- You can stop the watcher with Ctrl+C. It will try to flush pending changes before exiting.
