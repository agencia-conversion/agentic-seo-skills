# Local project persistence

`project/` is runtime data and remains gitignored. Git branches and merges do not carry it. For Conductor workspaces, use a local persistent mirror outside the repo.

## Commands

- `npm run project:save` copies the current `project/` to the persistent mirror.
- `npm run project:restore` copies the mirror into this workspace.
- `npm run project:status` shows both paths and file counts.
- `npm run project:install-hooks` installs local Git `post-checkout` and `post-merge` hooks that run restore in this workspace.

By default the mirror lives under:

```text
~/Library/Application Support/Agentic SEO/projects/<remote-slug>/project
```

Override the root with `AGENTIC_SEO_PERSIST_ROOT`.

## Conductor setup

For new Conductor workspaces, add this as a startup/setup command when available:

```bash
npm install && npm run project:restore
```

When a workspace changes `project/`, run:

```bash
npm run project:save
```

This is a local mirror, not a Git merge. The script creates backups before overwriting either side, but simultaneous edits in two workspaces still need human review.
