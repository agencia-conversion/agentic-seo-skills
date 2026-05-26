---
title: "Identity"
updated: "<YYYY-MM-DD>"
---

# Identity

<!--
PURPOSE: Narrative brandbook of the project. Every Agentic SEO skill reads
this file as initial context: who the brand is, who it speaks to, how to
reference it inline and in a paragraph, where it lives. Technical identity
stays observable here; editorial thesis about stack lives in [[editorial]].
Every factual statement here has a source in ## Evidence at the bottom.
Comments <!-- RULE: --> are binding instructions for the filling agent and
must be REMOVED when the file is filled.
-->

## One-liner

<!--
RULE: Maximum 15 words. Subject + function + main scope. No enumerative
list (no commas enumerating domains). No evaluative adjective ("leading",
"reference", "consolidated", "robust"). Think photo caption: identify,
do not sell. Tone detail in [[voice#lead-and-introduction]].

Good: "Organizational culture consulting for Brazilian mid-sized companies."
Bad: "Leading platform in management, culture, leadership and tools for
modern teams in digital transformation."
-->

<single line for the project>

## The brand

### Appositive (inline use)

<!--
RULE: Appositive = reduced clause that follows the proper name on first
mention. 3 to 12 words. Identifies, does not qualify. No evaluative
adjective. No enumerative list. Competitor test: would a direct
competitor sign this without complaining? If not, you are selling.

Good: "Acme, HR consulting for tech companies"
Bad: "Acme, consolidated reference and leader in management, people,
culture and tools for modern teams"

Full detail in [[voice#lead-and-introduction]].
-->

<appositive ready to paste after the proper name>

### Introduction paragraph

<!--
RULE: 60 to 100 words. Direct statement about the brand, in third
person, present tense. NEVER describes where the information was read.
Forbidden (lint blocks): "the home states", "the site positions",
"article X argues", "according to the site", "per the blog", "the
author says that", "the about page says", "the brand presents X as".

The paragraph asserts what the brand is and does. The source that
supports each claim goes in ## Evidence at the bottom, with a link.
If evidence is missing or weak, the claim does not enter.

Suggested structure:
1. Identification (who, where, scope).
2. Core activity (what it does, for whom).
3. Positioning (the angle that differentiates).
4. Promise or brand line (optional, if it carries meaning).

Lead in the first sentence. Subject + verb + object. Short sentences.

Good: "Acme provides organizational culture consulting for Brazilian
mid-sized companies. It combines quantitative diagnosis, leadership
intervention and climate-survey software applied monthly by clients.
It defends culture as a measurable competitive advantage and turns
down projects that treat climate as an isolated event."

Bad: "Acme's home states that the company transforms people management.
The site says it combines consulting, courses and software. The about
page argues that culture is a competitive advantage."
-->

<paragraph of 60-100 words>

### Brand line

<!--
RULE: A single line that works as a signature. May be a slogan, short
manifesto, or positioning statement. Here (and only here) a declarative
brand tone is allowed. Maximum 12 words.
-->

<short anchor line>

### Core promise

<!--
RULE: What the brand delivers to its audience, in one line, from the
audience's point of view (not the product's). No promotional adjective.
Verifiable: the audience can say "I received this" or "I did not".
-->

<promise in one line>

### Anti-positioning

<!--
RULE: 2 to 4 items the brand refuses to be. Each item on a single line,
factual, without irony. It protects against editorial dispersion and
lets other agents know what NOT to write in the brand's name.
-->

- <refused item 1>
- <refused item 2>

## Audience

### Who it speaks to

<!--
RULE: Primary audience in 2-3 lines. Role + context + what they seek.
No fictional persona ("John, 32, likes coffee"). Describe the real role
(position, market, career moment) and the question that brings that
person to the brand.
-->

<primary audience>

### Who it does not speak to

<!--
RULE: The audience the brand explicitly does not serve. Protects against
editorial drift and against readers who will be frustrated. If you do
not have clarity here, look for evidence on service pages, in published
content, or ask the human. Without this field, it is easy to write for
"everyone" and the brain loses focus.
-->

<audience not served>

## Technical identity

<!--
RULE: Only what is observable without editorial inference: domain,
language, market, identified frontend, presence of analytics. DO NOT
state editorial thesis about stack ("we believe in static", "we reject
WordPress", "we prefer edge rendering"). Editorial thesis lives in
[[editorial]] or in published content. Operational detail lives in
[[technology]].
-->

- Primary domain: <url>
- Secondary domains: <list or `none`>
- Language: <pt-BR | en | ...>
- Country/market: <Brazil | global | ...>
- Observed stack (one line): <identified frontend or CMS; detail in [[technology]]>

## Channels

<!--
RULE: Each line references a real, active channel. Editorial role = what
that channel does in the operation (primary publishing, distribution,
relationship, capture, etc.). Inactive channels or channels without a
real URL do not enter. If a channel does not yet exist but is planned,
record it as a decision in [[log]] instead of listing it here.
-->

| Channel | URL/handle | Editorial role |
| --- | --- | --- |
| Own site | <url> | <role> |
| LinkedIn | <handle/url> | <role> |

## Editorial areas

<!--
RULE: Short summary of areas. The detail (thesis, differentiation,
examples) lives in [[editorial]]. Keep 1 line per area here. Use
wikilinks with an anchor to the section in [[editorial]]. If an area
does not yet have a section in [[editorial]], create the section first
(with a decision in [[log]]).
-->

- [[editorial#<Area 1>]] — <summary line>
- [[editorial#<Area 2>]] — <summary line>

## Main topic clusters

<!--
RULE: Wikilinks with anchor to the section in [[topic-clusters]]. Only
clusters that already exist as a section in that file. Single-line
summary per cluster.
-->

- [[topic-clusters#<Cluster>]] — <summary line>

## Evidence

<!--
RULE: Sources that support the claims above. Use normal Markdown links
for `../sources/`, `../content/`, and external URLs. Wikilinks `[[...]]`
only for files inside `brain/`. Each bullet references 1 source and
states, in one sentence, what that source supports. If a claim above
has no source here, either the claim exits or the source is added.

Example:
- [Home acme.com](https://acme.com/) — supports "organizational culture
  consulting for Brazilian mid-sized companies" in the one-liner and
  the introduction paragraph.
- [About — acme.com](https://acme.com/about/) — supports the
  introduction paragraph and the Audience section.
-->

- <evidence bullet 1>
- <evidence bullet 2>
