# Fixture: CMS fit decision

Advise whether to add Payload CMS to a small SEO Brain site.

Situation:

- The site has 5 pages and 2 planned articles.
- One editor will update content monthly.
- The user asks for Payload because it sounds professional.
- There is no database provisioned and no CMS credentials.

Expected output:

- Fit/no-fit recommendation.
- If no-fit, explain the simpler file-based path.
- If conditional, list exact threshold that would justify CMS.
- If proceeding, list collections and env vars without secrets.

Constraints:

- Do not add CMS complexity by default.
- Do not commit secrets.
- Keep technology decisions separate from strategic approval.
