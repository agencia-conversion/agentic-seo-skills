# Wiki Review Protocol

Reviewer obrigatório para qualquer skill que escreva em `project/wiki/**`. É um gate de agente, não um linter. Decisão é de julgamento; regex serve só como dica.

## Quando invocar

Toda skill que cria ou modifica arquivos sob `project/wiki/**` invoca este protocolo na lista de arquivos tocados no run atual, antes de reportar `done`. Skills que apenas leem o Wiki não invocam.

## Contrato do reviewer

Roda como sub-agente (Task tool, `general-purpose`) com contexto isolado. Recebe:

- lista explícita de caminhos de arquivos do Wiki tocados neste run;
- esta rubrica;
- acesso de leitura: arquivos da lista, fontes citadas em `sources:` de cada arquivo (em `../sources/`), `wiki/tom-de-voz/index.md` se `status: approved` (caso contrário, `null`), `AGENTS.md`.

O reviewer NÃO pode:

- modificar frontmatter (`status`, `owner`, `sources`, `judgment_level`, `approved_by`, `approved_at`);
- introduzir fato fora das fontes citadas;
- tocar em arquivos fora da lista recebida;
- ler ou modificar `sources/`.

Saída do reviewer: um de dois resultados.

- `no-op`: nenhuma mudança material necessária + uma linha de justificativa.
- `proposed-changes`: para cada arquivo, retornar `{ path, rewritten_content, change_types[], removed_sections[], softened_claims[], ai_tells_flagged[] }`.
  - `change_types` ∈ `polish | restructure | section-cut | claim-softened | ai-tells-flagged`.
  - `removed_sections`: nome da seção + motivo (sem fonte | hipótese em página estratégica | meta-comentário).
  - `softened_claims`: trecho original + trecho final + motivo (fonte não cobre).
  - `ai_tells_flagged`: lista de termos sinalizados, não removidos.

## Rubrica

Uma página pode ser `status: draft` (governança) e ainda assim ser final em prosa (artesanato). O reviewer cuida do artesanato, nunca do governance.

Regras duras — qualquer violação dispara `proposed-changes`:

1. Sem meta-comentário sobre o próprio doc no corpo. Frases como "Esta página é rascunho", "Rascunho derivado de…", parentéticas como "(provisório)" ou "(rascunho)" em headings. Boilerplate de aprovação vive apenas em uma seção `## Aprovação` no rodapé, e só quando a página tem `status: draft` e `judgment_level: strategic`.
2. Sem placeholders de trabalho: `preencher`, `a definir`, `a confirmar`, `(hipótese)`. Se a fonte não cobre, cortar a seção.
3. Sem tabelas vazias (header + linha de traços apenas).
4. Sem `Próximos passos`, `Hipóteses a validar`, `Decisões pendentes` em página com `judgment_level: strategic`. O Wiki guarda estado aprovado ou medido, nunca hipótese (regra do `AGENTS.md`). Ação concreta vai para a página operacional certa; ideia vaga é cortada.
5. Toda alegação factual deve ser rastreável em algum arquivo listado em `sources:` da própria página. Suavizar ou cortar quando a fonte não cobre.
6. Anti-slop em português brasileiro (do `AGENTS.md`): sem title case americano, sem metáforas literais do inglês, sem cadeia longa de parágrafos de uma linha, sem excesso de bullets, sem filler de IA.
7. Páginas estratégicas devem descrever estado, posicionamento e narrativa em prosa afirmativa, não em voz de briefing, instrução futura ou plano de execução. Exemplo ruim: "Diego Ivo deve ser posicionado como referência...". Exemplo bom: "Diego Ivo é uma referência...". Exemplo ruim: "O site deve apresentar Diego como...". Exemplo bom: "A narrativa pública apresenta Diego como...".

Sinais leves — flag, nunca auto-edita:

- AI-tells: "no fim do dia", "ecossistema", "sinergia", "alavancar", "robusto", "jornada" (uso abstrato), "no fundo".
- Hedging sem fonte: "talvez", "pode ser que", "provavelmente". Se há fonte, atribuir; se não há, cortar.

## Revision gate

Se o reviewer retornar `proposed-changes`, a skill chamadora:

1. NÃO persiste as mudanças em silêncio.
2. Pergunta ao usuário qual mecanismo de revisão usar:
   - in-chat: resumo em prosa + bloco de diff por arquivo;
   - browser handoff: peça permissão para abrir uma janela local no navegador e, com aceite, a skill chamadora executa o companion local. A página contém editor por arquivo (textarea pré-carregado com o v2 do reviewer, frontmatter editável), tabs de diff (vs v1, vs proposta), tabs de notas do reviewer (seções removidas, alegações suavizadas, AI-tells), botões de restaurar v1 / restaurar proposta. O usuário não aprova ou rejeita: ele submete o conteúdo final por arquivo. O ato de submeter é a aprovação. Não mostre comandos `node scripts/companion.mjs ...` como UX principal.
   Sugestão padrão: in-chat para ≤ 2 arquivos; handoff acima disso. A escolha é sempre confirmada com o usuário.

   Formato do `proposal.json` consumido pelo handoff:

   ```json
   {
     "summary": "Resumo geral em uma frase.",
     "files": [
       {
         "path": "wiki/index.md",
         "v2_content": "<conteúdo final completo, frontmatter intacto>",
         "change_types": ["polish", "section-cut"],
         "removed_sections": [{"name": "...", "reason": "..."}],
         "softened_claims": [{"original": "...", "final": "...", "reason": "..."}],
         "ai_tells_flagged": ["..."],
         "diff_summary": ["bullet 1", "bullet 2"]
       }
     ]
   }
   ```

   Salve o proposal em `.companion/proposals/<id>.json` (gitignored).

   Submit do handoff envia ao handler:

   ```json
   {
     "files": { "wiki/index.md": "<conteúdo final, frontmatter incluso>" },
     "approver": "Diego",
     "notes": "..."
   }
   ```

3. O handler valida que cada arquivo continua tendo frontmatter parseável, faz hash check do v1 contra o disco (rejeita se houve edição concorrente), persiste o conteúdo submetido e classifica cada arquivo:
   - `unchanged-from-v1`: usuário restaurou o original;
   - `accepted-v2`: usuário submeteu a proposta do reviewer sem edição;
   - `edited`: usuário editou em cima da proposta.
4. Registra uma única entrada em `wiki/log/index.md` como `type: operational-decision`, listando contagem por categoria e classificação por arquivo.

## Done criteria

A skill chamadora está `done` apenas quando uma destas vale:

- reviewer retornou `no-op`;
- usuário submeteu o handoff (qualquer combinação de classificações) e o log foi escrito;
- usuário cancelou explicitamente o handoff (v1 persiste, com entrada de log).
