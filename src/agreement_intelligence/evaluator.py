from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .engine import AgreementIntelligenceEngine


@dataclass
class CaseResult:
    case_id: str
    passed: bool
    failures: list[str]
    support_status: str
    source_locators: list[str]


def evaluate_benchmark(
    engine: AgreementIntelligenceEngine, benchmark_path: Path
) -> dict[str, Any]:
    benchmark = json.loads(benchmark_path.read_text(encoding="utf-8"))
    results: list[CaseResult] = []

    for case in benchmark["cases"]:
        answer = engine.answer(
            case["question"],
            as_of=case.get("as_of", "2026-07-02"),
            test_date=case.get("test_date"),
        )
        failures: list[str] = []

        if answer.support_status != case["expected_status"]:
            failures.append(
                f"status: expected {case['expected_status']}, got {answer.support_status}"
            )

        answer_text = answer.short_answer.lower()
        for required in case.get("required_substrings", []):
            if required.lower() not in answer_text:
                failures.append(f"missing required text: {required}")

        for forbidden in case.get("forbidden_substrings", []):
            if forbidden.lower() in answer_text:
                failures.append(f"contains forbidden text: {forbidden}")

        actual_locators = {source.locator for source in answer.sources}
        for locator in case.get("required_locators", []):
            if locator not in actual_locators:
                failures.append(f"missing required locator: {locator}")
        for locator in case.get("forbidden_locators", []):
            if locator in actual_locators:
                failures.append(f"contains forbidden locator: {locator}")

        if case.get("human_review_required") is not None:
            if answer.human_review_required != case["human_review_required"]:
                failures.append(
                    "human_review_required: "
                    f"expected {case['human_review_required']}, "
                    f"got {answer.human_review_required}"
                )

        results.append(
            CaseResult(
                case_id=case["case_id"],
                passed=not failures,
                failures=failures,
                support_status=answer.support_status,
                source_locators=[source.locator for source in answer.sources],
            )
        )

    passed = sum(result.passed for result in results)
    return {
        "total": len(results),
        "passed": passed,
        "failed": len(results) - passed,
        "pass_rate": passed / len(results) if results else 0.0,
        "results": [asdict(result) for result in results],
    }
