# Rascunho automático do Cérebro a partir do site

Este passo é opcional. Ele só roda quando o usuário, no início do setup, escolhe
"criar um rascunho automático" em vez do setup manual. Ele NUNCA roda sozinho e
NUNCA escreve direto nos arquivos autorais do Cérebro (brain/) sem aprovação.

> Glossário e tom para leigos: ver `docs/output-and-tone.md`. Sempre explique o
> termo técnico em linguagem simples na primeira menção (ex.: "Cérebro do
> projeto", "importar fontes").

## Quando este passo se aplica

- O usuário escolheu a opção (b) "rascunho automático (recomendado)".
- Existe um `site_url` válido em `project/.seo-brain/project.json` (ou o usuário
  informou a URL do site principal).
- A estrutura básica do projeto já foi criada (diretórios + arquivos do Cérebro
  em branco a partir dos templates). O rascunho automático acontece DEPOIS do
  setup básico, nunca no lugar dele.

Se não houver `site_url`, este passo não roda: peça a URL ou volte para o setup
manual (opção a).

## O que este passo faz (e o que NÃO faz)

Faz:

1. Seleciona até 10 URLs representativas do domínio principal.
2. Extrai o conteúdo dessas páginas (texto visível, títulos, descrições).
3. Compõe um RASCUNHO das páginas do Cérebro (identidade, voz, tecnologia,
   editorial, topic-clusters, index) com base apenas no que foi lido.
4. Marca o rascunho como pendente de aprovação e registra a coleta no diário
   (brain/log.md) com `tipo: ingestao`.
5. Apresenta o rascunho para o usuário revisar, editar e aprovar.

NÃO faz:

- Não escreve o rascunho direto nos arquivos autorais em `project/brain/`.
- Não inventa fatos de marca, dados de mercado nem decisões técnicas.
- Não promove o rascunho a contexto aprovado por conta própria.

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

## Composição do rascunho (pendente)

Componha um rascunho para cada página do Cérebro a partir do que foi lido:

- `index` — status atual e mapa (estrutura já existe; só preencher o que for
  observável).
- `identidade` — aposto, parágrafo de apresentação, promessa, público,
  identidade técnica e canais.
- `voz` — princípios e registro inferidos do tom dos textos.
- `tecnologia` — stack/CMS aparente; o resto fica como pendência.
- `editorial` — áreas editoriais inferidas dos temas recorrentes.
- `topic-clusters` — clusters semânticos inferidos.

Regras duras de composição:

- O rascunho fica em `project/workbench/` (área de trabalho), claramente marcado
  como RASCUNHO / pendente de aprovação. Não toque nos arquivos de `project/brain/`.
- Onde a página não der base para um campo, deixe o placeholder do template ou
  escreva "a confirmar" — nunca preencha por suposição.
- Não fabrique credenciais, números, casos, datas nem decisões. Se não está no
  site, não entra no rascunho.

## Registro no diário (log)

Anexe ao `brain/log.md` exatamente uma entrada de ingestão por execução do
rascunho automático. Use o token PT do enum: `ingestao` (sem "n" final; não
use "ingestion"):

```markdown
## YYYY-MM-DD - Coleta para rascunho automático do Cérebro

- tipo: ingestao
- escopo: project/workbench/ (rascunho do brain)
- decisao: Coletadas N páginas do domínio principal para compor rascunho do Cérebro.
- evidencia: <lista das URLs lidas>
- aprovador: pendente
- aprovado_em:
- notas: Rascunho pendente de revisão e aprovação humana. Não é contexto aprovado.
```

## Aprovação obrigatória

O rascunho não vira contexto estratégico aprovado até o usuário aprová-lo
explicitamente. Conforme AGENTS.md (linha 16) e a skill brain-keeper:

- Apresente o rascunho para o usuário revisar e editar. O caminho recomendado é
  abrir uma tela no navegador (handoff `project-browser`, ver AGENTS.md →
  "Browser Handoff"): ela mostra as páginas do Cérebro, coleta o aprovador e, no
  envio, grava a entrada `tipo: aprovacao` no `brain/log.md` automaticamente.
  Lance o handoff no modo persistente/detached — nunca preso a um Bash com timeout.
- Só ao receber aprovação explícita o conteúdo aprovado é movido para os
  arquivos de `project/brain/` e registrado com uma nova entrada `tipo: aprovacao`
  (com `aprovador` = nome humano e `aprovado_em` preenchidos).
- Sem essa aprovação, o rascunho permanece em `workbench/` e não é tratado como
  evidência por nenhuma outra skill.

Nunca auto-promova o rascunho. A ingestão registra que houve coleta; a aprovação
é um ato humano separado.
