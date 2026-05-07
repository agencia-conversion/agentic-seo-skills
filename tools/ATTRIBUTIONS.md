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
  - Added `~/.seo-brain/credentials.json` lookup.
  - Added stable JSON success/error envelopes.
  - Added offline fixture responses for tests.
  - Switched SERP endpoint to advanced organic output for SEO Brain parity.
  - Added keyword suggestions command and SEO Brain naming.

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
  - Rewritten around SEO Brain credential policy, offline/dry-run modes, and anti-fabrication rules.
  - Removed unrelated marketing skill references.
