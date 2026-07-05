from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from .registry import DocumentRegistry


def parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


@dataclass(frozen=True)
class LtvPosition:
    threshold: float
    base_threshold: float
    threshold_document_id: str
    threshold_locator: str
    amendment_active: bool
    amendment_period: tuple[date, date] | None
    waiver: dict[str, Any] | None


class HierarchyResolver:
    def __init__(self, registry: DocumentRegistry) -> None:
        self.registry = registry

    def ltv_position(
        self, as_of: str | date, test_date: str | date | None = None
    ) -> LtvPosition:
        evaluation_date = parse_date(as_of)
        requested_test_date = parse_date(test_date) if test_date else None

        base = next(
            item
            for item in self.registry.base_terms
            if item["topic"] == "ltv_threshold"
        )
        threshold = float(base["value"])
        source_document_id = base["document_id"]
        source_locator = base["source_locator"]
        amendment_active = False
        amendment_period: tuple[date, date] | None = None

        for document in self.registry.documents_of_type("amendment_letter"):
            for modification in document.raw.get("modifications", []):
                if modification["topic"] != "ltv_threshold":
                    continue
                applies_from = parse_date(modification["applies_from"])
                applies_to = parse_date(modification["applies_to"])
                relevant_date = requested_test_date or evaluation_date
                if applies_from <= relevant_date <= applies_to:
                    threshold = float(modification["value"])
                    source_document_id = document.document_id
                    source_locator = modification["source_locator"]
                    amendment_active = True
                    amendment_period = (applies_from, applies_to)

        waiver_match: dict[str, Any] | None = None
        for document in self.registry.documents_of_type("waiver_letter"):
            for waiver in document.raw.get("waivers", []):
                if waiver["topic"] != "ltv_threshold":
                    continue
                waiver_test_date = parse_date(waiver["test_date"])
                if requested_test_date == waiver_test_date:
                    waiver_match = {
                        **waiver,
                        "document_id": document.document_id,
                    }
                    break

                condition_end_dates = [
                    parse_date(condition["applies_to"])
                    for condition in document.raw.get("conditions", [])
                    if condition.get("applies_to")
                ]
                relevance_end = max(condition_end_dates, default=waiver_test_date)
                if (
                    requested_test_date is None
                    and parse_date(document.effective_date)
                    <= evaluation_date
                    <= relevance_end
                ):
                    waiver_match = {
                        **waiver,
                        "document_id": document.document_id,
                    }

        return LtvPosition(
            threshold=threshold,
            base_threshold=float(base["value"]),
            threshold_document_id=source_document_id,
            threshold_locator=source_locator,
            amendment_active=amendment_active,
            amendment_period=amendment_period,
            waiver=waiver_match,
        )

    def active_distribution_condition(
        self, as_of: str | date
    ) -> dict[str, Any] | None:
        evaluation_date = parse_date(as_of)
        for document in self.registry.documents_of_type("waiver_letter"):
            for condition in document.raw.get("conditions", []):
                if condition["topic"] != "distribution":
                    continue
                applies_from = parse_date(condition["applies_from"])
                applies_to = parse_date(condition["applies_to"])
                if applies_from <= evaluation_date <= applies_to:
                    return {
                        **condition,
                        "document_id": document.document_id,
                    }
        return None
