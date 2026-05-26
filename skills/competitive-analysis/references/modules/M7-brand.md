# M7 — Brand Positioning & Conversion Surface

Observable positioning, value proposition, social proof, pricing surface, and CTA design across players. Editorial risk is high; the schema enforces literal-excerpt-before-label.

## Inputs

- `target` (domain) and `competitors[]` (domains).
- Per-player `key_pages[]` (optional): defaults to homepage; can include `/sobre`, primary service/product pages.
- `brand_context`: read from `project/brain/identidade.md` and `project/brain/voz.md` when present; otherwise `brand_context: absent`.
- `attach_eeat_run: <slug>` (optional) for the project's own E-E-A-T baseline.

## Extraction surfaces (HTML deterministic)

- H1, hero subhead, hero CTA (text + position + destination URL).
- `## Sobre`/`## About` blocks when present.
- All CTA buttons/links above the fold and in the page's primary section.
- Logo strip / customer logos with adjacent attribution.
- Testimonials: text + name + role + company when visible.
- Numbers with adjacent citation/source (revenue, growth, customers); numbers without an adjacent citation move to `claims_unverified`, never to `proof_inventory`.
- Pricing surface: transparent (value shown), under-request (CTA "fale conosco"), hybrid, hidden.
- Title tag and meta description as compressed message.

## Compute rules

Every observation row must include `excerpt_literal` (max 200 chars) and `position` (`hero | above-the-fold | first-section | sticky | footer | modal`) BEFORE any qualitative label. Qualitative labels live under `synthesis` and reference the row id.

```yaml
positioning_table:
  - player: ""
    role: target | competitor
    h1:
      excerpt_literal: ""
      position: hero
    subhead:
      excerpt_literal: ""
      position: hero
    title_tag: ""
    meta_description: ""
    declared_differentiation:
      excerpt_literal: ""
      position: ""
    implicit_differentiation_observed:
      excerpt_literal: ""
      position: ""
cta_table:
  - player: ""
    cta_text: ""
    cta_position: hero | sticky | footer | modal | inline
    cta_destination: internal | external | anchor | form | calendar | demo | chat
    pressure_label: alta | media | baixa
    pressure_evidence:
      - excerpt_literal: ""
        position: ""
proof_inventory:
  - player: ""
    proof_type: logo | testimonial | number_with_source | award | certification
    excerpt_literal: ""
    position: ""
    source_or_attribution: ""
claims_unverified:
  - player: ""
    excerpt_literal: ""
    position: ""
    reason: "number without adjacent source"
pricing_table:
  - player: ""
    visibility: transparent | under_request | hybrid | hidden
    evidence:
      excerpt_literal: ""
      position: ""
differentiation_synthesis:
  brand_context: present | absent
  contrasts: []
  proposed_log_entry:
    tipo: decisao
    summary: ""
    evidence_refs: []
```

## Edge cases

- Logo carousel without adjacent attribution → `proof_type: logo` is allowed only when alt text or visible caption names the customer; otherwise move to `claims_unverified`.
- Pricing partially visible (faixa "a partir de") → `visibility: hybrid` with the excerpt.
- Hero is a video without overlay text → record `excerpt_literal: null` and position; do not transcribe video.
- Multi-language homepage detected with `hreflang`: extract from the project-language version.

## Anti-patterns

- Calling a CTA "agressivo" without an `excerpt_literal` + `position` row supporting it.
- Treating a customer logo as proof when it appears in a partner grid with no naming.
- Translating tone-of-voice observation into quality judgment ("amador", "fraco"). Stay descriptive.
- Auto-writing to `brain/identidade.md` or `brain/voz.md`. Only propose `tipo: decisao` log entries.
- Extracting numbers like "300% growth" without the adjacent source line; route to `claims_unverified`.
