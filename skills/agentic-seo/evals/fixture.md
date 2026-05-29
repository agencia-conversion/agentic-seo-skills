# Fixture: route a compound SEO request

The user says:

> Quero criar um cluster de conteúdo sobre SEO agêntico, escrever o primeiro artigo e publicar um site simples em Next.js.

Project state:

- No DataForSEO credentials.
- `brain/identity.md` has approved content (matching `tipo: approval` entry in `brain/log.md`).
- `brain/voice.md` is empty (placeholders untouched).

Expected output:

- Route the request through the right skills.
- Identify that this is compound work and needs a spec.
- Name the missing gates and consequences (DataForSEO + voice).
- Offer browser handoff for DataForSEO setup or written bypass.

Constraints:

- Do not skip missing data or voice gates.
- Do not present the site/article as done.
- Preserve pt-BR accents.
