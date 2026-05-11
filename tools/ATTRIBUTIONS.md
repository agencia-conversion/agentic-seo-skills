# Tool Attributions

## DataForSEO CLI

- Local file: `tools/clis/dataforseo.js`
- Status: `forked-from`
- Upstream repository: `https://github.com/coreyhaines31/marketingskills`
- Upstream source file: `tools/clis/dataforseo.js`
- Upstream commit: `906c2fb28e471c5b1d149d4159ec5ddb40b7c364`
- Upstream commit URL: `https://github.com/coreyhaines31/marketingskills/commit/906c2fb28e471c5b1d149d4159ec5ddb40b7c364`
- Upstream author: `coreyhaines31 <34802794+coreyhaines31@users.noreply.github.com>`
- License: MIT
- SPDX: `MIT`
- Local changes:
  - Deferred credential requirement so `help`, `status`, `--offline`, and `--dry-run` work without secrets.
  - Added `~/.agentic-seo/credentials.json` lookup.
  - Added stable JSON success/error envelopes.
  - Added offline fixture responses for tests.
  - Switched SERP endpoint to advanced organic output for Agentic SEO parity.
  - Added keyword suggestions command and Agentic SEO naming.

## DataForSEO Integration Guide

- Local file: `tools/integrations/dataforseo.md`
- Status: `adapted-from`
- Upstream repository: `https://github.com/coreyhaines31/marketingskills`
- Upstream source file: `tools/integrations/dataforseo.md`
- Upstream commit: `906c2fb28e471c5b1d149d4159ec5ddb40b7c364`
- Upstream author: `coreyhaines31 <34802794+coreyhaines31@users.noreply.github.com>`
- License: MIT
- SPDX: `MIT`
- Local changes:
  - Rewritten around Agentic SEO credential policy, offline/dry-run modes, and anti-fabrication rules.
  - Removed unrelated marketing skill references.

## Extract CLI

- Local files: `tools/clis/extract.js` and `tools/clis/lib/extract-*.js`
- Status: `original`
- Description: Cascading HTML extractor (fetch with Chrome UA → Playwright lazy install fallback) that returns Readability-cleaned Markdown and structural metadata.
- Runtime dependencies (declared in `package.json`):
  - `playwright` — Apache-2.0 (Microsoft).
  - `@mozilla/readability` — Apache-2.0 (Mozilla).
  - `jsdom` — MIT (jsdom contributors).
  - `turndown` — MIT (Dom Christie).
- Browsers: Chromium binary downloaded on demand by Playwright into the platform-default cache (`~/Library/Caches/ms-playwright`, `%USERPROFILE%\AppData\Local\ms-playwright`, `~/.cache/ms-playwright`).
