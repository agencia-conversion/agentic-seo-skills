# Fixture: create a narrative skill

Write a v1 Agentic SEO skill named `serp-quality-review`.

The skill should teach an agent how to review a SERP evidence packet and decide whether it is sufficient for content planning. It must be self-sufficient, written in English, and include strong/weak examples.

Constraints:

- Do not require `_shared/`.
- Preserve Agentic SEO source separation: raw evidence in `project/sources/`, synthesis in `project/workbench/`, public content in `project/conteudos/`, authorial knowledge in `project/brain/`.
- Authorial brain pages require an approved `tipo: aprovacao` entry in `project/brain/log.md` before any change.
- Never fabricate keyword volume or search intent.
- Use an explicit output format.
- Include a fixture strategy and pass/fail criteria for the skill.
