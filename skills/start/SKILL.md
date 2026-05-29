---
name: start
description: Friendly first-run alias that routes new Agentic SEO users to the canonical agentic-seo and project-init workflow without duplicating process rules.
metadata:
  version: 1.0.0
  category: alias
  alias_for: agentic-seo
---

# Start

You are the first-run entry point for Agentic SEO. Your job is to help a user begin without inventing a separate process. Treat this skill as an alias to the canonical `agentic-seo` router and, when no project exists yet, the `project-init` skill.

## When To Use

Use this skill when the user asks how to start, says they just installed Agentic SEO, asks "what now?", or opens a new workspace with no clear project state.

Do not use this skill for ongoing SEO work after the project already has a defined request. Route those requests through `agentic-seo` and the narrow downstream skill that owns the next step.

## Critical Points

- Do not create strategic context from a first-run greeting without evidence and a decision log.
- Do not ask nontechnical users to run terminal commands as the primary user experience.
- Do not duplicate a full Agentic SEO workflow here. Route to `agentic-seo` for classification and `project-init` for project setup.
- Keep raw sources, drafts, artifacts, public content, and authorial brain state separate once a project exists.
- Preserve the user's language and diacritics. In pt-BR, write accents correctly: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Talk to lay users in plain pt-BR (explain a technical term in simple words on first use; "Cérebro do projeto" for brain). At setup start, CALL TodoWrite with the setup steps (see § 0) and update it in place — the native checklist (one step per line, minimal prose) is the only visible status line, never depending on Ruflo or any external MCP. Use the native multiple-choice tool (AskUserQuestion) for Passo 0 questions so a lay user just advances. See `docs/output-and-tone.md` for tone, the lay glossary, the wizard rule, and progress.
- Nunca exiba comandos crus (`node`/`grep`/`sed`/`kill`/`cd`), URLs de debug, tokens, exploração ou debugging. Trabalho ruidoso roda em silêncio (subagente ou um comando único correto). O checklist (TodoWrite) é a única visão de progresso do usuário.

## Framework

### 0. Iniciar o checklist (obrigatório, antes de qualquer pergunta)

Antes de qualquer pergunta, **CHAME TodoWrite** com as etapas do setup e atualize-o **no lugar** a cada etapa concluída — o checklist nativo é a ÚNICA status line visível. Etapas canônicas (uma por linha):

`Coletar site e mercado` · `Perguntar idioma` · `Perguntar se pré-preenche o Cérebro` · `Coletar informações adicionais (opcional)` · `Criar a estrutura do projeto` · `Pesquisar até 10 páginas do site e preencher o Cérebro` · `Anotar a decisão no diário` · `Abrir o Cérebro no navegador para revisar` · `Sugerir as próximas análises`.

Isto é obrigatório, não um exemplo. Ver `docs/output-and-tone.md` para tom e progresso.

### 1. Detect Project State

Check whether `project/` already exists and whether it contains `.agentic-seo/project.json`, `brain/`, `sources/`, `workbench/`, `artifacts/`, or `contents/`.

If no project exists, the next meaningful step is `project-init`.

If a project exists, route to `agentic-seo` and ask it to classify the user's current SEO request.

### 2. Wizard do Passo 0 (múltipla escolha — o usuário só avança)

Conduza o Passo 0 como um **wizard**: use a **ferramenta nativa de múltipla escolha (AskUserQuestion)** para que um usuário comum só toque na opção e avance; a opção recomendada é **sempre** o caminho de continuar/pré-preencher. Faça uma pergunta por vez, em pt-BR claro. Se a ferramenta nativa não existir no harness, apresente as mesmas opções como lista numerada curta com a recomendada marcada (ver `docs/output-and-tone.md`).

- **Q1 — Site/marca:** campo curto de texto livre (nome ou URL). Uma URL/nome de marca é aberto e não cabe em opções fixas; peça em uma linha.
- **Q2 — Mercado/país (AskUserQuestion):** `Brasil (pt-BR)` (recomendado/default) · `Portugal (pt-PT)` · `Estados Unidos (en)` · `Outro (eu digito)`.
- **Q3 — Idioma (AskUserQuestion):** derive de Q2 e apresente pré-selecionado (`Português do Brasil` recomendado quando Q2 = Brasil) · `English` · `Outro`. É só uma confirmação rápida; preserve idioma/acentos (`AGENTS.md` → "Language Fidelity" vence).
- **Q4 — Pré-preencher o Cérebro (AskUserQuestion):** `Sim — pesquisar meu site e pré-preencher (recomendado)` (DEFAULT, cabeçalho "Recomendado") · `Não — deixar em branco para eu preencher`.
- **Q5 — Informações adicionais, opcional (AskUserQuestion):** `Não, pode seguir` (recomendado/default) · `Sim, vou colar algumas informações`. Só se `Sim`, colete em texto livre (páginas-chave, posicionamento, diferenciais, público, concorrentes, dados).

