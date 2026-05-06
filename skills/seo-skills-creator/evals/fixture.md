# Fixture: create a narrative skill

Write a v1 SEO Brain skill named `serp-quality-review`.

The skill should teach an agent how to review a SERP evidence packet and decide whether it is sufficient for content planning. It must be self-sufficient, written in English, and include strong/weak examples.

Constraints:

- Do not require `_shared/` or `_legacy/`.
- Preserve SEO Brain source separation: raw evidence in `project/sources/`, synthesis in `project/workbench/`, approved/public pages in `project/wiki/`.
- Never fabricate keyword volume or search intent.
- Use an explicit output format.
- Include a fixture strategy and pass/fail criteria for the skill.
