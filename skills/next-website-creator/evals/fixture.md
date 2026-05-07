# Fixture: Next.js SSG website gate

Create a plan for generating a static SEO site for `Agência Exemplo`.

Available project context:

- `wiki/index.md` is approved.
- `wiki/tom-de-voz/index.md` is draft, not approved.
- There is one approved content artifact at `project/artifacts/contents/seo-agentico/draft.md`.
- The user asks for a home page, services page, blog index, and one blog post.

Expected output:

- Website build plan and file targets under `project/web/`.
- Clear dependency on approved content for the blog post.
- Build and local preview verification checklist.
- Blocked status for any page that depends on unapproved voice context.

Constraints:

- Do not create placeholder public articles as final delivery.
- Run/build expectations must be stated as agent actions, not commands handed to the user.
