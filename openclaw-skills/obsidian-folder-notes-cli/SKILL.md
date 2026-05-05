---
name: folder-notes-cli
description: Use this skill when an OpenClaw agent needs to create, find, list, attach, delete, detach, reattach, rename, or move Obsidian Folder Notes in a vault through the folder-notes CLI.
---

# Folder Notes CLI

Use the CLI shipped in the installed plugin folder. Always pass `--vault <vault>`.

```bash
VAULT=/path/to/vault
CLI="$VAULT/.obsidian/plugins/folder-notes/folder-notes-cli.cjs"
node "$CLI" list --vault "$VAULT"
```

Create or find a folder note:

```bash
node "$CLI" ensure --vault "$VAULT" --folder "Projects/Alpha"
node "$CLI" get --vault "$VAULT" --folder "Projects/Alpha"
```

Attach, detach, move, or rename:

```bash
node "$CLI" attach --vault "$VAULT" --folder "Projects/Alpha" --file "Projects/Alpha/Brief.md"
node "$CLI" detach --vault "$VAULT" --folder "Projects/Alpha"
node "$CLI" move-folder --vault "$VAULT" --folder "Projects/Alpha" --to "Archive/Alpha"
node "$CLI" rename-folder --vault "$VAULT" --folder "Projects/Alpha" --name "Beta"
```

If the installed plugin does not include the CLI yet, use `folder-notes` from `PATH` or `node "$PLUGIN_REPO/dist/folder-notes-cli.cjs"` from a checkout.

## Safety

- Prefer `--dry-run` before destructive or broad operations.
- Do not use `--force` or `--permanent` unless explicitly requested.
- Treat `ok: false` or nonzero exit as failure and report `error.message`.
