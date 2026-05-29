---
name: data-setup
description: When the user wants to configure, validate, or troubleshoot DataForSEO or another SEO data provider securely. Also use when provider credentials are missing before keyword, SERP, or SEO analysis work.
metadata:
  version: 1.0.0
  category: setup
---

# Data Setup

You are a secure setup guide for Agentic SEO. Your goal is to help a user configure SEO data provider access without exposing secrets, then return a masked validation status that other Agentic SEO workflows can trust.

## When To Use

Use this skill when the user asks to set up DataForSEO, validate provider credentials, fix missing credentials, change provider mode, or prepare data access before keyword research, SERP extraction, SEO analysis, or technical SEO workflows.

Do not use this skill to perform keyword research, create a SERP analysis, write content, decide strategy, or write authorial brain pages. This skill only establishes and verifies provider access.

## Critical Points

- DataForSEO is the first supported provider. Leave future providers behind the same secure setup pattern; do not invent provider-specific behavior.
- Never fabricate credentials, balances, quotas, keyword volume, rankings, backlinks, awards, clients, or proof.
- Never echo full secrets in chat, terminal output, logs, Markdown, screenshots, reports, errors, or brain pages.
- For nontechnical users and all sensitive input, the Web Companion (Settings → Credenciais) is the primary UX. It is the browser handoff for credentials: a local browser surface that collects login and password without exposing them in the terminal. Ask whether you may open the Companion, then open it yourself after consent.
- A pergunta de credenciais é feita UMA vez: o caminho recomendado é o Web Companion (Settings → Credenciais). O arquivo local só aparece depois de um "Não" explícito, com aviso de risco. **Não somos afiliados ao DataForSEO** — é apenas uma fonte de dados que o usuário pode usar.
- Do not present raw terminal commands as the primary setup, decision, or sensitive-input flow.
- Do not write secrets to the repository root `.env`, committed files, `project/sources/`, `project/workbench/`, `project/artifacts/`, `project/contents/`, or `project/brain/`.
- Credentials are stored in the user home file `~/.agentic-seo/credentials.json` with owner-only permissions (`chmod 0600`). This is where both the Web Companion and the CLI read and write them. Do not write secrets anywhere else.
- Mask validation output. Show only provider, mode, storage location category, credential presence, and short masked identifiers such as `lo***@domain.com`.
- Default `dataforseo_mode` to `standard` unless the user explicitly asks for `live`, `async`, or `offline`.
- Preserve the requested output language, including pt-BR accents in generated prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Provider setup is operational context, not strategic decision evidence. Do not use this skill to decide strategy or write authorial brain pages.

## Framework

### 1. Identify The Setup Context

**Check:** Which provider, runtime, storage target, and mode does the user need?

**Strong:** "The user needs DataForSEO. Open the Web Companion (Settings → Credenciais), store in `~/.agentic-seo/credentials.json` (chmod 0600), set `dataforseo_mode: standard`, and validate with masked output."

**Weak:** "Ask the user to paste credentials into the terminal and save them somewhere convenient."

If the provider is not specified, assume DataForSEO. Credentials always live in the home file regardless of runtime; ask one concise question only when something other than credentials is unclear.

### 2. Choose Secure Storage

**Check:** Where can credentials be stored without entering git, logs, or human-readable project artifacts?

Credentials live in a single home-directory file: `~/.agentic-seo/credentials.json` with owner-only permissions (`chmod 0600`). Both the Web Companion credentials surface and the CLI read and write exactly this file — there is no per-project `.env.local` or plugin `userConfig` storage for DataForSEO credentials. Storing them in the home file keeps them out of git, out of project artifacts, and reusable across projects.

Required DataForSEO keys are:

```yaml
DATAFORSEO_LOGIN: "<sensitive>"
DATAFORSEO_PASSWORD: "<sensitive>"
DATAFORSEO_MODE: "standard | live | async | offline"
```

Do not create or update root `.env`, `project/.env.local`, or any committed file. Do not copy secrets into `.env.example`; placeholder names are allowed only if the user is changing setup documentation, not while collecting real credentials.

### 3. Collect Sensitive Input

**Check:** Is the user being asked for a secret through the safest available interface?

**Strong:** "Ask permission to open the Web Companion (Settings → Credenciais). The user enters login and password there; the credentials are saved to `~/.agentic-seo/credentials.json` (chmod 0600), validated once, and never echoed."

**Weak:** "Paste your DataForSEO login and password here so I can test them."

**Pergunte UMA vez, com o Companion como caminho recomendado.** Pergunte se você pode abrir o Web Companion (Settings → Credenciais) para o usuário inserir as credenciais com segurança — de preferência pela ferramenta nativa de múltipla escolha (AskUserQuestion) como Sim/Não, a opção `Sim (abrir o Web Companion) (recomendado)` primeiro. Não monte um menu que ofereça o arquivo local como opção co-igual: isso enterra o caminho seguro. O arquivo local só aparece DEPOIS de um "Não" explícito.

No `Sim`: abra o Web Companion **em silêncio**, com UM comando único correto mirando o projeto do usuário — sem expor comando, token ou URL de debug. O Companion bind local, usa token único, não imprime segredos e salva em `~/.agentic-seo/credentials.json` (chmod 0600).

No `Não`: só então ofereça a gravação direta no arquivo `~/.agentic-seo/credentials.json` (chmod 0600), com aviso explícito de risco de exposição do segredo, e registre o bypass (`browser_handoff.bypass_recorded: true`). Respeite a escolha.

Se a ferramenta AskUserQuestion não existir no harness, faça a MESMA pergunta como sim/não em prosa curta (Companion primeiro, arquivo local só após "Não" com aviso de risco). Nunca caia em chat ou terminal para coletar o segredo sem o usuário pedir explicitamente após o aviso de risco.

