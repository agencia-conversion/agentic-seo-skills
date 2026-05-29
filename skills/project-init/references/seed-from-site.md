# Pré-preenchimento do Cérebro a partir do site

Este passo é opcional. Ele só roda quando o usuário, no início do setup (Passo 0),
autoriza pré-preencher o Cérebro pesquisando o site. Sob essa **autorização prévia
do Passo 0**, este passo ESCREVE DIRETO nas páginas do Cérebro (`project/brain/`)
para o usuário revisar e editar no Web Companion. Ele NÃO usa `workbench/` nem exige
registro `type: approval`: esta é a regra do **ONBOARDING** (autorização prévia),
distinta do fluxo `brain-keeper`. Ele NUNCA roda sozinho (sempre depende do "sim" do
Passo 0) e NUNCA inventa fatos, métricas ou decisões.

> Tom e progresso para leigos: ver `docs/output-and-tone.md`. Explique o termo
> técnico em linguagem simples na primeira menção (ex.: "Cérebro do projeto",
> "importar fontes").
>
> Trabalho silencioso: a seleção/leitura das URLs e a coleta da info adicional
> acontecem no agente principal (que tem web fetch e canal com o usuário); o
> subagente recebe esses dados prontos. O usuário vê só o checklist nativo e o
> Cérebro já preenchido para revisar — nunca comandos crus, URLs de debug nem
> exploração.

## Quando este passo se aplica

- O usuário escolheu pré-preencher o Cérebro (`prefill_choice: from_site`).
- Existe um `site_url` válido em `project/.agentic-seo/project.json` (ou o usuário
  informou a URL do site principal).
- A estrutura básica do projeto já foi criada (diretórios + arquivos do Cérebro
  a partir dos templates). O pré-preenchimento acontece DEPOIS do setup básico,
  nunca no lugar dele.

Se não houver `site_url`, este passo não roda: peça a URL ou siga com o Cérebro
em branco (`prefill_choice: blank`).

## O que este passo faz (e o que NÃO faz)

Faz:

1. Combina DUAS fontes de insumo: (a) as extrações das até 10 URLs do site
   (`site_extractions`) e (b) as **informações adicionais** que o usuário
   forneceu (`additional_info`: páginas-chave, posicionamento, diferenciais,
   público, concorrentes, dados). Ambas são entregues prontas pelo agente
   principal.
2. Compõe e ESCREVE as páginas do Cérebro (`identity`, `voice`, `technology`,
   `review`, `topic-clusters`, `index`) direto em `project/brain/`, combinando o
   que foi lido do site com a info adicional do usuário.
3. Registra a escrita no diário (`brain/log.md`) com `type: decision` e
   `approver` = nome do usuário (ele autorizou no Passo 0).
4. Abre/oferece o Web Companion em `project/brain/index.md` para o usuário revisar
   e editar (pedindo permissão antes de abrir o navegador).

NÃO faz:

- Não inventa fatos de marca, dados de mercado nem decisões técnicas.
- Não cria novas subpáginas de cluster (`brain/topic-clusters/<slug>.md`) por conta
  própria — isso continua exigindo o handoff `approve-cluster`.
- Não abre o navegador sem pedir permissão antes.

## Seleção das URLs (até 10)

Escolha um conjunto pequeno e representativo, não a maior quantidade possível.
Priorize, nesta ordem, as páginas que mais carregam identidade e tese:

1. Home (`/`).
2. Sobre / Quem somos / Sobre nós.
3. Serviços / Produtos / Soluções (a página-âncora da oferta).
4. Páginas de categoria ou pilar do blog.
5. Até 3-5 posts-chave (os mais recentes ou os mais ligados pela navegação).
6. Contato / Time, se ajudar a entender autoridade (E-E-A-T).

Regras:

- Máximo de 10 URLs. Pare em 10 mesmo que existam mais candidatas.
- Apenas o domínio principal (`site_url`); não siga para domínios externos.
- Pule páginas de login, carrinho, checkout, busca interna e páginas legais
  pouco informativas, a menos que sejam o único conteúdo disponível.
- Prefira páginas com texto real; descarte páginas quase vazias.

## Extração

Para cada URL, capture o que ajuda a montar o Cérebro:

- Título da página e meta descrição.
- Cabeçalhos (H1/H2) e o texto principal.
- Sinais de marca: aposto, promessa, frase âncora, público.
- Sinais técnicos visíveis: stack aparente, CMS, plataforma.
- Temas recorrentes (insumo para áreas editoriais e topic clusters).

Guarde as URLs efetivamente lidas; elas viram a evidência da ingestão.

## Informações adicionais do usuário (`additional_info`)

