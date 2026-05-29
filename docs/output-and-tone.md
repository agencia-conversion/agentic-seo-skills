# Output e Tom (guia compartilhado)

Guia de comunicação para todas as skills de onboarding e de uso direto pelo usuário (por exemplo `start`, `agentic-seo`, `project-init`). O onboarding precisa funcionar para milhares de pessoas diferentes, muitas leigas em SEO (founders, marketing, estrategistas). A regra geral é simples: **fale como você falaria com um cliente esperto que não é técnico.**

As regras de idioma e acentuação continuam em `AGENTS.md` (seção "Language Fidelity"). Este guia trata só de **tom** e **como mostrar progresso**. Em caso de conflito sobre idioma/acentos, `AGENTS.md` vence.

## 1. Tom para leigos

- Escreva em pt-BR claro, amigável e direto. Sem tequniquês.
- **Explique antes de usar o termo técnico.** Na primeira vez que um termo técnico aparecer em texto para o usuário, escreva a versão simples e ponha o termo técnico entre parênteses. Depois disso, use só a versão simples.
- Nunca despeje siglas, nomes internos de gates, ou jargão de produto sem traduzir.

### Glossário leigo → técnico

Use a coluna "Como dizer ao usuário" no texto. A coluna técnica é só para a sua própria orientação.

| Como dizer ao usuário (1ª menção entre parênteses) | Termo técnico |
|---|---|
| Cérebro do projeto — a memória da sua marca que a IA usa | brain / `project/brain/` |
| estrutura de pastas e arquivos em branco para você preencher | scaffold / seed / blank templates |
| áreas de trabalho | pillars |
| fonte de dados de SEO (ex.: DataForSEO) — de onde vêm os números reais de busca | provider / DataForSEO |
| verificação de dados — antes de seguir, confirmamos que existe dado real | evidence gate / DataForSEO gate |
| seguir sem dados, com seu OK por escrito | bypass = você autoriza prosseguir mesmo sem os números reais |
| registro de aprovação no diário — você diz "aprovo" e a IA anota a data | `type: approval` em `brain/log.md` |
| abrir uma tela no navegador (no seu computador) | browser handoff |
| importar/trazer fontes | ingest sources / ingestion |
| próximo passo | downstream skill |
| pedido com várias coisas juntas | compound request |
| pode rodar de novo sem apagar o que você já preencheu | idempotent |
| cabeçalho do arquivo | frontmatter |
| campos para você preencher | placeholders |

Observação sobre o DataForSEO: deixe claro, quando o assunto surgir, que **não somos afiliados ao DataForSEO** — é apenas uma fonte de dados que você pode usar.

### Tipos de registro do diário (`brain/log.md`)

Os tokens do enum ficam em inglês (ver `AGENTS.md`). Quando precisar mostrar ou citar um registro do diário ao usuário, traduza o tipo:

`approval` = aprovação · `decision` = decisão · `correction` = correção · `lint` = revisão de consistência · `ingestion` = importação de fontes · `publication` = publicação · `evidence` = evidência/comprovação.

## 2. Feedback simples

- Respostas curtas: no máximo **1-2 frases sobre o que você fez + uma frase com o próximo passo claro**.
- Não despeje os passos internos da skill, nem blocos YAML, nem saída bruta de ferramenta para o usuário leigo. Os blocos de Output Format das skills são **uso interno do agente / contrato para o próximo passo**; a mensagem visível ao usuário deve ser sempre prosa simples.
- Termine sempre indicando o que vem a seguir ou o que você precisa dele.

### Exemplos

Ruim (jargão e despejo de processo):
> Routing request to canonical agentic-seo. Initialized blank brain templates and scaffolded project structure. DataForSEO gate is pending — awaiting credentials. Output: `status: needs_input, gates.dataforseo: blocked`.

Bom (curto e claro):
> Criei a estrutura do seu projeto e os arquivos do Cérebro do projeto (a memória da sua marca) em branco, prontos para você preencher. Próximo passo: me diga o nome do site e o mercado dele.

Ruim:
> Browser handoff established with one-time token, local host binding, shutdown after submit/cancel/TTL.

Bom:
> Vou abrir uma tela no seu navegador (uma página local e temporária, que se fecha sozinha depois) para você configurar a fonte de dados de SEO (ex.: DataForSEO). É só preencher e confirmar.

## 3. Progresso portátil

Mostre o progresso de forma que funcione em qualquer agente (Claude Code, Codex, Antigravity).

- Use o **checklist nativo do harness (TodoWrite no Claude Code)** como a lista de progresso visível: **uma etapa por linha**, em linguagem de usuário, e marque cada item ao concluir (atualize a lista no lugar, não repita tudo em prosa).
- Exemplo de etapas para o setup: "Criar a estrutura do projeto" · "Coletar o nome do site e o mercado" · "Criar os arquivos do Cérebro em branco" · "Abrir a tela para configurar a fonte de dados de SEO" · "Anotar a decisão no diário".
- A **narração em prosa é mínima**: a lista carrega o detalhe; o texto só diz o essencial (o que acabou de acontecer + próximo passo).
- **Sem dependência externa.** O progresso não pode depender de Ruflo nem de nenhum MCP externo. Onde não houver um checklist nativo, descreva o progresso como uma lista curta de etapas em prosa, mas o comportamento é o mesmo: uma etapa por linha, atualizada no lugar. O onboarding precisa funcionar para qualquer usuário sem nenhuma instalação extra.

## 4. Como referenciar este guia

Skills canônicas devem ser **arquivos `SKILL.md` autossuficientes** (ver `AGENTS.md`, que proíbe reads obrigatórios via `skills/_shared/`). Por isso:

- **Não** transforme este guia em leitura obrigatória de runtime nem o coloque em `references/` de uma única skill.
- Dentro de cada `SKILL.md`, incorpore as regras de tom/feedback/progresso diretamente no corpo (curtas), e, se útil, deixe **apenas um lembrete em uma linha** apontando para este guia como referência de desenvolvimento: `Ver docs/output-and-tone.md para tom e progresso.`
- Mantenha este arquivo como a **fonte única** das regras de tom e do glossário, para as skills não divergirem. Se o glossário mudar, atualize aqui.
