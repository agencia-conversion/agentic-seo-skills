# Obsidian Vault Compatibility

The Web Companion stores everything as plain Markdown with YAML frontmatter. You can open the same `project/` directory in Obsidian as a vault and navigate the brain there, with a few caveats.

## How to open the vault

1. Open Obsidian → **Open folder as vault**.
2. Point it at the `project/` directory of your Agentic SEO project.
3. The vault loads with `brain/`, `conteudos/`, `workbench/`, `relatorios/` as folders.

Obsidian writes its own settings to `project/.obsidian/`. That directory is gitignored at the repo level. Do not commit it.

## What works in both Companion and Obsidian

| Feature | Companion | Obsidian | Notes |
| --- | --- | --- | --- |
| `[[wikilink]]` | ✅ | ✅ | Resolved with brain-first + global basename fallback. |
| `[[wikilink|alias]]` | ✅ | ✅ | |
| `[[wikilink#anchor]]` | ✅ | ✅ | Anchor is a heading slug. |
| `![[embed]]` | ✅ card preview | ✅ full transclusion | Companion renders a card with title + preview. |
| `> [!note] Title` callouts | ✅ | ✅ | Companion supports note, info, tip, warning, danger, quote, success, question. |
| ```` ```mermaid ```` diagrams | ✅ | ✅ (with plugin) | Companion uses dynamic mermaid import. |
| Frontmatter `title`, `updated`, `tags` | ✅ | ✅ | Tags accept array (`[a, b]`) or comma-string. |
| Inline `#tag` | ✅ | ✅ | Companion ignores tags inside code fences and `#` headings. |
| Backlinks | ✅ | ✅ | Companion shows "Linked mentions" panel under each page; Obsidian has its own backlinks pane. |
| Tags index | ✅ at `/project/{token}/tags` | ✅ via Tags pane | |
| Broken links report | ✅ at `/project/{token}/broken-links` | ✅ via Broken Links plugin | |

## Companion-only

These render in the Companion but appear as raw code blocks in Obsidian:

| Feature | Behavior in Obsidian |
| --- | --- |
| ```` ```agentic-kpis ```` | Plain YAML block |
| ```` ```agentic-chart ```` | Plain YAML block |
| ```` ```agentic-table ```` | Plain YAML block |
| Companion icon/cover metadata | Stored in `.agentic-seo/companion-ui.json` — Obsidian ignores it. |

## Obsidian-only

These are not yet rendered in the Companion (work fine in Obsidian, ignored by the Companion editor):

| Feature | Status |
| --- | --- |
| Math (`$...$` / `$$...$$`) | Renders as raw text in Companion |
| Footnotes (`[^1]`) | Renders as raw text |
| Canvas (`.canvas`) | Not supported |
| Daily notes plugin | Not used |

## Critical rules

1. **`brain/log.md` is append-only.** The Companion blocks writes to it via API; Obsidian does NOT enforce this. If you edit `log.md` in Obsidian, do not rewrite earlier entries — only append new ones using `tipo: errata` to correct prior entries.
2. **Concurrency.** The Companion uses a SHA-256 hash on save. If you edit a file in Obsidian while the Companion has it open, the next save returns `file-modified` and the Companion offers to reload. Reload before editing.
3. **Wikilink scope.** Companion convention: `[[name]]` inside `brain/` resolves against `brain/`. Outside the brain, prefer markdown links (`[label](path)`). Obsidian resolves wikilinks globally by basename; the Companion does the same as a fallback so both work.
4. **Hidden Companion artifacts.** Files under `.agentic-seo/` (config), `.companion/handoffs/` (ephemeral handoffs), and `.tmp-fixture/` (Playwright) are gitignored and invisible to Obsidian.

## Gotchas

- **`![[embed]]` looks different in each tool.** Obsidian inlines the full content. The Companion renders a card. Both round-trip the same Markdown on disk.
- **Embeds must be on their own line** in the Companion V1. Obsidian also accepts inline embeds inside lists or paragraphs; the Companion does not render those inline yet (the Markdown round-trips, but the embed is shown as plain text inside the paragraph).
- **Tags inside code fences are ignored** by both Companion and Obsidian. Tags inside `#` headings are also ignored (the `#` is the heading marker, not a tag prefix).
- **Custom fences degrade.** `agentic-kpis`, `agentic-chart`, `agentic-table` look like raw YAML in Obsidian. To get them rendered in Obsidian, you would need a custom plugin.

## Validation

The Playwright E2E suite at `apps/companion/e2e/` includes a fixture brain that exercises wikilinks, embeds, callouts, mermaid, and tags. The `obsidian-compat.spec.ts` suite asserts that the same fixture content roundtrips through the Companion's markdown serializer without losing wikilinks or fence kinds.
