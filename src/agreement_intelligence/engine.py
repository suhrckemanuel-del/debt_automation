from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

from .classification import asks_for_legal_judgment, classify_query
from .financial_model import (
    apply_scenario,
    calculate_ltv_arithmetic,
    decimal_from_string,
)
from .hierarchy import HierarchyResolver, parse_date
from .models import Answer, Citation, Passage
from .parser import parse_corpus
from .registry import DocumentRegistry
from .retrieval import PassageStore


class AgreementIntelligenceEngine:
    def __init__(
        self,
        repo_root: Path | str | None = None,
        workspace_id: str = "demo",
    ) -> None:
        self.repo_root = (
            Path(repo_root).resolve()
            if repo_root is not None
            else Path(__file__).resolve().parents[2]
        )
        self.registry = DocumentRegistry(self.repo_root, workspace_id=workspace_id)
        self.workspace_id = self.registry.workspace_id
        self.passages = parse_corpus(self.registry)
        self.store = PassageStore(self.passages)
        self.hierarchy = HierarchyResolver(self.registry)

    def _citation(
        self, document_id: str, locator: str, supporting_passage: str
    ) -> Citation:
        passage = self.store.get(document_id, locator)
        if supporting_passage not in passage.text:
            raise ValueError(
                f"Citation text is not present in {document_id} {locator}"
            )
        return Citation(
            document_id=passage.document_id,
            document_title=passage.document_title,
            document_type=passage.document_type,
            locator=passage.locator,
            page=passage.page,
            passage_id=passage.passage_id,
            supporting_passage=supporting_passage,
            source_path=passage.source_path,
        )

    def _mapped_citation(self, group: str, key: str) -> Citation:
        try:
            provision = self.registry.provisions[group][key]
        except KeyError as exc:
            raise KeyError(f"Missing provision mapping: {group}.{key}") from exc
        return self._citation(
            provision["document_id"],
            provision["locator"],
            provision["quote"],
        )

    def _supports_category(self, category: str) -> bool:
        required = {
            "current_ltv": {
                "ltv": {"base", "amendment", "waiver"},
            },
            "distribution_restriction": {
                "distribution": {
                    "restriction",
                    "definition",
                    "temporary_prohibition",
                },
            },
            "disposal_and_distribution": {
                "distribution": {
                    "restriction",
                    "definition",
                    "temporary_prohibition",
                },
                "disposal_distribution": {
                    "disposal_restriction",
                    "disposal_definition",
                    "mandatory_prepayment",
                },
            },
        }
        category_requirements = required.get(category)
        if not category_requirements:
            return False
        for group, keys in category_requirements.items():
            available = set(self.registry.provisions.get(group, {}))
            if not keys.issubset(available):
                return False
        return True

    def search(
        self, question: str, limit: int = 8
    ) -> list[tuple[Passage, float]]:
        category = classify_query(question)
        return self.store.search(question, category, limit=limit)

    def contract_position(
        self,
        as_of: str | date = "2026-07-02",
    ) -> dict[str, Any]:
        evaluation_date = parse_date(as_of)
        required_mappings = {
            "ltv": {"base", "amendment", "waiver"},
            "distribution": {"temporary_prohibition"},
        }
        base = next(
            (
                item
                for item in self.registry.base_terms
                if item.get("topic") == "ltv_threshold"
            ),
            None,
        )
        missing_mappings = [
            f"{group}.{key}"
            for group, keys in required_mappings.items()
            for key in sorted(keys - set(self.registry.provisions.get(group, {})))
        ]
        if base is None:
            missing_mappings.append("base_terms.ltv_threshold")
        if missing_mappings:
            return {
                "as_of_date": evaluation_date.isoformat(),
                "support_status": "missing_support",
                "ltv": None,
                "ltv_modifications": [],
                "ltv_waivers": [],
                "distribution_conditions": [],
                "sources": [],
                "missing_information": [
                    f"Reviewed provision mapping: {mapping}"
                    for mapping in missing_mappings
                ],
            }

        ltv_position = self.hierarchy.ltv_position(evaluation_date)
        active_distribution = self.hierarchy.active_distribution_condition(
            evaluation_date
        )
        assert base is not None
        modifications: list[dict[str, Any]] = []
        waivers: list[dict[str, Any]] = []
        conditions: list[dict[str, Any]] = []
        sources: list[Citation] = [
            self._mapped_citation("ltv", "base"),
        ]

        for document in self.registry.documents_of_type("amendment_letter"):
            for modification in document.raw.get("modifications", []):
                if modification.get("topic") != "ltv_threshold":
                    continue
                applies_from = parse_date(modification["applies_from"])
                applies_to = parse_date(modification["applies_to"])
                modifications.append(
                    {
                        "document_id": document.document_id,
                        "locator": modification["source_locator"],
                        "value": float(modification["value"]),
                        "unit": modification["unit"],
                        "applies_from": applies_from.isoformat(),
                        "applies_to": applies_to.isoformat(),
                        "active": applies_from
                        <= evaluation_date
                        <= applies_to,
                    }
                )
                sources.append(self._mapped_citation("ltv", "amendment"))

        for document in self.registry.documents_of_type("waiver_letter"):
            condition_end_dates = [
                parse_date(condition["applies_to"])
                for condition in document.raw.get("conditions", [])
                if condition.get("applies_to")
            ]
            for waiver in document.raw.get("waivers", []):
                if waiver.get("topic") != "ltv_threshold":
                    continue
                test_date = parse_date(waiver["test_date"])
                relevance_end = max(condition_end_dates, default=test_date)
                relevant = (
                    parse_date(document.effective_date)
                    <= evaluation_date
                    <= relevance_end
                )
                waivers.append(
                    {
                        "document_id": document.document_id,
                        "locator": waiver["source_locator"],
                        "test_date": test_date.isoformat(),
                        "relief_above": float(waiver["relief_above"]),
                        "relief_up_to": float(waiver["relief_up_to"]),
                        "unit": waiver["unit"],
                        "does_not_amend": bool(waiver["does_not_amend"]),
                        "relevant": relevant,
                    }
                )
                sources.append(self._mapped_citation("ltv", "waiver"))

            for condition in document.raw.get("conditions", []):
                if condition.get("topic") != "distribution":
                    continue
                applies_from = parse_date(condition["applies_from"])
                applies_to = parse_date(condition["applies_to"])
                active = (
                    active_distribution is not None
                    and active_distribution["document_id"]
                    == document.document_id
                    and active_distribution["source_locator"]
                    == condition["source_locator"]
                )
                conditions.append(
                    {
                        "document_id": document.document_id,
                        "locator": condition["source_locator"],
                        "prohibition": bool(condition["prohibition"]),
                        "applies_from": applies_from.isoformat(),
                        "applies_to": applies_to.isoformat(),
                        "active": active,
                    }
                )
                sources.append(
                    self._mapped_citation(
                        "distribution",
                        "temporary_prohibition",
                    )
                )

        unique_sources = {
            (source.document_id, source.locator): source for source in sources
        }
        return {
            "as_of_date": evaluation_date.isoformat(),
            "support_status": "supported",
            "ltv": {
                "base_threshold": float(base["value"]),
                "base_applies_from": base["applies_from"],
                "base_document_id": base["document_id"],
                "base_locator": base["source_locator"],
                "current_threshold": ltv_position.threshold,
                "unit": base["unit"],
                "controlling_document_id": (
                    ltv_position.threshold_document_id
                ),
                "controlling_locator": ltv_position.threshold_locator,
                "amendment_active": ltv_position.amendment_active,
                "waiver_relevant": ltv_position.waiver is not None,
                "distribution_condition_active": (
                    active_distribution is not None
                ),
            },
            "ltv_modifications": modifications,
            "ltv_waivers": waivers,
            "distribution_conditions": conditions,
            "sources": [
                source.__dict__ for source in unique_sources.values()
            ],
            "missing_information": [],
        }

    def calculate_ltv(
        self,
        model_id: str = "ltv-v1",
        scenario_id: str | None = None,
    ) -> dict[str, Any]:
        model = next(
            (
                candidate
                for candidate in self.registry.financial_models.values()
                if candidate.get("model_id") == model_id
            ),
            None,
        )
        if model is None:
            return {
                "model_id": model_id,
                "status": "calculation_unavailable",
                "missing_information": [
                    "Reviewed financial model definition."
                ],
                "human_review_required": True,
                "sources": [],
            }

        required_mappings = {
            "ltv.definition",
            "ltv.base",
            "ltv.amendment",
            "ltv.waiver",
        }
        missing_mappings = [
            item
            for item in sorted(required_mappings)
            if item.split(".", 1)[1]
            not in self.registry.provisions.get(item.split(".", 1)[0], {})
        ]
        inputs = model.get("inputs")
        if not isinstance(inputs, dict):
            missing_mappings.append("financial_models.inputs")
            inputs = {}
        for key in ("debt_amount", "valuation_amount"):
            if key not in inputs:
                missing_mappings.append(f"financial_models.inputs.{key}")
        if missing_mappings:
            return {
                "model_id": model_id,
                "status": "calculation_unavailable",
                "missing_information": [
                    f"Reviewed source mapping: {item}"
                    for item in missing_mappings
                ],
                "human_review_required": True,
                "sources": [],
            }

        test_date = parse_date(model["test_date"])
        evaluation_date = parse_date(model["evaluation_date"])
        debt_input = inputs["debt_amount"]
        valuation_input = inputs["valuation_amount"]
        debt_date = parse_date(debt_input["effective_date"])
        valuation_date = parse_date(valuation_input["effective_date"])
        missing_information: list[str] = []
        if debt_date > test_date:
            missing_information.append(
                "Debt amount is dated after the selected Test Date."
            )
        if valuation_date > test_date:
            missing_information.append(
                "Valuation is dated after the selected Test Date."
            )
        if debt_input["currency"] != valuation_input["currency"]:
            missing_information.append(
                "Debt and valuation currencies do not match; no sourced FX "
                "method is available."
            )
        if missing_information:
            return {
                "model_id": model_id,
                "status": "calculation_unavailable",
                "missing_information": missing_information,
                "human_review_required": True,
                "sources": [],
            }

        scenarios = model.get("scenarios", [])
        scenario = None
        if scenario_id is not None:
            scenario = next(
                (
                    candidate
                    for candidate in scenarios
                    if candidate.get("scenario_id") == scenario_id
                ),
                None,
            )
            if scenario is None:
                raise ValueError(f"Unknown scenario_id: {scenario_id}")

        position = self.hierarchy.ltv_position(
            evaluation_date,
            test_date=test_date,
        )
        debt_amount, valuation_amount, assumptions = apply_scenario(
            debt_input["value"],
            valuation_input["value"],
            scenario,
        )
        arithmetic = calculate_ltv_arithmetic(
            debt_amount,
            valuation_amount,
            str(position.threshold),
        )
        threshold_key = "amendment" if position.amendment_active else "base"
        sources = [
            self._mapped_citation("ltv", "definition"),
            self._mapped_citation("ltv", threshold_key),
            self._citation(
                debt_input["document_id"],
                debt_input["locator"],
                debt_input["quote"],
            ),
            self._citation(
                valuation_input["document_id"],
                valuation_input["locator"],
                valuation_input["quote"],
            ),
        ]

        waiver_observation: dict[str, Any] | None = None
        if position.waiver is not None:
            waiver = position.waiver
            ltv_value = decimal_from_string(
                arithmetic.ltv_percent, "ltv_percent"
            )
            relief_above = decimal_from_string(
                str(waiver["relief_above"]), "waiver.relief_above"
            )
            relief_up_to = decimal_from_string(
                str(waiver["relief_up_to"]), "waiver.relief_up_to"
            )
            waiver_observation = {
                "relevant": True,
                "test_date": waiver["test_date"],
                "relief_above_percent": str(waiver["relief_above"]),
                "relief_up_to_percent": str(waiver["relief_up_to"]),
                "within_stated_numeric_range": (
                    relief_above < ltv_value <= relief_up_to
                ),
                "does_not_amend_threshold": bool(
                    waiver["does_not_amend"]
                ),
            }
            sources.append(self._mapped_citation("ltv", "waiver"))

        unique_sources = {
            (source.document_id, source.locator): source for source in sources
        }
        return {
            "model_id": model["model_id"],
            "model_version": int(model["model_version"]),
            "status": "calculated_human_review_required",
            "calculation_purpose": model["calculation_purpose"],
            "evaluation_date": evaluation_date.isoformat(),
            "test_date": test_date.isoformat(),
            "currency": debt_input["currency"],
            "scenario": (
                {
                    "scenario_id": scenario["scenario_id"],
                    "label": scenario["label"],
                    "rationale": scenario["rationale"],
                }
                if scenario is not None
                else {
                    "scenario_id": "baseline",
                    "label": "Reported baseline",
                    "rationale": "Uses only the two persisted source inputs.",
                }
            ),
            "source_inputs": {
                "debt_amount": {
                    "value": debt_input["value"],
                    "effective_date": debt_input["effective_date"],
                    "document_id": debt_input["document_id"],
                    "locator": debt_input["locator"],
                },
                "valuation_amount": {
                    "value": valuation_input["value"],
                    "effective_date": valuation_input["effective_date"],
                    "document_id": valuation_input["document_id"],
                    "locator": valuation_input["locator"],
                },
            },
            "calculation_inputs": {
                "debt_amount": debt_amount,
                "valuation_amount": valuation_amount,
            },
            "formula": {
                "expression": model["formula"],
                "comparison_policy": model["comparison_policy"],
                "display_rounding": model["display_rounding"],
                "trace": (
                    f"{debt_amount} / {valuation_amount} * 100 = "
                    f"{arithmetic.ltv_percent}%"
                ),
            },
            "outputs": arithmetic.to_dict(),
            "selected_threshold": {
                "percent": arithmetic.threshold_percent,
                "document_id": position.threshold_document_id,
                "locator": position.threshold_locator,
                "amendment_active": position.amendment_active,
            },
            "waiver_observation": waiver_observation,
            "assumptions": assumptions,
            "missing_information": [],
            "human_review_required": True,
            "review_note": (
                "Calculation only. A reviewer must determine legal compliance, "
                "breach, default, waiver satisfaction, transaction permission, "
                "and commercial consequences."
            ),
            "sources": [
                source.__dict__ for source in unique_sources.values()
            ],
        }

    def answer(
        self,
        question: str,
        as_of: str | date = "2026-07-02",
        test_date: str | date | None = None,
    ) -> Answer:
        evaluation_date = parse_date(as_of)
        category = classify_query(question)

        if category == "unknown":
            return Answer(
                question=question,
                as_of_date=evaluation_date.isoformat(),
                short_answer="Source not found.",
                support_status="source_not_found",
                review_note="Source not found.",
                query_category="unknown",
            )

        if category != "unknown" and not self._supports_category(category):
            return self._answer_evidence_only(question, evaluation_date, category)

        if category == "current_ltv":
            return self._answer_ltv(question, evaluation_date, test_date)
        if category == "distribution_restriction":
            return self._answer_distributions(question, evaluation_date)
        if category == "disposal_and_distribution":
            return self._answer_disposal_distribution(question, evaluation_date)

        raise RuntimeError(f"Unhandled query category: {category}")

    def _answer_evidence_only(
        self, question: str, as_of: date, category: str
    ) -> Answer:
        ranked = self.store.search(question, category, limit=6)
        if not ranked:
            return Answer(
                question=question,
                as_of_date=as_of.isoformat(),
                short_answer="Source not found.",
                support_status="source_not_found",
                review_note="Source not found.",
                query_category=category,
            )

        citations = [
            Citation(
                document_id=passage.document_id,
                document_title=passage.document_title,
                document_type=passage.document_type,
                locator=passage.locator,
                page=passage.page,
                passage_id=passage.passage_id,
                supporting_passage=passage.text[:1600].strip(),
                source_path=passage.source_path,
            )
            for passage, _score in ranked
        ]
        legal_review = asks_for_legal_judgment(question)
        return Answer(
            question=question,
            as_of_date=as_of.isoformat(),
            short_answer=(
                "Candidate source passages were found, but this workspace has not "
                "been provision-mapped and reviewed. No contractual conclusion is generated."
            ),
            support_status=(
                "legal_review_required" if legal_review else "partially_supported"
            ),
            sources=citations,
            missing_information=[
                "Reviewed provision mappings for this workspace",
                "Confirmed document hierarchy and currentness metadata",
            ],
            human_review_required=True,
            review_note=(
                "A human must review the candidate passages and configure the "
                "workspace before relying on an answer."
            ),
            notes_on_currentness=(
                "Document dates are stored, but provision-level amendment and waiver "
                "relationships have not been reviewed."
            ),
            query_category=category,
        )

    def _answer_ltv(
        self, question: str, as_of: date, test_date: str | date | None
    ) -> Answer:
        position = self.hierarchy.ltv_position(as_of, test_date=test_date)
        sources = [
            self._mapped_citation("ltv", "base"),
        ]

        if position.amendment_active:
            sources.append(
                self._mapped_citation("ltv", "amendment")
            )
            short_answer = (
                f"The original maximum LTV was {position.base_threshold:.1f}%. "
                "The current contractual "
                f"threshold for the relevant Test Date is {position.threshold:.1f}% "
                f"under {self.registry.get(position.threshold_document_id).title}."
            )
            period_start, period_end = position.amendment_period
            currentness_note = (
                "The original Facility Agreement is read as modified for Test Dates "
                f"from {self._format_date(period_start)} through "
                f"{self._format_date(period_end)}."
            )
        else:
            short_answer = (
                f"The applicable contractual LTV threshold is {position.threshold:.1f}%."
            )
            expired_period = self._latest_expired_ltv_amendment(as_of)
            if expired_period:
                sources.append(
                    self._mapped_citation("ltv", "amendment")
                )
                _period_start, period_end, amended_value = expired_period
                currentness_note = (
                    f"The temporary {amended_value:.1f}% amendment ended on "
                    f"{self._format_date(period_end)}; the original "
                    f"{position.base_threshold:.1f}% threshold applies again."
                )
            else:
                currentness_note = (
                    "The original Facility Agreement controls for the supplied date."
                )

        if position.waiver:
            sources.append(
                self._mapped_citation("ltv", "waiver")
            )
            waiver_test_date = parse_date(position.waiver["test_date"])
            relief_above = float(position.waiver["relief_above"])
            relief_up_to = float(position.waiver["relief_up_to"])
            short_answer += (
                f" For the {self._format_date(waiver_test_date)} Test Date only, "
                f"limited waiver relief applies above {relief_above:.1f}% but not "
                f"above {relief_up_to:.1f}%."
            )
            if position.waiver.get("does_not_amend"):
                short_answer += " The waiver does not change the contractual threshold."
            currentness_note += (
                f" {self.registry.get(position.waiver['document_id']).title} is "
                f"limited to the {self._format_date(waiver_test_date)} Test Date"
                f" and must not be described as a {relief_up_to:.1f}% amendment."
            )

        return Answer(
            question=question,
            as_of_date=as_of.isoformat(),
            short_answer=short_answer,
            support_status="supported",
            sources=sources,
            missing_information=[
                "Applicable debt amount",
                "Applicable valuation",
                "Defined-term and calculation inputs required to assess actual compliance",
            ],
            human_review_required=False,
            review_note=(
                "No legal interpretation requested; this answer is limited to "
                "the threshold and express waiver scope."
            ),
            notes_on_currentness=currentness_note,
            query_category="current_ltv",
        )

    def _answer_distributions(self, question: str, as_of: date) -> Answer:
        restriction_mapping = self.registry.provisions["distribution"][
            "restriction"
        ]
        definition_mapping = self.registry.provisions["distribution"][
            "definition"
        ]
        sources = [
            self._mapped_citation("distribution", "restriction"),
            self._mapped_citation("distribution", "definition"),
        ]
        active_condition = self.hierarchy.active_distribution_condition(as_of)

        short_answer = (
            "Yes. The mapped source restricts Distributions and identifies the "
            f"relevant exception or definition in {definition_mapping['locator']}. "
            "The exact reviewed conditions are reproduced in the cited passages below."
        )
        currentness_note = (
            f"{self.registry.get(restriction_mapping['document_id']).title} provides "
            "the underlying restriction; later mapped conditions are applied by date."
        )

        if active_condition:
            sources.append(
                self._mapped_citation("distribution", "temporary_prohibition")
            )
            condition_start = parse_date(active_condition["applies_from"])
            condition_end = parse_date(active_condition["applies_to"])
            condition_document = self.registry.get(
                active_condition["document_id"]
            ).title
            short_answer += (
                f" {condition_document} also prohibits any Distribution from "
                f"{self._format_date(condition_start)} through "
                f"{self._format_date(condition_end)}."
            )
            currentness_note = (
                f"{condition_document} adds a temporary no-Distribution condition "
                f"through {self._format_date(condition_end)}; it does not replace "
                "the underlying definition."
            )

        return Answer(
            question=question,
            as_of_date=as_of.isoformat(),
            short_answer=short_answer,
            support_status="supported",
            sources=sources,
            missing_information=[
                "Transaction date and amount for any proposed Distribution",
                "Facts required by the mapped exception or definition",
                "Current status and financial inputs required by the cited provisions",
                "Evidence of any notice, certificate, or consent required by the sources",
            ],
            human_review_required=False,
            review_note=(
                "No legal conclusion is given about a proposed Distribution; "
                "the answer identifies the restriction and definition."
            ),
            notes_on_currentness=currentness_note,
            query_category="distribution_restriction",
        )

    def _answer_disposal_distribution(
        self, question: str, as_of: date
    ) -> Answer:
        sources = [
            self._mapped_citation(
                "disposal_distribution", "disposal_restriction"
            ),
            self._mapped_citation(
                "disposal_distribution", "disposal_definition"
            ),
            self._mapped_citation(
                "disposal_distribution", "mandatory_prepayment"
            ),
            self._mapped_citation("distribution", "restriction"),
            self._mapped_citation("distribution", "definition"),
        ]

        active_condition = self.hierarchy.active_distribution_condition(as_of)
        currentness_note = (
            "The Facility Agreement disposal, prepayment, and Distribution provisions "
            "must be reviewed together."
        )
        if active_condition:
            sources.append(
                self._mapped_citation("distribution", "temporary_prohibition")
            )
            condition_end = parse_date(active_condition["applies_to"])
            condition_document = self.registry.get(
                active_condition["document_id"]
            ).title
            currentness_note += (
                f" {condition_document} also prohibits Distributions through "
                f"{self._format_date(condition_end)}."
            )

        legal_request = asks_for_legal_judgment(question)
        return Answer(
            question=question,
            as_of_date=as_of.isoformat(),
            short_answer=(
                "No final yes/no conclusion is provided. A Disposal requires "
                "satisfaction of the mapped disposal restriction or an applicable "
                "consent; the mapped proceeds provision may require mandatory prepayment; "
                "and any later Distribution must satisfy separate restrictions. The "
                "supplied facts are insufficient to determine whether the proposed "
                "transaction is allowed."
            ),
            support_status="legal_review_required",
            sources=sources,
            missing_information=[
                "Exact asset or part proposed to be sold",
                "Transaction date, buyer, price, and fair-market-value evidence",
                "Facts required by the mapped Disposal definition",
                "Current status and any written Lender consent",
                "Current financial inputs required by the cited provisions",
                "Source and amount of the proposed Distribution",
                "Evidence of any notice, certificate, or consent required by the sources",
                "Any later amendment, waiver, or consent",
            ],
            human_review_required=True,
            review_note=(
                "Human legal review is required before relying on this answer. "
                "A senior finance reviewer should verify the financial inputs."
                if legal_request
                else "Human review is required because the answer depends on transaction facts."
            ),
            notes_on_currentness=currentness_note,
            query_category="disposal_and_distribution",
        )

    def _latest_expired_ltv_amendment(
        self, as_of: date
    ) -> tuple[date, date, float] | None:
        expired: list[tuple[date, date, float]] = []
        for document in self.registry.documents_of_type("amendment_letter"):
            for modification in document.raw.get("modifications", []):
                if modification.get("topic") != "ltv_threshold":
                    continue
                start = parse_date(modification["applies_from"])
                end = parse_date(modification["applies_to"])
                if end < as_of:
                    expired.append((start, end, float(modification["value"])))
        return max(expired, key=lambda item: item[1]) if expired else None

    @staticmethod
    def _format_date(value: date) -> str:
        return f"{value.day} {value.strftime('%B %Y')}"