O seed combina o site com o texto/posicionamento/dados que o usuário forneceu.
Quando `additional_info` estiver presente, ela é **insumo obrigatório** da
composição — nunca apenas coletada e ignorada.

- **Seleção/leitura das URLs:** quando o usuário citar páginas-chave ou URLs
  específicas, priorize-as na seleção das até 10 (mantendo o teto de 10).
- **Distribuição por página do Cérebro:** mapeie cada tipo de conteúdo da
  `additional_info` para a página-alvo reaproveitando a tabela de distribuição de
  [`seed-from-doc.md`](seed-from-doc.md) — posicionamento/diferenciais/público →
  `identity`; tom desejado → `voice`; stack/plataforma → `technology`; temas e
  subtemas → `topic-clusters`; ofertas → `products` (opcional); regras editoriais
  → `review`.
- **Precedência em caso de conflito:** a informação fornecida pelo usuário é
  autoral e **tem prioridade** sobre a observação do site (o site é evidência
  observada). Mas dados/métricas sem comprovação continuam indo para o `log` como
  pendência, não para a prosa do Cérebro (ver "Regras duras de composição").

## Escrita das páginas do Cérebro

Escreva DIRETO em cada página do Cérebro (`project/brain/`), combinando o que foi
lido do site com a `additional_info` do usuário (insumo obrigatório quando presente):

- `index` — status atual e mapa (estrutura já existe; só preencher o que for
  observável).
- `identity` — aposto, parágrafo de apresentação, promessa, público,
  identidade técnica e canais.
- `voice` — princípios e registro inferidos do tom dos textos.
- `technology` — stack/CMS aparente; o resto fica de fora (não vira gap).
- `review` — regras editoriais específicas do projeto inferidas do material.
- `topic-clusters` — preencha as áreas editoriais H2 (tese, diferenciação,
  audiência, subtemas, provas) e o índice entre as sentinelas. NÃO crie subpáginas
  `brain/topic-clusters/<slug>.md` — isso exige o handoff `approve-cluster`.

Regras duras de composição:

- Escreva direto nas páginas de `project/brain/`, **preservando o frontmatter**
  (`title`/`updated`) e **qualquer conteúdo que o usuário já tenha escrito** (não
  sobrescreva conteúdo substantivo do usuário; o seed só preenche páginas ainda em
  estado de template/placeholder).
- Respeite a **no-gap rule** (ver `docs/brain.md`): nenhum `TODO`/`<fill>`/"a
  confirmar" no arquivo autoral. Onde a página não der base para um campo, **omita
  a subseção** (não deixe heading vazio) e mande a pendência para o `log` — não
  preencha por suposição.
- Não fabrique credenciais, números, casos, datas nem decisões. Se não está no
  site nem na info adicional, não entra na prosa do Cérebro.

## Registro no diário (log)

Anexe ao `brain/log.md` exatamente UMA entrada por execução do seed que tenha
alterado conteúdo (append-only, idempotente). Use o token do enum em inglês
`decision` e as chaves em inglês (ver formato em `AGENTS.md`):

```markdown
## YYYY-MM-DD - Cérebro pré-preenchido a partir do site

- type: decision
- scope: project/brain/ (páginas preenchidas pelo seed)
- decision: Cérebro pré-preenchido a partir do site (N páginas lidas) + informações adicionais do usuário, sob autorização prévia do Passo 0.
- evidence: <lista das URLs lidas> + <"informações adicionais fornecidas pelo usuário" quando houver>
- approver: <nome do usuário>
- notes: Onboarding/seed — autorização prévia (Passo 0). Páginas escritas direto no brain para revisão no Companion.
```

O `approver` é o **usuário** (ele autorizou no Passo 0), não `agent`.

## Revisão no Companion (autorização prévia, sem gate de promoção)

Não há mais mover `workbench/`→`brain/` nem registro `type: approval`: as páginas
já foram escritas direto no Cérebro. O usuário só revisa e edita o que já está lá.

- Ofereça abrir o Cérebro numa tela no navegador (handoff `project-browser`, ver
  `AGENTS.md` → "Browser handoff"), no modo detached e mirando o projeto do
  usuário — nunca preso a um Bash com timeout. **Peça permissão antes de abrir.**
- Após o usuário confirmar que revisou, siga para os próximos passos (ver o
  fechamento do `/start`).

Gates que CONTINUAM valendo (não relaxam no onboarding):

- Sempre pedir a autorização do usuário no Passo 0 antes de pré-preencher.
- Sempre pedir permissão ANTES de abrir o navegador.
- Criar NOVA subpágina de cluster (`brain/topic-clusters/<slug>.md`) continua
  exigindo o handoff `approve-cluster` — o seed só preenche as áreas editoriais e o
  índice em `topic-clusters.md`.
