#!/usr/bin/env python3
"""Compatibility wrapper for the TypeScript SEO Brain CLI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin" / "seo-brain"


def main() -> int:
    return subprocess.call([str(BIN), *sys.argv[1:]], cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
