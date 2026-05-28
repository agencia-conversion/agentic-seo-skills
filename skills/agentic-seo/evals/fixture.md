# Fixture: route a compound SEO request

The user says:

> Quero criar um cluster de conteúdo sobre SEO agêntico, escrever o primeiro artigo e publicar um site simples.

Project state:

- No DataForSEO credentials.
- `brain/identity.md` has logged content (matching `type: decision` entry in `brain/log.md`).
- `brain/voice.md` is empty (placeholders untouched).

Expected output:

- Route the request through the right skills.
- Identify that this is compound work and needs a spec.
- Name the missing gates and consequences (DataForSEO + voice).
- Offer browser handoff for DataForSEO setup or bypass decision capture.

Constraints:

- Do not skip missing data or voice gates.
- Do not present the site/article as done.
- Mark website publication as outside the Agentic SEO skill scope.
- Preserve pt-BR accents.
