# Companion: links externos, sources internos e modal de link

Status: approved (sub-agent independent review 2026-05-24, all VERIFY-1..9 passed)

Escopo: editor do Companion (Tiptap), renderização de marks de link no documento e tratamento de URLs que apontam para `project/sources/**`.

## Problema

1. `project/sources/**` é gitignored e contém HTML bruto baixado para evidência (ex.: scrape de conversion.com.br). Hoje os links em arquivos do brain apontam para esses arquivos via path relativo, que o Tiptap concatena com o origin do Companion: `http://127.0.0.1:58009/project/sources/conversion-com-br/cases.html`. O Companion não expõe esse caminho como rota e a chamada quebra (404).
2. URLs externas em conteúdo autoral devem ser clicáveis e abrir em nova aba; hoje o Link extension do Tiptap está configurado com `openOnClick: false` e o clique não navega.
3. Mentions de página (`pageMention`) renderizam o prefixo `@` no Companion. O `@` é o atalho de digitação, não a UI de leitura; o leitor deve ver só o título da página.
4. Adicionar link na bubble menu usa `prompt()` do navegador. Padrão de UX/UI do Companion é modal estilizado (mesmo design system de Settings, Confirm, Credentials), não chrome do navegador.

## Decisões de UX

- **Source viewer**: clicar em link para `sources/**` abre um modal (mesmo `<dialog>` padrão do Companion) com `<iframe sandbox>` carregando o HTML via API interna que servirá `project/sources/**` como `text/html`. Modal tem header com path, botão "abrir em nova aba" (usa o endpoint), botão fechar. Sandbox restritivo: `sandbox="allow-same-origin"` (sem scripts, sem forms) — é evidência, não app.
- **URLs externas**: clique abre `target="_blank" rel="noopener noreferrer"`. Hover mostra preview pequeno com URL completa e botão "editar". Edição: modal estilizado com campos URL + texto, atalhos save (`Enter`) e cancelar (`Esc`).
- **PageMention**: render é só o título resolvido (sem `@`). Underline sutil para indicar interatividade. Atalho `@` no input segue mesmo.
- **Bubble menu — adicionar link**: ao selecionar texto e clicar no ícone de link, abre o mesmo modal de edição (campo URL pré-focado, texto pré-preenchido com seleção). Sem `prompt()`.

## Contratos

### API route nova

- Path: `GET /api/project/source?path=<rel>`.
- Guardas: `rejectUnlessLocal` (token Companion + host).
- Validação do path:
  - obrigatório começar com `sources/`;
  - rejeita `..`, paths absolutos, ou qualquer traversal;
  - rejeita arquivos > 2 MB;
  - aceita extensões `.html`, `.htm`, `.txt`, `.json`, `.md`.
- Resposta: bytes brutos do arquivo com `Content-Type` correto baseado em extensão; `Content-Security-Policy: sandbox; default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'`; `X-Content-Type-Options: nosniff`.

### Editor

- `Link.configure({ openOnClick: false })` permanece, mas adiciona handler customizado no editor:
  - Clique em `<a>` dentro do ProseMirror: se href bate com `sources/**` (relativo) ou começa com o origin do Companion + `/project/sources/`, abre modal interno; senão `window.open(href, '_blank', 'noopener,noreferrer')`.
  - Cmd/Ctrl-click sempre abre em nova aba mesmo para sources.
- Bubble menu: botão Link (`Cmd+K` keyboard shortcut também) abre `LinkEditModal` em vez de `prompt`.
- `LinkEditModal`: inputs `text` e `url`. Pré-preenche `text` com seleção atual. Submeter aplica `setLink({ href: url }).insertContent(text)`. Cancelar fecha sem mexer no doc.
- PageMention NodeView: remove o `@` do prefixo visual. Mantém em copy/paste para preservar round-trip.

### Markdown round-trip (sem regressão)

- Spec `tests/test_companion_markdown_roundtrip.mjs` continua passando para wikilinks, links Markdown, code, bold, italic.
- Adicionar caso: link com path relativo a `sources/` sobrevive round-trip.

