# SEO Brain Refactor Architecture

Phase 1 defines the v1 target before any skill rewrite or deterministic split starts.

## Scope

The refactor has three separations:

- Narrative skills teach one task each and are self-sufficient.
- Deterministic tools live in `tools/` and provider CLIs.
- Runtime commands live in `src/commands/`, with `src/seo-brain.ts` restored later as a slim dispatcher.

`_legacy/` is a quarantined snapshot. The mappings below were produced from scoped legacy-consultation sub-agent reports and existing non-legacy tests.

## Skill Mapping

| legacy skill | v1 skill | disposition | scope change | fixture |
|---|---|---|---|---|
| `autoresearch` | `autoresearch` | keep | Explain the run loop narratively; keep command details as examples, not formal contracts. | `skills/autoresearch/evals/fixture.md` |
| `backlink-analysis` | `backlink-analysis` | keep | Focus on interpreting backlink evidence and tool outputs without inventing counts. | `skills/backlink-analysis/evals/fixture.md` |
| `content-seo` | `content-seo` | keep, internally phased | Teach brief, approval, write, check, and promote as one editorial workflow; make gates explicit. | `skills/content-seo/evals/fixture.md` |
| `data-setup` | `data-setup` | keep | Focus on secure credential setup and browser handoff; no terminal-first UX. | `skills/data-setup/evals/fixture.md` |
| `eeat` | `eeat` | keep | Keep E-E-A-T as evidence inventory plus rater consensus; no unsupported proof. | `skills/eeat/evals/fixture.md` |
| `internal-links` | `internal-links` | keep | Keep validation and before/after insertion context; apply only after review. | `skills/internal-links/evals/fixture.md` |
| `keyword-research` | `keyword-research` | keep | Teach seed expansion, volume interpretation, and null metrics handling. | `skills/keyword-research/evals/fixture.md` |
| `next-website-creator` | `next-website-creator` | keep | Keep SSG website creation; make approved content dependency visible. | `skills/next-website-creator/evals/fixture.md` |
| `payload-cms` | `payload-cms` | keep as optional technology skill | Narrow to CMS decision and setup, not generic website creation. | `skills/payload-cms/evals/fixture.md` |
| `project-init` | `project-init` | keep | Teach single-project setup, wiki seed, and market/language metadata. | `skills/project-init/evals/fixture.md` |
| `seo-analysis` | `seo-analysis` | keep, calibration target | Make SERP evidence, DataForSEO default, WebSearch bypass, and player score explicit. | `skills/seo-analysis/evals/fixture.md` |
| `seo-brain` | `seo-brain` | keep | Router/context skill; dispatches to one task skill without hiding bypasses. | `skills/seo-brain/evals/fixture.md` |
| `serp-extract` | `serp-extract` | keep as data skill | Keep as evidence capture, separate from interpretation. | `skills/serp-extract/evals/fixture.md` |
| `spec-driven` | `spec-driven` | keep | Required only for compound requests; create specs in workbench, not wiki. | `skills/spec-driven/evals/fixture.md` |
| `start` | `start` | retire or alias | Phase 2 should decide whether to omit it or make it a thin router to `seo-brain`. | `skills/start/evals/fixture.md` |
| `technical-seo` | `technical-seo` | keep | Deterministic audit interpretation; LLM does not decide pass/fail. | `skills/technical-seo/evals/fixture.md` |
| `topic-cluster` | `topic-cluster` | keep | Preserve curation on rerun; clearly mark hypothesis-only clusters. | `skills/topic-cluster/evals/fixture.md` |
| `wiki-maintainer` | `wiki-maintainer` | keep | Source ingestion, citations, contradictions, log updates, strategic approval boundaries. | `skills/wiki-maintainer/evals/fixture.md` |
| none | `seo-skills-creator` | new | Meta-skill for writing and evaluating narrative skills. | `skills/seo-skills-creator/evals/fixture.md` |
| none | `seo-tools-creator` | new | Meta-skill for porting deterministic provider tools with attribution. | `skills/seo-tools-creator/evals/fixture.md` |

## Command Mapping

| legacy command | target file | status | notes | parity fixture |
|---|---|---|---|---|
| `project-init` | `src/commands/project-init.ts` | split | Create single project and seed wiki/config. | Temp project, `pt-PT` metadata, log entry. |
| `wiki-lint` | `src/commands/wiki-lint.ts` | split | Required pages, broken wikilinks, strategic approval metadata, content leaks. | Fixture project with missing page and broken link. |
| `wiki-approve` | `src/commands/wiki-approve.ts` | split | Frontmatter approval and log append. | Draft strategic page approval. |
| `wiki-ingest` | `src/commands/wiki-ingest.ts` | split | Copy raw source into `sources/manual/` and log. | Temp Markdown source ingest. |
| `data-setup` | `src/commands/data-setup.ts` | split | Credential status and browser handoff path. | Env/home credential fixture, no network. |
| `serp-extract` | `src/commands/serp-extract.ts` | split | Raw and normalized SERP snapshots. | Offline and batch normalizer fixtures. |
| `keyword-research` | `src/commands/keyword-research.ts` | split | Volumes, suggestions, file/positional input collection. | Existing keyword normalizer and command output fixture. |
| `kw-volume` | `src/commands/keyword-research.ts` | merge as lean mode | Same data path; no independent implementation unless compatibility requires wrapper. | Lean JSON shape, no files written. |
| `backlink-analysis` | `src/commands/backlink-analysis.ts` | split | Summary, referring domains, anchors, sample backlinks, competitor deltas. | Mock DataForSEO report fixture. |
| `seo-analysis` | `src/commands/seo-analysis.ts` | split | SERP/WebSearch source selection, bypass logging, player score integration. | WebSearch bypass and player-score fixtures. |
| `topic-cluster` | `src/commands/topic-cluster.ts` | split | Data-backed and hypothesis-only cluster generation plus render-only. | Existing hypothesis e2e and curation-preserve fixture. |
| `eeat` | `src/commands/eeat.ts` | compatibility stub or omit | Legacy command is not the rater engine; skill/script owns real E-E-A-T flow. | Nonzero stub message if restored. |
| `content-seo` | `src/commands/content-seo.ts` plus phase helpers | split | Large state machine; helper modules may live under `src/commands/content-seo/`. | Existing content process e2e. |
| `technical-seo` | `src/commands/technical-seo.ts` | split | Deterministic audit JSON and reports. | Existing HTML fixtures by page type. |
| `next-website-creator` | `src/commands/next-website-creator.ts` | split | Project website scaffold; build/preview obligations remain in skill. | Temp project file scaffold. |
| `payload-cms` | `src/commands/payload-cms.ts` | split or technology helper | Writes Payload config only; keep small. | Assert collections in generated config. |
| `audit-skills` | `src/commands/audit-skills.ts` | split | Dev-only audit of narrative skill completeness. | Fixture skill directory and report path. |