**Mapeamento para os inputs do `project-init`:** Q1 → `name`/`site_url`; Q2 → `market`/`country`; Q3 → `language`; Q4 → `prefill_choice` (`Sim` = `from_site`, `Não` = `blank`); Q5 → `additional_info`. Não invente chaves novas.

**Por que aqui:** `project-init` roda como subagente e **não tem canal com o usuário nem ferramentas de web fetch**. Portanto o agente principal (esta skill) conduz o wizard + lê as até 10 URLs do site ANTES de delegar, e passa ao `project-init`: `prefill_choice`, `site_url`, as `site_extractions` já lidas e o `additional_info`. Se o wizard não for conduzido aqui, esses dados se perdem.

**Leitura do site em UM lote silencioso:** quando `prefill_choice = from_site`, leia o site em **um único lote** — dispare todos os fetches das até 10 URLs **em paralelo numa ÚNICA mensagem**, sem narração por item (proibido: "Vou ler...", "Lendo a home...", "Bom material...", comentário por página). O progresso aparece **só no TodoWrite** (marque a etapa "Pesquisar até 10 páginas do site" ao concluir o lote inteiro). Nenhuma prosa por fetch.

If the user is nontechnical, offer a local browser handoff for setup and decisions when available. Do not make terminal commands the main handoff.

### 3. Preserve Decision Boundaries

First-run setup may create blank brain templates and operational log entries, but it must not treat authorial brain pages as evidence-backed. Changes are recorded through `type: decision` entries in `project/brain/log.md`:

- `project/brain/index.md`
- `project/brain/identity.md`
- `project/brain/voice.md`
- `project/brain/technology.md`
- `project/brain/topic-clusters.md`
- `project/brain/review.md`

No caminho `from_site` (onboarding, autorização prévia do Passo 0), o subagente
`project-init` ESCREVE essas páginas direto em `project/brain/` para o usuário
revisar — sem `workbench/` e sem `type: approval` — e registra UMA entrada
`type: decision` com `approver` = nome do usuário (passe o identificador do usuário
ao delegar, junto de `prefill_choice`/`site_extractions`/`additional_info`). Isso
permanece compatível com "recorded through `type: decision`". Esta relaxação vale
SOMENTE no onboarding/seed; os demais gates e o `brain-keeper` seguem intactos.

### 4. Route The Next Action

Return one clear routing decision:

- `project-init` when no Agentic SEO project exists. When delegating, pass the pre-fill decision (`prefill_choice`), `site_url`, the `site_extractions` already read, the `additional_info` text, and the user identifier as `approver` for the `from_site` seed `type: decision` entry — the subagent cannot ask the user.
- `agentic-seo` when the project exists but the user's goal is broad or unclear.
- A narrow downstream skill only when the next step is obvious and all prerequisites are present.

Stop at the first missing gate. Do not pretend that a first-run routing answer completed research, strategy, or content work.

### 5. Fechamento Pronto-Para-Uso (obrigatório, em ordem)

O `/start` **não termina "no ar"**: ou o Cérebro foi entregue e o Companion
oferecido, ou há um próximo passo claro. Quando `project-init` retornou
`status: complete`, conduza estes quatro estágios, **nesta ordem**, cada um
obrigatório:

- **E1 — Cérebro preenchido e entregue.** No caminho `from_site`, as páginas do
  Cérebro já estão escritas em `project/brain/` (registro `type: decision`,
  `approver` = usuário). No caminho `blank`, o Cérebro fica em branco
  (sem mudança). Em ambos, a entrega aponta para `project/brain/index.md`.
- **E2 — Pedir permissão e abrir o Companion (múltipla escolha).** Feche a mensagem
  de entrega com a linha canônica EXATA: `Posso abrir o Web Companion para você
  revisar esta entrega?` (sem pergunta em prosa depois). Em seguida, faça a escolha
  via **AskUserQuestion** — use essa mesma linha canônica como prompt/cabeçalho da
  pergunta (assim o contrato de fechamento canônico fica preservado) — com as
  opções: `Sim (abrir no navegador)` (recomendado) · `Não (continuar aqui)`. Em
  `Sim`: abra o Companion com o comando canônico detached mirando o projeto do
  usuário (`agentic-seo project-browser --detach`), em silêncio — sem expor
  comando/token/URL de debug, nunca `cd` na pasta do plugin (ver `AGENTS.md` →
  "Browser handoff" → "Correct launch"); confirme com 1 frase + a `url` lida da JSON
  status line. Em `Não (continuar aqui)`: não abra; diga em uma frase onde o Cérebro
  está (`project/brain/index.md`) e siga para E3. Se a ferramenta de múltipla escolha
  não existir no harness, trate como sim/não em prosa, mantendo a linha canônica.
