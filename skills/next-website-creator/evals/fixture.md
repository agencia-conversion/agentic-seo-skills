# Fixture: Next.js SSG website gate

Create a plan for generating a static SEO site for `Agência Exemplo`.

Available project context:

- `brain/identity.md` has approved content (matching `tipo: approval` entry in `brain/log.md`).
- `brain/voice.md` is empty (no principles registered).
- There is one approved content artifact at `project/artifacts/contents/seo-agentico/draft.md`.
- The user asks for a home page, services page, blog index, and one blog post.

Expected output:

- Website build plan and file targets under `project/web/`.
- Clear dependency on approved content for the blog post.
- Build and local preview verification checklist.
- Blocked status for any page that depends on missing voice principles.

Constraints:

- Do not create placeholder public articles as final delivery.
- Run/build expectations must be stated as agent actions, not commands handed to the user.
