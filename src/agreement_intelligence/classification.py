from __future__ import annotations

import re


def classify_query(question: str) -> str:
    normalized = re.sub(r"\s+", " ", question.lower()).strip()

    transaction_terms = ("sell", "sale", "disposal", "dispose")
    distribution_terms = ("distribution", "distribute", "dividend", "proceeds")

    if any(term in normalized for term in transaction_terms) and any(
        term in normalized for term in distribution_terms
    ):
        return "disposal_and_distribution"

    if "ltv" in normalized or "loan-to-value" in normalized:
        if "waiver" in normalized:
            return "current_ltv"
        if any(
            term in normalized
            for term in ("current", "maximum", "threshold", "amended", "original")
        ):
            return "current_ltv"

    if any(term in normalized for term in ("distribution", "dividend")):
        return "distribution_restriction"

    return "unknown"


def asks_for_legal_judgment(question: str) -> bool:
    normalized = question.lower()
    return any(
        phrase in normalized
        for phrase in (
            "can the borrower",
            "can we",
            "are we allowed",
            "is it allowed",
            "legally allowed",
            "permitted to",
        )
    )
