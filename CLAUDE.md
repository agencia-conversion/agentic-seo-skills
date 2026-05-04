@AGENTS.md

## Claude Code Plugin Loading

Running plain `claude` inside this repository does not enable the plugin. It loads this folder as a normal project only.

For development, start Claude Code with:

```bash
claude --plugin-dir .
```

Validate the plugin manifest explicitly:

```bash
claude plugin validate .claude-plugin/plugin.json
```

Validate the optional local marketplace explicitly:

```bash
claude plugin validate .claude-plugin/marketplace.json
```

After loading, invoke plugin skills with the namespace:

```text
/seo-brain:project-init
/seo-brain:seo-analysis
/seo-brain:technical-seo
```

After changing skills or agents during an interactive session, run:

```text
/reload-plugins
```

For a persistent local install, add this repository as a local marketplace and install the plugin:

```text
/plugin marketplace add /Users/diego/Codex/seo-brain-codex
/plugin install seo-brain@seo-brain-marketplace
```
