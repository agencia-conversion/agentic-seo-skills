# Companion UI Conventions

These rules apply to every change inside `apps/companion/`.

## Internationalisation

The Companion is fully bilingual. English is the canonical language; Brazilian
Portuguese (`pt-BR`) is the official second language. Every user-visible string
must go through `useI18n().t('namespace.key')` — no hardcoded English or
Portuguese in JSX, toasts, ARIA labels, placeholders, or option labels.

- Add new keys to both `en` and `pt-BR` blocks in
  `apps/companion/src/lib/i18n.ts`. Keep the English copy authoritative;
  translate to `pt-BR` immediately.
- Names that double as UI labels for paths (e.g. `brain/index.md`, virtual
  sections) go through `displayPageTitle` in `src/lib/page-display.ts`. The
  store keeps canonical English titles (`Brain`, `Content`, `Workbench`,
  `Reports`); the UI translates at render time.
- "Brain" in English maps to "Cérebro" in `pt-BR` (`common.brain`). Never
  short-circuit this with a literal string.
- Server-only strings that land in the authorial Brain log (`brain/log.md`)
  stay in `pt-BR` — they are editorial content for the project, not UI.

If you add a new component, audit it for hardcoded text before merging:

```bash
rg "[áéíóúãõçâêô]" apps/companion/src --type tsx
```

The grep above should return zero matches outside `src/lib/i18n.ts`.

## Links e fontes

- Links Markdown externos (`https://`, `mailto:`) renderizam clicáveis no editor.
  Clique abre em nova aba com `noopener,noreferrer`.
- Links para `sources/**` abrem em um modal interno (`SourceViewerModal`) que
  carrega o arquivo via `GET /api/project/source?path=...` num `<iframe sandbox>`.
  O endpoint roda no Companion local, exige token e bloqueia traversal, paths
  fora de `sources/`, extensões não-whitelisted e arquivos acima de 2 MB.
- Para adicionar ou editar link com texto selecionado, usar o `LinkEditModal`
  (botão Link no bubble menu ou Cmd+K). Nunca usar `window.prompt`.
- PageMention (`[[wiki]]`) renderiza no editor sem o prefixo `@`. O `@` é só
  atalho de digitação; quem está lendo vê apenas o título resolvido.

## Markdown round-trip

Páginas autorais ficam em Markdown no disco e abrem no Tiptap editor. O parser
e o serializer estão em `apps/companion/src/lib/markdown.ts` e delegam o tratamento
inline para `apps/companion/src/lib/inline-markdown.ts`. Os dois lados precisam ficar
em sincronia: tudo que o parser produz, o serializer reconstrói; tudo que o serializer
gera, o parser entende. O smoke test em `tests/test_companion_markdown_roundtrip.mjs`
é o portão dessa garantia.

Sintaxe inline suportada e preservada round-trip:

- Wikilink: `[[pagina]]`, `[[pagina#âncora]]`, `[[pagina|alias]]`, `[[pagina#âncora|alias]]`.
- Link Markdown: `[texto](url)` ou `[texto](url "title")`.
- Code inline: `` `código` ``.
- Negrito: `**texto**` ou `__texto__`.
- Itálico: `*texto*` ou `_texto_`.

Skills que escrevem markdown podem usar essas formas livremente; o Companion vai
renderizar como link clicável, código mono, negrito e itálico, e re-salvar o
markdown sem dano. Não inventar outras sintaxes (autolink HTML, sublinhado com
`__`, strikethrough com `~~`, image inline) sem atualizar o parser, o serializer
e o teste de round-trip ao mesmo tempo.

DRY: o parser de uma sintaxe nova vai em `inline-markdown.ts` (como `matchLink`,
`matchCodeSpan`, etc.) e o serializer correspondente entra em `serializeNode`
do mesmo arquivo. Não duplicar parsing em outros lugares.

## Form controls

Never use native form selects (`<select>` / `<option>`). They render the
browser's default chrome and break visual consistency.

Use the styled component at `apps/companion/src/components/select.tsx` for
every dropdown. Pass `triggerClassName` to match the surrounding control style
(e.g. filter row, frontmatter field, modal). Add new variants by extending
that component, not by reintroducing native selects.

This rule covers filters, frontmatter fields, settings forms, modals, and any
future control that exposes a fixed set of choices.