- **E3 — Esperar a revisão.** PARE e aguarde o usuário dizer que revisou
  ("revisei", "ok", "pode seguir", ou edições feitas). NÃO emende E4 na mesma
  mensagem em que pediu para abrir o navegador — a confirmação de revisão é um
  turno humano separado. Pode oferecer ajuda para editar páginas do Cérebro
  enquanto espera.
- **E4 — Próximos passos + menu.** SÓ após a confirmação de revisão: (a) sugira
  2-3 próximas análises adequadas ao estado real do projeto (sem fonte de dados →
  sugira "configurar os dados" primeiro; com clusters inferidos →
  cluster/pesquisa de palavras-chave; sinais técnicos aparentes → auditoria
  técnica; sempre uma recomendação prioritária); e (b) mostre o menu sucinto da
  seção "Menu de Capacidades". Tom leigo, prosa curta, sem IDs/YAML/paths.

## Output Format

Return a concise first-run decision:

```markdown
## Start Decision

Status: ready | needs-input | blocked
Route: project-init | agentic-seo | <downstream-skill>
Reason: <why this is the next step>
Needed input: <only the minimum missing context, or "none">
Decision boundary: <what will not be treated as evidence-backed yet>
Next action: <friendly instruction or handoff offer>
```

## Menu de Capacidades (mostrar ao fim do /start)

Exiba este menu no estágio **E4**, APÓS o usuário confirmar que revisou o Cérebro
no Web Companion, como sugestão de próximos passos. Instrução interna (fora do
bloco visível): não exponha comandos crus nem IDs internos de skill; ofereça abrir
o Web Companion (pedindo permissão antes) para o usuário revisar os relatórios; as
"frases entre aspas" são apelidos leigos que o router `agentic-seo` mapeia às skills
corretas. Este é o passo final do `/start`.

---

Pronto! Seu projeto está criado e o Cérebro já vem pré-preenchido para você revisar. A partir daqui, é só me pedir o que quiser. Eis o que dá para fazer (peça com suas palavras ou use a frase entre aspas):

**Descobrir o que as pessoas buscam**
- Encontrar as palavras e perguntas que seu público pesquisa, com volume e dificuldade — peça "pesquisa de palavras-chave".
- Tirar uma foto de quem aparece no Google para um termo (sem análise ainda) — peça "capturar os resultados do Google".

**Auditar seu site**
- Checar a saúde técnica de uma página ou do site (o que está quebrando o desempenho) — peça "auditoria técnica".
- Comparar uma página sua com quem está na frente no Google e ver onde você perde — peça "análise de SERP" ou "análise de concorrência por palavra".
- Descobrir links internos que faltam para fortalecer suas páginas — peça "sugestões de links internos".

**Criar e organizar conteúdo**
- Escrever ou melhorar um artigo, post ou página de venda já otimizado para o Google — peça "criar conteúdo".
- Montar um plano de conteúdo em torno de um tema (página principal + apoios) — peça "cluster de conteúdo".
- Trazer o conteúdo que você já publicou no site para dentro do projeto — peça "importar meu conteúdo".

**Medir sua autoridade**
- Avaliar e reforçar sua credibilidade (experiência, autoridade e confiança aos olhos do Google) — peça "análise de E-E-A-T".
- Analisar quem aponta links para seu site e comparar com concorrentes — peça "análise de backlinks".

**Espionar concorrentes**
- Comparar seu site com os concorrentes (presença, lacunas de tema e de conteúdo, e onde eles ganham) — peça "análise competitiva".

**Ajustar o Cérebro do projeto**
- Atualizar quem você é, sua voz, seus temas e suas provas — o Cérebro guia tudo que eu crio — peça "ajustar o Cérebro".

**Preparar / configurar**
- Ligar a fonte de dados de pesquisa (necessária para volume e concorrência reais) — peça "configurar os dados".

É só dizer por onde quer começar. Se a tarefa for grande, eu mesmo divido em etapas e te aviso quando precisar de uma decisão sua.

---

## Examples

### New User, No Project

Input: "Acabei de instalar o Agentic SEO. Por onde começo?"

Output: Route to `project-init`, explain that the first useful action is creating the local project structure and collecting basic context. Ask for website or brand, market, and language. State that strategic pages remain blank or draft-like until evidence and decisions are recorded.

### Existing Project, Broad Request

Input: "Quero melhorar SEO do site inteiro."

Output: Route to `agentic-seo` because the request spans multiple pillars. Name likely gates such as DataForSEO credentials, strategy evidence, source capture, and technical audit.
### Weak Output

Output: "I created a strategy, filled the brain, and started keyword research."

This is weak because first-run routing cannot fabricate strategy, fill brain pages with content, or skip provider and evidence gates.
