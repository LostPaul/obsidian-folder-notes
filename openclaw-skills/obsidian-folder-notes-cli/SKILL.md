---
name: folder-notes-cli
description: Use this skill when an OpenClaw agent needs to create, find, list, attach, delete, detach, reattach, rename, or move Obsidian Folder Notes in a vault through the folder-notes CLI. Use it for agent-safe automation against vault folders without opening Obsidian.
---

# Folder Notes CLI

Use the repository's `folder-notes` CLI to manage Obsidian Folder Notes from automation. The CLI operates directly on a vault directory and reads plugin settings from:

```text
<vault>/.obsidian/plugins/folder-notes/data.json
```

Always pass `--vault <absolute-or-relative-vault-path>`. Commands return JSON by default; parse `ok`, `notePath`, `items`, and `error.message`.

## Setup

From the plugin repository, build the CLI before first use:

```bash
npm run cli-build
```

Set `CLI` to the built file in the plugin repository. Do not assume the skill directory contains the CLI.

```bash
CLI="<plugin-repo>/dist/folder-notes-cli.cjs"
node "$CLI" <command> --vault <vault> ...
```

or through the package binary when installed/linked:

```bash
folder-notes <command> --vault <vault> ...
```

## Common Workflows

Create or reuse a folder note and return its path:

```bash
node "$CLI" ensure --vault /path/to/vault --folder "Projects/Alpha"
```

Find the folder note for a folder:

```bash
node "$CLI" get --vault /path/to/vault --folder "Projects/Alpha"
```

List all folders in the vault that currently have folder notes:

```bash
node "$CLI" list --vault /path/to/vault
```

Use an existing file as the folder note:

```bash
node "$CLI" attach --vault /path/to/vault --folder "Projects/Alpha" --file "Projects/Alpha/Brief.md"
```

Delete a folder note. By default this moves it into vault-local trash:

```bash
node "$CLI" delete --vault /path/to/vault --folder "Projects/Alpha"
```

Only use permanent deletion when explicitly requested:

```bash
node "$CLI" delete --vault /path/to/vault --folder "Projects/Alpha" --permanent
```

Detach or reattach a folder note by updating plugin settings:

```bash
node "$CLI" detach --vault /path/to/vault --folder "Projects/Alpha"
node "$CLI" reattach --vault /path/to/vault --folder "Projects/Alpha"
```

Move or rename a folder while preserving folder-note conventions:

```bash
node "$CLI" move-folder --vault /path/to/vault --folder "Projects/Alpha" --to "Archive/Alpha"
node "$CLI" rename-folder --vault /path/to/vault --folder "Projects/Alpha" --name "Beta"
```

## Safety Rules

- Prefer `--dry-run` before destructive or broad operations.
- Do not use `--force` unless the user explicitly wants to replace an existing folder note.
- Do not use `--permanent` unless the user explicitly asks for permanent deletion.
- Treat `ok: false` or any nonzero exit code as a failed operation and report `error.message`.
- Vault-relative paths must not contain `..`; pass folder and file paths relative to the vault root.
- The CLI follows plugin settings for `folderNoteName`, `folderNoteType`, `supportedFileTypes`, `storageLocation`, and `templatePath`.

## JSON Shapes

Successful commands include:

```json
{
  "ok": true,
  "command": "ensure",
  "vault": "/path/to/vault",
  "folder": "Projects/Alpha",
  "notePath": "Projects/Alpha/Alpha.md",
  "actions": []
}
```

Failures include:

```json
{
  "ok": false,
  "error": {
    "code": "unexpected_error",
    "message": "Folder already has a note: Projects/Alpha/Alpha.md. Use --force to replace it."
  }
}
```
