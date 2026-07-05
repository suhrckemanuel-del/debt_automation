from __future__ import annotations

import re
from collections import defaultdict

from .models import Passage

TOPIC_TERMS: dict[str, set[str]] = {
    "current_ltv": {
        "ltv",
        "loan-to-value",
        "threshold",
        "test date",
        "waiver",
        "65.0%",
        "70.0%",
        "72.0%",
    },
    "distribution_restriction": {
        "distribution",
        "permitted distribution",
        "available cash",
        "default",
        "compliance statement",
    },
    "disposal_and_distribution": {
        "disposal",
        "permitted disposal",
        "net disposal proceeds",
        "mandatory prepayment",
        "distribution",
        "lender consent",
    },
}


class PassageStore:
    def __init__(self, passages: list[Passage]) -> None:
        self.passages = passages
        self._by_document_locator: dict[tuple[str, str], Passage] = {}
        for passage in passages:
            key = (passage.document_id, passage.locator)
            if key in self._by_document_locator:
                raise ValueError(f"Duplicate document/locator passage: {key}")
            self._by_document_locator[key] = passage

    def get(self, document_id: str, locator: str) -> Passage:
        try:
            return self._by_document_locator[(document_id, locator)]
        except KeyError as exc:
            raise KeyError(
                f"Passage not found for document={document_id}, locator={locator}"
            ) from exc

    def search(
        self,
        question: str,
        category: str,
        limit: int = 8,
        document_ids: set[str] | None = None,
    ) -> list[tuple[Passage, float]]:
        query_tokens = set(re.findall(r"[a-z0-9.%-]+", question.lower()))
        topic_terms = TOPIC_TERMS.get(category, set())
        scored: dict[str, float] = defaultdict(float)

        for passage in self.passages:
            if document_ids is not None and passage.document_id not in document_ids:
                continue
            haystack = f"{passage.heading}\n{passage.text}".lower()
            score = 0.0

            for token in query_tokens:
                if len(token) >= 3 and token in haystack:
                    score += 1.0

            for term in topic_terms:
                if term in haystack:
                    score += 2.0

            if category == "current_ltv" and passage.document_type in {
                "amendment_letter",
                "waiver_letter",
            }:
                score += 1.5

            if score > 0:
                scored[passage.passage_id] = score

        ranked = sorted(
            (
                (passage, scored[passage.passage_id])
                for passage in self.passages
                if passage.passage_id in scored
                and (document_ids is None or passage.document_id in document_ids)
            ),
            key=lambda item: (-item[1], item[0].document_id, item[0].page),
        )
        return ranked[:limit]