## Critérios de aceitação (todos verificáveis)

1. **VERIFY-1 — Source viewer API existe e rejeita traversal.**
   - `GET /api/project/source?path=sources/conversion-com-br/cases.html` com token → 200 + `text/html` + bytes do arquivo.
   - `GET /api/project/source?path=../../etc/passwd` → 403.
   - `GET /api/project/source?path=brain/index.md` (fora de `sources/`) → 403.
   - `GET /api/project/source` sem token → 403.
2. **VERIFY-2 — Modal de source abre com iframe sandbox quando o usuário clica num link `sources/`.**
   - Selector `[role=dialog][data-modal=source-viewer]` aparece após click; `iframe[sandbox]` carrega o path; botão "abrir em nova aba" link target=_blank.
3. **VERIFY-3 — Link externo abre em nova aba.**
   - Click em `<a href="https://conversion.com.br/">` dentro do editor dispara `window.open` com argumentos `_blank, noopener, noreferrer` (espionar via stub).
4. **VERIFY-4 — PageMention render sem `@`.**
   - DOM `[data-page-mention]` contém apenas o título; não há `@` antes do texto.
   - Markdown round-trip preserva `[[wikilink]]` (sem `@`).
5. **VERIFY-5 — Bubble menu de link usa modal próprio.**
   - Spy/check: `window.prompt` nunca chamado pelo botão Link do bubble menu.
   - Modal `[role=dialog][data-modal=link-edit]` aparece com campos `name=text` e `name=url`; submeter aplica a mark `link` à seleção.
6. **VERIFY-6 — Cmd+K abre o mesmo modal.**
   - Atalho Cmd+K (Ctrl+K em Linux/Win) dispara o LinkEditModal sem `prompt`.
7. **VERIFY-7 — Type check (`tsc --noEmit`) limpo.**
8. **VERIFY-8 — Round-trip test passa.**
   - `node tests/test_companion_markdown_roundtrip.mjs` exit 0.
9. **VERIFY-9 — Smoke render no browser.**
   - Carrega `brain/identidade.md` no Companion; navega para um link `sources/`; modal abre; iframe carrega.
   - Carrega link externo; nova aba abriria (verificado via spy).

## Plano de implementação

1. **API route**: `apps/companion/src/app/api/project/source/route.ts` + helper `apps/companion/src/lib/source-files.ts`.
2. **Modal source viewer**: `apps/companion/src/features/sources/source-viewer-modal.tsx` + store action `openSourceViewer(path)` + slot na sidebar.
3. **Modal link edit**: `apps/companion/src/features/editor/link-edit-modal.tsx` + store action `openLinkEditor(payload)`.
4. **Editor wiring**:
   - Atualizar `editor-extensions.ts` para configurar Link com handler customizado.
   - Atualizar `editor-panel.tsx` bubble menu para abrir `LinkEditModal`.
   - Adicionar Cmd+K shortcut no editor handleKeyDown.
5. **PageMention NodeView**: localizar e remover `@` do render visual; manter no markdown serialize.
6. **Tests**: ampliar `tests/test_companion_markdown_roundtrip.mjs`; criar `tests/test_companion_source_route.mjs` (rejeita traversal, aceita whitelist).
7. **i18n**: novas chaves para o modal (`linkEditor.title`, `linkEditor.text`, `linkEditor.url`, `linkEditor.save`, `linkEditor.cancel`, `sourceViewer.title`, `sourceViewer.openInNewTab`).
8. **Documentar regra** em `apps/companion/AGENTS.md`: source viewer + link modal.
9. **Validar com sub-agent independente** (checklist VERIFY-1 a VERIFY-9 reproduzido).

## Saída obrigatória

- Todos os critérios VERIFY-1..VERIFY-9 marcados verde, com evidência (curl outputs, screenshots, logs de test).
- Sub-agent independente lê este spec, executa o checklist, e devolve verdict `approve` ou lista de falhas concretas.
