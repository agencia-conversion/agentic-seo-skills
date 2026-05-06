# Fixture: capture SERP evidence

Capture SERP evidence for two keywords:

- `seo agêntico`
- `seo com agentes`

Settings:

- location: Brazil
- language: pt-BR
- device: desktop
- provider mode: offline fixture

Expected output:

- Raw source path plan under `project/sources/serp/`.
- Normalized output shape with organic results and SERP features.
- Empty-result behavior for missing fixture data.
- Log entry plan.

Constraints:

- Do not infer intent beyond captured evidence.
- Preserve keyword order.
- Mark offline provider data as unavailable for live conclusions.
