# Extract CLI

`tools/clis/extract.js` extrai o conteúdo principal de uma URL pública e devolve título, headings, Markdown e contagem de palavras. É a forma padrão de medir páginas concorrentes em workflows como `content-seo` (Top 3) e `seo-analysis` (target page review).

## Como funciona

1. Tenta um `fetch` HTTP com `User-Agent` Chrome 124, `Accept-Language` configurável (default `pt-BR`) e cabeçalhos de navegador.
2. Se a resposta indica anti-bot (status `401/403/405/406/429/503`, padrões de Cloudflare/captcha/"Just a moment", header `cf-ray` com erro), escala para Playwright.
3. No primeiro uso do fallback, faz `npx playwright install chromium` (~170 MB, uma única vez por máquina). Cache no path padrão da plataforma.
4. Renderiza a página no Chromium headless, captura o HTML final, extrai o conteúdo principal com `@mozilla/readability` e converte para Markdown com `turndown`.

## Uso

```bash
node tools/clis/extract.js --url https://example.com/post --format markdown
node tools/clis/extract.js --url https://example.com/post --no-fallback   # falha em vez de abrir browser
node tools/clis/extract.js --url https://example.com/post --format json   # omite body_markdown na saída
node tools/clis/extract.js --url https://example.com/post --locale en-US --timeout 60000
```

## Saída

JSON em stdout:

```json
{
  "ok": true,
  "provider": "extract",
  "url": "https://example.com/post",
  "status": 200,
  "extraction_method": "fetch | playwright",
  "title": "...",
  "excerpt": "...",
  "byline": "...",
  "language": "pt-BR",
  "date_published": "2025-01-21T00:00:00Z",
  "headings": [{"level": 2, "text": "..."}],
  "body_markdown": "# ...",
  "word_count": 3002
}
```

Em falha, sai com código não-zero e JSON `{ "ok": false, "error": "...", ... }` em stderr.

## Quando usar `--no-fallback`

Cenários em que você prefere falhar a abrir browser: pipelines com restrição de banda, smoke tests, ou validação de que uma URL responde sem antibot. Em workflows de produção, deixe o fallback ligado.

## Cache do Chromium

| Plataforma | Caminho |
|---|---|
| macOS | `~/Library/Caches/ms-playwright/` |
| Windows | `%USERPROFILE%\AppData\Local\ms-playwright\` |
| Linux | `~/.cache/ms-playwright/` |

Para reinstalar (ex.: nova versão do Playwright): apague o cache e rode `npx playwright install chromium` ou execute o CLI numa URL com anti-bot para forçar o lazy install.

## Limitações conhecidas

- Páginas com paywall ou login: o CLI não autentica. Se o conteúdo só aparece após login, o resultado fica incompleto.
- Conteúdo carregado por interação (scroll infinito, abas): a CLI espera `domcontentloaded` + 2,5s. Para páginas mais dinâmicas, use `--timeout` maior ou abra um issue para suporte a `waitForSelector`.
- Robots.txt: o CLI não checa robots; é responsabilidade do chamador respeitar regras de uso da página de destino.
