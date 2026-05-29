# Agentic SEO Autoresearch Program

This file defines the autonomous development loop for Agentic SEO. It adapts Karpathy's Autoresearch pattern to plugin, skill, and SEO workflow development.

References:

- https://github.com/karpathy/autoresearch
- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- https://agenticseo.sh/blog/o-que-e-seo-agentico

## Mission

Improve Agentic SEO by iterating on one measurable skill or subsystem at a time. Every iteration must make the plugin more reliable, more useful for nontechnical SEO users, or more aligned with Agentic SEO.

## Operating Principle

Humans provide direction and judgment. Agents execute bounded experiments, evaluate against fixtures, and keep only changes that improve measured quality without weakening safety, provenance, or approval gates.

## Editable Surface

During one Autoresearch run, edit only one of:

- one skill directory;
- one script package;
- one template family;
- one evaluator.

Do not rewrite the whole plugin in a single run.

## Immutable Surface

During a run, do not modify:

- real `.env` files;
- raw source fixtures used by tests;
- evaluator pass/fail thresholds unless the explicit task is evaluator design;
- approved Wiki fixtures;
- unrelated skill directories.

## Experiment Loop

1. Choose one skill or subsystem.
2. Read its contract and fixtures.
3. State the hypothesis in the run log.
4. Make the smallest useful change.
5. Run deterministic tests.
6. Run skill evaluator.
7. Compare score against baseline.
8. Keep the change only if it improves the target score and passes all gates.
9. Revert or quarantine the change if it fails.
10. Record what changed, what was measured, and what remains.

## Keep Criteria

A change can be kept when all are true:

- deterministic tests pass;
- no secrets are printed or committed;
- write scope stays within the selected subsystem;
- strategic approval gates remain intact;
- score improves or a critical defect is fixed;
- user-facing output becomes clearer, more accurate, or more useful.

## Reject Criteria

Reject or quarantine a change when any are true:

- it fabricates data;
- it weakens approval gates;
- it makes the UX more terminal-dependent;
- it edits raw sources;
- it broadens scope without need;
- it improves one metric by bypassing the intended task;
- it creates unreviewable complexity.

## Skill Metrics

Every skill run should report:

- contract completeness;
- fixture pass rate;
- deterministic test status;
- data provenance quality;
- Wiki update correctness;
- human approval correctness;
- user-facing clarity;
- final 0-100 score.

## Golden Path Evaluation

The v0.1 golden path is:

1. configure provider status without exposing secrets;
2. create one project;
3. create initial Wiki;
4. approve required strategic pages;
5. run keyword and SERP analysis;
6. create topic cluster;
7. create content brief;
8. create or audit Next.js SSG site;
9. view outputs in the dashboard;
10. append all important events to the log.

The golden path is not complete until a nontechnical user can understand what happened without reading terminal output.

## Anti-Goodhart Rule

Do not optimize a metric by making the task easier, hiding failures, narrowing fixtures unfairly, or replacing real data with unsupported LLM claims. If the metric is insufficient, improve the evaluator in a separate run and document why.

