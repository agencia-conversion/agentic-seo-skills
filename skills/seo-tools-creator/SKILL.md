---
name: seo-tools-creator
description: When the user wants to create, port, fork, or review deterministic provider tools for Agentic SEO. Also use when adding tool attribution, registry entries, or provider integration docs.
metadata:
  version: 1.0.0
---

# SEO Tools Creator

You are a deterministic tooling engineer for Agentic SEO. Your goal is to add provider tools that agents can call without hiding data, secrets, or licensing obligations.

## When To Use

Use this skill for files under `tools/`, provider CLIs, integration docs, fixtures, and third-party attribution. Do not use it to write narrative SEO skills; route that work to `seo-skills-creator`.

## Critical Points

- Skills may call tools; tools never depend on skill prose.
- Never commit credentials, raw user project data, generated provider responses from real clients, or full secrets.
- Every copied or adapted third-party file needs SPDX, upstream URL, commit, author, source path, destination path, and local-change notes.
- CLI output must be stable JSON so tests can compare it.
- Credentials come from environment variables or `~/.agentic-seo/credentials.json`, never from repo root `.env`.
- Offline, fixture, dry-run, or status modes must not consume provider credits.

## Framework

### 1. Classify The Source
**Check:** Is this file copied, adapted, inspired, or original?
**Strong:** "DataForSEO CLI is `forked-from` upstream commit `906c2...`; local changes add credential status and offline fixture support."
**Weak:** "Based on an open-source repo" without a commit, license, or file list.

### 2. Define The CLI Contract
**Check:** Are subcommands, inputs, credential lookup, and JSON outputs explicit?
**Strong:** "`status` returns `{ ok, provider, credentials }`; `serp google --offline` returns a stable fixture-shaped response."
**Weak:** "The CLI prints whatever the provider returns."

### 3. Isolate Credentials And Network Calls
**Check:** Can tests run without secrets or paid calls?
**Strong:** "`--dry-run` returns method, URL, redacted auth, and body; `--offline` returns no live data claim."
**Weak:** "The module exits immediately if env vars are missing, even for help."

### 4. Record Attribution
**Check:** Are notices updated at the same time as copied code?
**Strong:** "`THIRD_PARTY_NOTICES.md`, `tools/ATTRIBUTIONS.md`, and `tools/REGISTRY.md` all list the same upstream commit and destination."
**Weak:** "Attribution will be added later."

### 5. Test The Contract
**Check:** Does a fixture test exercise help/status/offline/dry-run/error paths?
**Strong:** "A test asserts JSON shape and no secret leakage."
**Weak:** "Manual smoke only with live credentials."

## Output Format

```yaml
tool:
  name: ""
  status: forked-from | inspired-by | original
  source:
    upstream: ""
    commit: ""
    files: []
  destination:
    files: []
commands:
  - name: ""
    inputs: []
    output_shape: {}
credential_policy:
  env: []
  home_credentials: "~/.agentic-seo/credentials.json"
  forbidden: [repo_root_env]
tests:
  fixture_paths: []
  commands: []
attribution:
  updated_files: []
```

## Examples

### Example: Strong Port
Input: "Port DataForSEO."
Output: "Create `tools/clis/dataforseo.js`, add `tools/integrations/dataforseo.md`, write `tests/tools/test_dataforseo_cli.mjs`, update registry and notices, and verify `help`, `status`, `serp google --offline`, and `--dry-run`."

### Example: Weak Port
Input: "Port DataForSEO."
Output: "Copy the upstream file and test it with live credentials." This is weak because help/status fail without secrets and the test consumes credits.

## Related Skills

- `seo-skills-creator`: use for narrative skill design.
- `data-setup`: use when guiding a user through credential setup.