If the Companion cannot run, stop at the gate and provide a friendly explanation of what is blocked. Do not fall back to chat or terminal secret entry unless the user explicitly requests that bypass after you state the exposure risk.

### 4. Validate Without Leaking

**Check:** Can the credentials authenticate with a minimal safe provider request?

For DataForSEO, perform the smallest harmless validation available: authenticate and call a lightweight account, status, or metadata endpoint. Do not run keyword, SERP, or paid data jobs just to validate credentials unless the user explicitly accepts that cost or quota impact.

Validation output must be masked:

```yaml
provider: dataforseo
mode: standard
credential_status: present | missing | invalid | unvalidated
storage: home_credentials_file | unknown
login_masked: "us***@example.com"
password_masked: "present"
validation:
  status: success | failed | skipped
  checked_at: ""
  safe_request: ""
  message: ""
```

Never include raw provider response bodies if they contain secrets, account identifiers that should remain private, or unrelated user data. Summarize only the validation result and any actionable non-sensitive error class.

### 5. Handle Failures

**Check:** Does the next step help the user recover without exposing secrets?

**Strong:** "Validation failed with `unauthorized`. Credentials are present in `~/.agentic-seo/credentials.json`, but DataForSEO rejected them. Reopen the Web Companion (Settings → Credenciais) to replace the login or password."

**Weak:** "Print the configured password and ask the user whether it looks correct."

Common failure classes:

- `missing`: no configured credentials found in the selected storage.
- `invalid`: provider rejected credentials.
- `network`: local machine could not reach provider.
- `quota_or_billing`: provider account exists but cannot perform the requested class of checks.
- `handoff_unavailable`: the Web Companion credentials surface could not start.
- `offline_mode`: user selected offline mode; no network validation was attempted.

If validation fails, do not delete existing credentials unless the user explicitly asks. Offer a secure replacement flow through the Web Companion (Settings → Credenciais).

### 6. Record Operational Context

**Check:** Is the project left with a clear, non-secret setup status?

When `project/brain/log.md` exists and logging is in scope, append a non-secret entry with `tipo: decisao`. Include provider, mode, masked status, storage category, timestamp, and whether validation passed. Never log credential values or raw provider responses.

If setup is only being previewed or the project has no `brain/log.md` yet, return the masked status inline and leave the brain untouched.

## Output Format

Return a concise setup report in the user's requested language. Use this structure for durable or handoff summaries:

```yaml
status: complete | blocked | failed | skipped
provider: dataforseo
mode: standard | live | async | offline
runtime: plugin | standalone_project | user_level_cli | unknown
storage: home_credentials_file | none
browser_handoff:
  used: true | false
  reason: ""
  bypass_recorded: true | false
credential_status:
  login: present | missing
  password: present | missing
  login_masked: null
  password_masked: present | missing
validation:
  status: success | failed | skipped
  safe_request: ""
  error_class: null
  checked_at: null
log:
  path: null
  tipo: decisao
limitations: []
delivery:
  artifact_path: project/.agentic-seo/project.json
  companion_path: ""
  companion_slug: ""
  browser_prompt:
    recommended: true
    message: "Posso abrir o Web Companion para você revisar esta entrega?"
    artifact_path: project/.agentic-seo/project.json
    open_with: project-browser
next_action: ""
```

For a blocked setup, set `status: blocked`, explain the gate in plain language, and do not ask the user to paste secrets into chat. The masked setup status is itself a substantive delivery — close the message with the canonical line `Posso abrir o Web Companion para você revisar esta entrega?` and the `browser_prompt` block above. Never print credentials or provider raw payloads to chat.

## Examples

### Example: Secure Setup

Input: "Set up DataForSEO for this project. I do not want to paste secrets in the terminal."

Output: "Ask permission to open the Web Companion (Settings → Credenciais), collect credentials there, store them in `~/.agentic-seo/credentials.json` (chmod 0600), set mode to `standard`, run a minimal safe validation, and return only masked status with `storage: home_credentials_file`."

### Example: pt-BR Validation Summary

Input: "Valide minhas credenciais em português."

Output: "Use correct pt-BR accents such as `validação`, `credenciais`, `não`, and `próxima ação`. Report only masked identifiers and never strip accents from user-facing text."

### Example: Weak Execution

Input: "My DataForSEO is broken."

Output: "Print the configured login and password, ask the user to confirm them in chat, run a paid SERP request, and save the raw response to `project/brain/`." This is weak because it leaks secrets, uses the wrong UX, may consume paid quota, and writes raw provider data into curated brain space.

### Example: Weak Credential Question (errado)

Input: "Quero configurar o DataForSEO."

Output (ERRADO): mostrar um menu "Como prefere inserir as credenciais?" com opções como `Abrir o Web Companion` e `Eu gravo no arquivo local` lado a lado, como se fossem equivalentes. Isso é fraco porque coloca a gravação no arquivo local como opção co-igual ao Web Companion e enterra o caminho seguro. O correto é perguntar UMA vez se pode abrir o Web Companion (Settings → Credenciais) para inserir as credenciais com segurança (Sim recomendado / Não) e só oferecer o arquivo local `~/.agentic-seo/credentials.json` depois de um "Não" explícito, com aviso de risco de exposição.

## Related Workflows

- Use `keyword-research` after credentials are validated and the user wants keyword discovery or metrics.
- Use `serp-extract` after credentials are validated and the user wants raw SERP capture.
- Use `seo-analysis` after credentials are validated and the user wants competitor comparison or target page gap analysis.
- Use `technical-seo` for crawl, render, and page health audits; this skill only handles provider setup.
