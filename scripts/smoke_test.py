#!/usr/bin/env python3
"""Offline smoke test for SEO Brain v0.1."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin" / "seo-brain"


def run(*args: str) -> dict:
    completed = subprocess.run(
        [str(BIN), *args],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        print(completed.stdout)
        print(completed.stderr, file=sys.stderr)
        raise SystemExit(f"Command failed: seo-brain {' '.join(args)}")
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError:
        return {"ok": True, "stdout": completed.stdout}


def main() -> int:
    project = f"smoke-{int(time.time())}"
    run("project-init", project)
    lint = run("wiki-lint", "--project", project)
    if not lint.get("ok"):
        raise SystemExit("Wiki lint failed")
    run("data-setup")
    run("keyword-research", "--project", project, "--keyword", "seo agentico", "--mode", "offline")
    run("serp-extract", "--project", project, "--keyword", "seo agentico", "--mode", "offline")
    run("seo-analysis", "--project", project, "--keyword", "seo agentico")
    run("topic-cluster", "--project", project, "--seed", "seo agentico")
    run("eeat", "--project", project, "--claim", "Metodologia propria de SEO Agentico", "--status", "gap")
    run("content-seo", "--project", project, "--topic", "O que e SEO agentico", "--keyword", "seo agentico")
    run("backlink-analysis", "--project", project, "--target", "example.com", "--mode", "offline")
    run("next-website-creator", "--project", project)
    run("payload-cms", "--project", project)
    run("ux-web", "--project", project)
    technical = run(
        "technical-seo",
        "--html-file",
        str(ROOT / "tests" / "fixtures" / "technical-seo-valid.html"),
        "--page-type",
        "blog-post",
    )
    if not technical.get("ok"):
        raise SystemExit("Technical SEO valid fixture failed")
    autoresearch = run("autoresearch")
    if not autoresearch.get("ok"):
        raise SystemExit("Autoresearch failed")
    print(json.dumps({"ok": True, "project": project}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