The restored `src/seo-brain.ts` should only parse args, reject `--project`, dispatch to commands, and export shared helpers required by tests.

## Tools To Fork

Upstream: `https://github.com/coreyhaines31/marketingskills`

- License: MIT
- Main branch commit checked on 2026-05-06: `906c2fb28e471c5b1d149d4159ec5ddb40b7c364`
- Source directories: `tools/clis/` and `tools/integrations/`

Minimum Phase 2 fork:

| tool | upstream file | status | SEO Brain use |
|---|---|---|---|
| DataForSEO CLI | `tools/clis/dataforseo.js` | forked-from | SERP, keyword volume, suggestions, backlinks. |
| DataForSEO guide | `tools/integrations/dataforseo.md` | forked-from | Human setup and provider notes. |

Recommended candidate imports after audit:

| tool | upstream file | status | SEO Brain use |
|---|---|---|---|
| Google Search Console | `tools/clis/google-search-console.js` | candidate | Search performance and index coverage evidence. |
| Ahrefs | `tools/clis/ahrefs.js` | candidate | Backlink alternative where user already has credentials. |
| Semrush | `tools/clis/semrush.js` | candidate | Keyword/competitive alternative where user already has credentials. |
| Similarweb | `tools/clis/similarweb.js` | candidate | Traffic/competitor context, if dependency surface is simple. |
| Keywords Everywhere | `tools/clis/keywords-everywhere.js` | candidate | Lightweight keyword data alternative. |
| AIROPS | `tools/clis/airops.js` | candidate | Only if useful for workflow automation; otherwise defer. |

Every copied file must be recorded in `THIRD_PARTY_NOTICES.md` and `tools/ATTRIBUTIONS.md` with SPDX, upstream commit, author, local modifications, and destination.

## Skill Template

````markdown
---
name: <kebab-name>
description: When the user wants <specific task>. Also use when they say "<phrase>" or need <trigger>.
metadata:
  version: 1.0.0
---

# <Human Title>

You are a <role>. Your goal is to <one objective>.

## When To Use

Use this skill for <one task>. Do not use it for <nearby task>; route that to `<other-skill>`.

## Critical Points

- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
- Keep raw evidence in `project/sources/`, working drafts in `project/workbench/`, and final deliverables in `project/artifacts/`.
- Strategic wiki pages require explicit human approval.
- Preserve the requested output language, including pt-BR accents.

## Framework

### 1. <Step>
**Check:** <what to inspect or decide>
**Strong:** "<concrete good behavior>"
**Weak:** "<concrete failure mode>"

### 2. <Step>
**Check:** <what to inspect or decide>
**Strong:** "<concrete good behavior>"
**Weak:** "<concrete failure mode>"

## Output Format

```yaml
status: <complete|blocked|approval_required>
sources:
  - path: project/sources/...
synthesis:
  summary: ...
next_action: ...
```

## Examples

### Example: <realistic case>
Input: "<user request>"
Output: <short representative output>

## Related Skills

- `<skill>`: use when <condition>.
````

## Tool CLI Template

```js
#!/usr/bin/env node
/* SPDX-License-Identifier: MIT */

const COMMANDS = {
  async help() {
    console.log(JSON.stringify({ commands: Object.keys(COMMANDS).sort() }, null, 2));
  },
  async status(args) {
    const credentials = loadCredentials();
    console.log(JSON.stringify({ ok: Boolean(credentials), provider: "<provider>" }, null, 2));
  },
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) args._.push(token);
    else args[token.slice(2).replaceAll("-", "_")] = argv[i + 1]?.startsWith("--") ? true : argv[++i] ?? true;
  }
  return args;
}

function loadCredentials() {
  // Read env first, then ~/.seo-brain/credentials.json.
  return null;
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  if (!COMMANDS[command]) throw new Error(`Unknown command: ${command}`);
  await COMMANDS[command](parseArgs(rest));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
```

## Phase 1 Decisions Needed

- Approve retiring `start` or require a thin alias skill.
- Approve keeping `payload-cms` as standalone optional technology skill.
- Approve `serp-extract` as a standalone data-capture skill instead of merging it into `seo-analysis`.
- Approve the initial hard-fork list: DataForSEO only for Phase 2, with GSC/Ahrefs/Semrush/Similarweb/Keywords Everywhere as candidates.
