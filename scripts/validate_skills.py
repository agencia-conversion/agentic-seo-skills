#!/usr/bin/env python3
"""Validate SEO Brain skill skeletons without external dependencies."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / "skills"
REQUIRED_SECTIONS = [
    "## Contract",
    "## Required Behavior",
    "## Done Criteria",
]


def validate_skill(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []

    if not text.startswith("---\n"):
        errors.append("missing frontmatter")
    else:
        parts = text.split("---", 2)
        frontmatter = parts[1] if len(parts) > 2 else ""
        if not re.search(r"^name:\s*[\w-]+", frontmatter, re.MULTILINE):
            errors.append("missing frontmatter name")
        if not re.search(r"^description:\s*.+", frontmatter, re.MULTILINE):
            errors.append("missing frontmatter description")

    for section in REQUIRED_SECTIONS:
        if section not in text:
            errors.append(f"missing section {section}")

    return errors


def main() -> int:
    skill_files = sorted(
        p for p in SKILLS_DIR.glob("*/SKILL.md") if not p.parts[-2].startswith("_")
    )
    if not skill_files:
        print("No skills found.", file=sys.stderr)
        return 1

    failed = False
    for skill_file in skill_files:
        errors = validate_skill(skill_file)
        rel = skill_file.relative_to(ROOT)
        if errors:
            failed = True
            print(f"FAIL {rel}: {', '.join(errors)}")
        else:
            print(f"OK   {rel}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

