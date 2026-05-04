#!/usr/bin/env python3
"""Regression tests for DataForSEO mode handling."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("seo_brain", ROOT / "scripts" / "seo_brain.py")
seo_brain = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(seo_brain)


def test_task_in_queue_is_not_ready() -> None:
    response = {
        "tasks": [
            {
                "status_code": 40602,
                "status_message": "Task In Queue.",
                "result": None,
            }
        ]
    }
    assert seo_brain.task_result_ready(response) is False


def test_task_with_result_is_ready() -> None:
    response = {
        "tasks": [
            {
                "status_code": 20000,
                "status_message": "Ok.",
                "result": [{"items": []}],
            }
        ]
    }
    assert seo_brain.task_result_ready(response) is True


if __name__ == "__main__":
    test_task_in_queue_is_not_ready()
    test_task_with_result_is_ready()
    print("ok")

