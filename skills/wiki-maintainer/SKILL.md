---
name: wiki-maintainer
description: Maintain the SEO Brain LLM Wiki with Obsidian-compatible Markdown, source provenance, indexes, logs, and approval-aware updates.
---

# Wiki Maintainer

Use this skill when the user asks to ingest sources, update the Wiki, lint project knowledge, record decisions, or reconcile context.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/_shared/references/wiki-review.md`
- `docs/wiki-karpathy-validation.md`

## Contract

Inputs:

- source files, URLs, notes, or requested Wiki edits;
- optional approval decision from the user.

Writes only:

- `project/wiki/`
- `project/sources/` for newly captured raw sources;
- `project/reports/` for Wiki lint reports.

## Required Behavior

- Treat raw sources as immutable or append-only.
- Keep raw source files in `project/sources/`; catalog them from `wiki/fontes/index.md`.
- Separate extracted facts, synthesis, and human judgment.
- Keep `wiki/index.md` useful as a project map.
- Append important changes to `wiki/log/index.md`.
- Keep strategic pages in `draft` or `needs-review` until explicit approval.
- Flag contradictions, stale claims, missing citations, orphan pages, and broken links.
- Antes de declarar `done`, executar o protocolo em `skills/_shared/references/wiki-review.md` sobre todos os arquivos `wiki/**` modificados neste run. Não persistir versão revisada sem aprovação humana quando o reviewer propuser mudanças.

## Done Criteria

- Changed pages cite their sources or mark gaps.
- Index/log are updated.
- Approval status is correct.
- Review pass concluído: `no-op` registrado no log, ou aprovação humana sobre a versão revisada, ou rejeição explícita registrada.
