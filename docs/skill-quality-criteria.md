# Skill Quality Criteria

Each SEO Brain skill must have a clear contract, fixtures, evaluation criteria, and an Autoresearch loop before becoming part of the default workflow.

## Shared Skill Contract

Every skill should define:

- purpose;
- when to use it;
- required inputs;
- optional inputs;
- files it may read;
- files it may write;
- external APIs it may call;
- user-facing output;
- approval gates;
- deterministic checks;
- failure modes;
- quality score.

## Shared Evaluation Rubric

Default score: 100 points.

- 20 points: follows project Wiki context and cites relevant pages.
- 15 points: produces the expected artifact format.
- 15 points: uses real data when the task requires data.
- 15 points: avoids unsupported claims and separates evidence from synthesis.
- 10 points: asks for human judgment only at real decision points.
- 10 points: keeps output clear for nontechnical users.
- 10 points: updates index/log/status correctly.
- 5 points: keeps files scoped and does not leak secrets.

Promotion threshold:

- 90+ for default workflow use.
- 80-89 for beta use with explicit caveat.
- below 80 must remain experimental.

## Foundation Skills

### project-init

Expected output:

- creates `projects/[slug]`;
- creates initial Wiki pages with frontmatter;
- creates project config;
- creates empty `sources`, `reports`, and `artifacts`;
- starts from templates without writing real secrets.

Acceptance criteria:

- idempotent when run twice;
- refuses unsafe slugs;
- never overwrites approved Wiki pages without a diff and approval;
- logs creation in `wiki/log/index.md`.

### ux-web

Expected output:

- starts a local web app;
- shows project dashboard, Wiki status, artifacts, previews, and approvals;
- hides terminal complexity from nontechnical users;
- supports credential setup without echoing secrets.

Acceptance criteria:

- works on a fresh project;
- shows all pending approvals;
- can render Markdown, reports, and web previews;
- gracefully explains missing credentials.

### wiki-maintainer

Expected output:

- ingests sources;
- updates index and cross-links;
- appends log entries;
- flags contradictions, stale claims, missing citations, and orphan pages.

Acceptance criteria:

- raw sources are not modified;
- strategic pages stay `draft` until approved;
- changed pages list sources and reasons;
- lint output is actionable.

## Strategy Skills

### topic-cluster

Expected output:

- cluster map;
- pillar pages;
- supporting pages;
- user intent by cluster;
- business value hypothesis;
- information-completeness gaps;
- keyword evidence when DataForSEO is available.

Acceptance criteria:

- does not cluster only by keyword similarity;
- includes conversion/business rationale;
- separates data-backed volume from strategic judgment;
- updates `wiki/conteudos/topic-clusters.md`.

### eeat

Expected output:

- complete EEAT profile;
- evidence inventory;
- author/entity recommendations;
- missing proof gaps;
- external corroboration opportunities.

Acceptance criteria:

- cites existing web evidence or project sources;
- never invents credentials, awards, clients, or experience;
- marks unverified claims as gaps;
- requires explicit approval for `wiki/eeat.md`.

## Technology Skills

### next-website-creator

Expected output:

- Next.js SSG website in `projects/[slug]/web`;
- home, services/products/features, blog index, blog post, contact page;
- metadata, sitemap, robots, schema foundation;
- clean default design based on `design.md`.

Acceptance criteria:

- builds successfully;
- pages are statically renderable by default;
- Lighthouse/SEO baseline passes local checks;
- content is editable from structured files or CMS.

### payload-cms

Expected output:

- Payload setup with editorial collections;
- local dev instructions surfaced in web UI;
- Vercel deployment path;
- content model aligned to SEO needs.

Acceptance criteria:

- no secrets committed;
- validates required env vars;
- supports blog posts, pages, authors, media, redirects, and SEO fields.

## Technical SEO Skill

### technical-seo

Expected output:

- deterministic TypeScript audit by page type;
- typed result schema;
- severity levels;
- repair suggestions;
- fixtures for known page templates.

Acceptance criteria:

- can test home, service/product, category, blog index, blog post, contact, author, and legal pages;
- extracts title, meta description, canonical, robots, headings, internal links, images, structured data, status, indexability, hreflang where applicable;
- does not rely on LLM judgment for pass/fail;
- produces JSON and human-readable report.

## Content Skill

### content-seo

Expected output:

- SERP analysis summary;
- briefing;
- outline;
- draft content;
- AI slop review;
- Wiki updates.

Acceptance criteria:

- follows Brazilian Portuguese title capitalization;
- avoids excessive bullets and ultra-short paragraph rhythm;
- avoids English-translated metaphors and generic AI phrasing;
- uses documented tone of voice;
- includes source-backed claims and citations.

## Data and Analysis Skills

### seo-analysis

Expected output:

- top 3 SERP comparison;
- extracted headings and meta tags;
- page intent and UX observations;
- content gaps;
- backlink/domain authority context when available;
- skyscraper-inspired improvement plan without blind imitation.

Acceptance criteria:

- uses real SERP data when credentials are available;
- records timestamp, location, language, device, and provider;
- extracts headings/meta deterministically from fetched URLs;
- separates ranking evidence from hypotheses.

### keyword-research

Expected output:

- keyword list;
- volume, difficulty/CPC when available;
- intent classification;
- clustering candidates;
- long-tail and entity opportunities.

Acceptance criteria:

- uses DataForSEO when configured;
- records request parameters;
- handles missing or partial API responses;
- does not fabricate volume.

### serp-extract

Expected output:

- raw SERP snapshot;
- normalized organic results;
- SERP features;
- top result URLs;
- metadata for geography/language/device.

Acceptance criteria:

- stores raw response in `sources/serp`;
- normalizes into stable JSON;
- deduplicates results;
- logs provider and timestamp.

### backlink-analysis

Expected output:

- aggregate backlinks;
- referring domains;
- top linking domains;
- anchor patterns when available;
- competitor comparison.

Acceptance criteria:

- identifies provider and freshness;
- marks unavailable data explicitly;
- avoids false precision.

### data-setup

Expected output:

- web UI tutorial for DataForSEO and future providers;
- secure credential entry;
- `.env` validation;
- masked status report.

Acceptance criteria:

- never displays full secrets;
- can validate DataForSEO credentials;
- writes `.env.local` or project config only with explicit user action;
- creates `.env.example` without real values.

