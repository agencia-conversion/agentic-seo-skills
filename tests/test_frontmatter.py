#!/usr/bin/env python3
"""Regression tests for frontmatter updates."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("seo_brain", ROOT / "scripts" / "seo_brain.py")
seo_brain = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(seo_brain)


def test_set_frontmatter_value_preserves_multiline_sources(tmp_path: Path) -> None:
    page = tmp_path / "index.md"
    page.write_text(
        """---
title: "Resumo do projeto"
status: draft
pillar: wiki
owner: human
sources:
  - sources/manual/brief.md
  - sources/manual/interview.md
judgment_level: strategic
---

# Resumo do projeto
""",
        encoding="utf-8",
    )

    seo_brain.set_frontmatter_value(
        page,
        {
            "status": "approved",
            "approved_by": '"Diego"',
            "approved_at": '"2026-05-04T12:00:00+00:00"',
        },
    )

    updated = page.read_text(encoding="utf-8")
    assert "status: approved" in updated
    assert 'approved_by: "Diego"' in updated
    assert "sources:\n  - sources/manual/brief.md\n  - sources/manual/interview.md" in updated
    assert "judgment_level: strategic" in updated

