---
title: "Technology"
updated: "<YYYY-MM-DD>"
---

# Technology

<!--
PURPOSE: Observed stack and technical SEO map of the brand's site. This
file is exclusively operational: what was observed on the site, what
was decided, what remains to verify. DO NOT document editorial opinion
about stack ("we prefer static sites", "we reject WordPress", "we
believe in edge rendering"). Editorial thesis about technology lives in
[[editorial]] or in published content under `content/`. Every factual
line here has evidence of direct observation in ## Evidence at the
bottom or an anchor to [[log]]. <!-- RULE: --> comments are binding and
must be REMOVED when the file is filled.
-->

## Technical context

<!--
RULE: Each line = one direct observation with a source. Observed state:
what you saw running, not what you assumed. When something has not
been verified, leave "pending" and record the pending item in
## Technical pending items. DO NOT write "thesis about stack" here.
-->

| Area | Observed state | Evidence |
| --- | --- | --- |
| Domain/DNS | <observed \| unknown> | <link or note> |
| Hosting/CDN | <observed \| unknown> | <link or note> |
| Frontend/CMS | <observed \| unknown> | <link or note> |
| Analytics | <observed \| unknown \| none> | <link or note> |
| Crawling and rendering | <observed \| pending> | <link or note> |
| Indexing | <observed \| pending> | <link or note> |
| Structured data | <observed \| pending> | <link or note> |

## Recorded technical decisions

<!--
RULE: List of technical decisions made on the project, each with an
anchor to the corresponding entry in [[log]] (type: decision). The
decision itself lives in the log; here is just the navigable title. DO
NOT write editorial justification here — that is in the log.
-->

- <decision> — [[log#YYYY-MM-DD - title]]

## Technical SEO map

<!--
RULE: Continuous verification map. "Last checked" requires a date;
without a date, it stays "pending". "Evidence" requires a link to an
audit in `project/audits/` or to a note in sources/. Status:
- ok: verified and within expectation.
- gap: verified and outside expectation, with a known issue.
- pending: not verified yet.
-->

| Area | Status | Last checked | Evidence |
| --- | --- | --- | --- |
| Indexing | <ok \| gap \| pending> | <YYYY-MM-DD or absent> | <link> |
| Metadata | <ok \| gap \| pending> | | |
| Canonicals | <ok \| gap \| pending> | | |
| Sitemap and robots | <ok \| gap \| pending> | | |
| Structured data | <ok \| gap \| pending> | | |
| Performance | <ok \| gap \| pending> | | |
| Internal links | <ok \| gap \| pending> | | |

## Technical pending items

<!--
RULE: Open items that require observation, audit or decision. Each
item on a factual single line, without editorializing. When the item
is resolved, it exits here and (if a decision) becomes an entry in
[[log]] referenced above.
-->

- <item>

## Evidence

<!--
RULE: Sources that support the "Technical context" and the "Technical
SEO map". Markdown links to `../audits/`, `../sources/`, and external
URLs (e.g., PageSpeed report, Wayback snapshot). Each bullet
references 1 source and states, in one sentence, what it supports.
-->

- <evidence bullet 1>
- <evidence bullet 2>
