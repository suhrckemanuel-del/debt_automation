from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import date
from enum import StrEnum
from pathlib import Path
from typing import Any

from .parser import parse_corpus
from .registry import DocumentRegistry
from .retrieval import PassageStore
from .workspace import WorkspaceManager

MAPPING_VERSION = 1
ROLE_DOCUMENT_TYPES = {
    "facility": "facility_agreement",
    "amendment": "amendment_letter",
    "waiver": "waiver_letter",
}


class MappingStatus(StrEnum):
    UNMAPPED = "unmapped"
    DRAFT = "draft"
    INVALID = "invalid"
    READY = "ready"


@dataclass(frozen=True)
class MappingSlot:
    slot_id: str
    step: int
    group: str
    key: str
    label: str
    document_role: str
    category: str
    query: str
    boost_terms: tuple[str, ...]
    required_fields: tuple[str, ...] = ()


@dataclass(frozen=True)
class CandidatePassage:
    passage_id: str
    document_id: str
    document_title: str
    locator: str
    page: int
    text: str
    score: float
    reasons: tuple[str, ...]


@dataclass
class MappingDraft:
    workspace_id: str
    version: int = MAPPING_VERSION
    roles: dict[str, str] = field(default_factory=dict)
    relationship_confirmations: dict[str, bool] = field(default_factory=dict)
    slots: dict[str, dict[str, Any]] = field(default_factory=dict)
    last_validation_errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


SLOTS: tuple[MappingSlot, ...] = (
    MappingSlot(
        "ltv_base",
        2,
        "ltv",
        "base",
        "Original LTV threshold",
        "facility",
        "current_ltv",
        "loan-to-value LTV threshold Test Date",
        ("shall not exceed", "loan-to-value", "ltv"),
        ("value", "applies_from"),
    ),
    MappingSlot(
        "ltv_amendment",
        2,
        "ltv",
        "amendment",
        "LTV amendment",
        "amendment",
        "current_ltv",
        "amended LTV threshold replaces Test Date",
        ("replaced by", "amended", "threshold"),
        ("value", "applies_from", "applies_to"),
    ),
    MappingSlot(
        "ltv_waiver",
        2,
        "ltv",
        "waiver",
        "LTV waiver relief",
        "waiver",
        "current_ltv",
        "waives LTV threshold test date relief does not amend",
        ("waives", "does not amend", "test date"),
        ("test_date", "relief_above", "relief_up_to"),
    ),
    MappingSlot(
        "distribution_restriction",
        3,
        "distribution",
        "restriction",
        "Distribution restriction",
        "facility",
        "distribution_restriction",
        "shall not make Distribution restricted",
        ("shall not make a distribution", "distribution unless"),
    ),
    MappingSlot(
        "distribution_definition",
        3,
        "distribution",
        "definition",
        "Permitted Distribution definition",
        "facility",
        "distribution_restriction",
        "Permitted Distribution means definition",
        ("permitted distribution", "means a distribution"),
    ),
    MappingSlot(
        "distribution_temporary",
        3,
        "distribution",
        "temporary_prohibition",
        "Temporary Distribution prohibition",
        "waiver",
        "distribution_restriction",
        "no Distribution waiver condition",
        ("no distribution", "making no distribution"),
        ("applies_from", "applies_to"),
    ),
    MappingSlot(
        "disposal_restriction",
        4,
        "disposal_distribution",
        "disposal_restriction",
        "Disposal restriction",
        "facility",
        "disposal_and_distribution",
        "shall not make Disposal Permitted Disposal consent",
        ("shall not make a disposal", "lender consent"),
    ),
    MappingSlot(
        "disposal_definition",
        4,
        "disposal_distribution",
        "disposal_definition",
        "Permitted Disposal definition",
        "facility",
        "disposal_and_distribution",
        "Permitted Disposal means sale proceeds default consent",
        ("permitted disposal", "means a disposal"),
    ),
    MappingSlot(
        "mandatory_prepayment",
        4,
        "disposal_distribution",
        "mandatory_prepayment",
        "Mandatory prepayment from Disposal proceeds",
        "facility",
        "disposal_and_distribution",
        "Net Disposal Proceeds mandatory prepayment",
        ("mandatory prepayment", "net disposal proceeds"),
    ),
)
SLOT_BY_ID = {slot.slot_id: slot for slot in SLOTS}


class MappingService:
    def __init__(self, repo_root: Path | str, workspace_id: str) -> None:
        self.repo_root = Path(repo_root).resolve()
        self.workspace_id = workspace_id
        self.manager = WorkspaceManager(self.repo_root)
        self.workspace_dir = self.manager.workspace_dir(workspace_id)
        self.draft_path = self.workspace_dir / "mapping_draft.json"
        self.manifest_path = self.manager.manifest_path(workspace_id)
        self.registry = DocumentRegistry(
            self.repo_root, workspace_id=workspace_id
        )
        self.passages = parse_corpus(self.registry)
        self.store = PassageStore(self.passages)

    def load_draft(self) -> MappingDraft:
        if self.draft_path.exists():
            raw = json.loads(self.draft_path.read_text(encoding="utf-8"))
            return MappingDraft(
                workspace_id=raw["workspace_id"],
                version=raw.get("version", MAPPING_VERSION),
                roles=raw.get("roles", {}),
                relationship_confirmations=raw.get(
                    "relationship_confirmations", {}
                ),
                slots=raw.get("slots", {}),
                last_validation_errors=raw.get(
                    "last_validation_errors", []
                ),
            )
        return MappingDraft(
            workspace_id=self.workspace_id,
            roles=self._suggest_roles(),
        )

    def save_draft(self, draft: MappingDraft) -> None:
        if draft.workspace_id != self.workspace_id:
            raise ValueError("Draft workspace does not match service workspace.")
        self._atomic_write_json(self.draft_path, draft.to_dict())

    def _suggest_roles(self) -> dict[str, str]:
        roles: dict[str, str] = {}
        for role, document_type in ROLE_DOCUMENT_TYPES.items():
            matches = self.registry.documents_of_type(document_type)
            if len(matches) == 1:
                roles[role] = matches[0].document_id
        return roles

    def update_roles(self, values: dict[str, str]) -> MappingDraft:
        draft = self.load_draft()
        known = {document.document_id for document in self.registry.documents}
        selected: dict[str, str] = {}
        for role in ("facility", "amendment", "waiver"):
            document_id = values.get(role, "")
            if document_id not in known:
                raise ValueError(f"Unknown document selected for {role}.")
            document = self.registry.get(document_id)
            expected_type = ROLE_DOCUMENT_TYPES[role]
            if document.document_type != expected_type:
                raise ValueError(
                    f"The {role} role requires a {expected_type} document."
                )
            selected[role] = document_id
        if len(set(selected.values())) != 3:
            raise ValueError("Facility, amendment, and waiver must be different documents.")
        draft.roles = selected
        draft.relationship_confirmations = {
            "amendment_modifies_facility": (
                values.get("confirm_amendment_relationship") == "yes"
            ),
            "waiver_is_limited_relief": (
                values.get("confirm_waiver_relationship") == "yes"
            ),
        }
        if not all(draft.relationship_confirmations.values()):
            raise ValueError(
                "Confirm both amendment and waiver relationships."
            )
        draft.last_validation_errors = []
        self.save_draft(draft)
        return draft

    def update_step(
        self, step: int, form: dict[str, str]
    ) -> MappingDraft:
        draft = self.load_draft()
        passage_lookup = {
            passage.passage_id: passage for passage in self.passages
        }
        for slot in (item for item in SLOTS if item.step == step):
            passage_id = form.get(f"{slot.slot_id}_passage_id", "")
            quote = (
                form.get(f"{slot.slot_id}_quote", "")
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .strip()
            )
            if not passage_id and not quote:
                continue
            if passage_id not in passage_lookup:
                raise ValueError(f"Unknown passage selected for {slot.label}.")
            passage = passage_lookup[passage_id]
            expected_document = draft.roles.get(slot.document_role)
            if passage.document_id != expected_document:
                raise ValueError(
                    f"{slot.label} must use the selected {slot.document_role} document."
                )
            entry: dict[str, Any] = {
                "passage_id": passage.passage_id,
                "document_id": passage.document_id,
                "locator": passage.locator,
                "page": passage.page,
                "quote": quote,
            }
            for field_name in slot.required_fields:
                entry[field_name] = form.get(
                    f"{slot.slot_id}_{field_name}", ""
                ).strip()
            draft.slots[slot.slot_id] = entry
        draft.last_validation_errors = []
        self.save_draft(draft)
        return draft

    def candidates(
        self, slot_id: str, draft: MappingDraft | None = None
    ) -> list[CandidatePassage]:
        slot = SLOT_BY_ID[slot_id]
        draft = draft or self.load_draft()
        document_id = draft.roles.get(slot.document_role)
        if not document_id:
            return []
        ranked = self.store.search(
            slot.query,
            slot.category,
            limit=30,
            document_ids={document_id},
        )
        candidates: list[CandidatePassage] = []
        for passage, base_score in ranked:
            haystack = f"{passage.heading}\n{passage.text}".lower()
            matched = [
                term for term in slot.boost_terms if term in haystack
            ]
            score = base_score + (8.0 * len(matched))
            reasons = [
                f"Assigned {slot.document_role} document",
                *[f'Matched “{term}”' for term in matched],
            ]
            candidates.append(
                CandidatePassage(
                    passage_id=passage.passage_id,
                    document_id=passage.document_id,
                    document_title=passage.document_title,
                    locator=passage.locator,
                    page=passage.page,
                    text=passage.text,
                    score=score,
                    reasons=tuple(reasons),
                )
            )
        return sorted(
            candidates,
            key=lambda item: (-item.score, item.page, item.locator),
        )[:5]

    def validate_draft(self, draft: MappingDraft | None = None) -> list[str]:
        draft = draft or self.load_draft()
        errors: list[str] = []
        known_documents = {
            document.document_id for document in self.registry.documents
        }
        if set(draft.roles) != {"facility", "amendment", "waiver"}:
            errors.append("All three document roles must be assigned.")
        elif len(set(draft.roles.values())) != 3:
            errors.append("Document roles must use three different documents.")
        for role, document_id in draft.roles.items():
            if document_id not in known_documents:
                errors.append(f"{role} references an unknown document.")
                continue
            document = self.registry.get(document_id)
            expected_type = ROLE_DOCUMENT_TYPES.get(role)
            if expected_type and document.document_type != expected_type:
                errors.append(
                    f"{role} role is not assigned to a {expected_type} document."
                )
        if not all(
            draft.relationship_confirmations.get(key, False)
            for key in (
                "amendment_modifies_facility",
                "waiver_is_limited_relief",
            )
        ):
            errors.append(
                "Amendment and waiver relationships must be explicitly confirmed."
            )

        passage_lookup = {
            passage.passage_id: passage for passage in self.passages
        }
        for slot in SLOTS:
            entry = draft.slots.get(slot.slot_id)
            if not entry:
                errors.append(f"{slot.label} is not mapped.")
                continue
            passage = passage_lookup.get(entry.get("passage_id"))
            if not passage:
                errors.append(f"{slot.label} references an unknown passage.")
                continue
            if passage.document_id != draft.roles.get(slot.document_role):
                errors.append(
                    f"{slot.label} is not sourced from the assigned "
                    f"{slot.document_role} document."
                )
            quote = str(entry.get("quote", "")).strip()
            if not quote:
                errors.append(f"{slot.label} requires an exact quotation.")
            elif quote not in passage.text:
                errors.append(
                    f"{slot.label} quotation is not an exact source excerpt."
                )
            for field_name in slot.required_fields:
                if str(entry.get(field_name, "")).strip() == "":
                    errors.append(
                        f"{slot.label} requires {field_name.replace('_', ' ')}."
                    )

        self._validate_values_and_dates(draft, errors)
        self._validate_value_support(draft, errors)
        return errors

    def _validate_value_support(
        self, draft: MappingDraft, errors: list[str]
    ) -> None:
        for slot_id, field_name in (
            ("ltv_base", "value"),
            ("ltv_amendment", "value"),
            ("ltv_waiver", "relief_above"),
            ("ltv_waiver", "relief_up_to"),
        ):
            entry = draft.slots.get(slot_id, {})
            raw_value = str(entry.get(field_name, "")).strip()
            quote = str(entry.get("quote", ""))
            if not raw_value or not quote:
                continue
            try:
                number = float(raw_value)
            except ValueError:
                continue
            if number.is_integer():
                number_pattern = rf"{int(number)}(?:\.0+)?"
            else:
                normalized = f"{number:.10f}".rstrip("0").rstrip(".")
                number_pattern = re.escape(normalized) + r"0*"
            if not re.search(
                rf"(?<![\d.]){number_pattern}\s*%",
                quote,
            ):
                errors.append(
                    f"{SLOT_BY_ID[slot_id].label} {field_name} is not "
                    "shown in its exact supporting quotation."
                )

    def _validate_values_and_dates(
        self, draft: MappingDraft, errors: list[str]
    ) -> None:
        def parse_number(slot_id: str, field_name: str) -> float | None:
            value = draft.slots.get(slot_id, {}).get(field_name, "")
            if value == "":
                return None
            try:
                number = float(value)
            except (TypeError, ValueError):
                errors.append(
                    f"{SLOT_BY_ID[slot_id].label} {field_name} must be numeric."
                )
                return None
            if number <= 0:
                errors.append(
                    f"{SLOT_BY_ID[slot_id].label} {field_name} must be positive."
                )
            return number

        def parse_iso(slot_id: str, field_name: str) -> date | None:
            value = draft.slots.get(slot_id, {}).get(field_name, "")
            if not value:
                return None
            try:
                return date.fromisoformat(value)
            except ValueError:
                errors.append(
                    f"{SLOT_BY_ID[slot_id].label} {field_name} must be an ISO date."
                )
                return None

        base_value = parse_number("ltv_base", "value")
        amended_value = parse_number("ltv_amendment", "value")
        relief_above = parse_number("ltv_waiver", "relief_above")
        relief_up_to = parse_number("ltv_waiver", "relief_up_to")
        base_start = parse_iso("ltv_base", "applies_from")
        amendment_start = parse_iso("ltv_amendment", "applies_from")
        amendment_end = parse_iso("ltv_amendment", "applies_to")
        waiver_date = parse_iso("ltv_waiver", "test_date")
        condition_start = parse_iso(
            "distribution_temporary", "applies_from"
        )
        condition_end = parse_iso("distribution_temporary", "applies_to")

        if (
            base_start
            and amendment_start
            and amendment_end
            and not (base_start <= amendment_start <= amendment_end)
        ):
            errors.append(
                "LTV amendment period must begin after the base term and end after it begins."
            )
        if (
            waiver_date
            and amendment_start
            and amendment_end
            and not (amendment_start <= waiver_date <= amendment_end)
        ):
            errors.append(
                "LTV waiver Test Date must fall inside the amendment period."
            )
        if (
            relief_above is not None
            and amended_value is not None
            and relief_above != amended_value
        ):
            errors.append(
                "Waiver relief_above must equal the amended LTV threshold."
            )
        if (
            relief_up_to is not None
            and relief_above is not None
            and relief_up_to < relief_above
        ):
            errors.append(
                "Waiver relief_up_to cannot be below relief_above."
            )
        if (
            condition_start
            and condition_end
            and condition_end < condition_start
        ):
            errors.append(
                "Temporary Distribution prohibition ends before it begins."
            )
        if (
            base_value is not None
            and amended_value is not None
            and base_value == amended_value
        ):
            errors.append(
                "Base and amended LTV values are identical; confirm the amendment mapping."
            )

    def progress(self, draft: MappingDraft | None = None) -> tuple[int, int]:
        draft = draft or self.load_draft()
        reviewed = sum(
            1
            for slot in SLOTS
            if self._slot_complete(draft.slots.get(slot.slot_id, {}), slot)
        )
        return reviewed, len(SLOTS)

    @staticmethod
    def _slot_complete(entry: dict[str, Any], slot: MappingSlot) -> bool:
        if not all(
            str(entry.get(field_name, "")).strip()
            for field_name in ("passage_id", "quote", *slot.required_fields)
        ):
            return False
        return True

    def status(self) -> MappingStatus:
        if self.draft_path.exists():
            draft = self.load_draft()
            if draft.last_validation_errors:
                return MappingStatus.INVALID
        if not self.manager.validate_mapping(self.workspace_id):
            return MappingStatus.READY
        if self.draft_path.exists():
            return MappingStatus.DRAFT
        return MappingStatus.UNMAPPED

    def build_mapping_payload(
        self, draft: MappingDraft | None = None
    ) -> dict[str, Any]:
        draft = draft or self.load_draft()
        base = draft.slots["ltv_base"]
        amendment = draft.slots["ltv_amendment"]
        waiver = draft.slots["ltv_waiver"]
        condition = draft.slots["distribution_temporary"]

        provisions: dict[str, dict[str, Any]] = {}
        for slot in SLOTS:
            entry = draft.slots[slot.slot_id]
            provisions.setdefault(slot.group, {})[slot.key] = {
                "document_id": entry["document_id"],
                "locator": entry["locator"],
                "quote": entry["quote"],
            }

        return {
            "document_updates": {
                draft.roles["amendment"]: {
                    "current_status": "effective",
                    "modifies_document_id": draft.roles["facility"],
                    "modifications": [
                        {
                            "topic": "ltv_threshold",
                            "original_locator": base["locator"],
                            "source_locator": amendment["locator"],
                            "value": float(amendment["value"]),
                            "unit": "percent",
                            "applies_from": amendment["applies_from"],
                            "applies_to": amendment["applies_to"],
                        }
                    ],
                },
                draft.roles["waiver"]: {
                    "current_status": "effective",
                    "related_document_ids": [
                        draft.roles["facility"],
                        draft.roles["amendment"],
                    ],
                    "waivers": [
                        {
                            "topic": "ltv_threshold",
                            "source_locator": waiver["locator"],
                            "test_date": waiver["test_date"],
                            "relief_above": float(waiver["relief_above"]),
                            "relief_up_to": float(waiver["relief_up_to"]),
                            "unit": "percent",
                            "does_not_amend": True,
                        }
                    ],
                    "conditions": [
                        {
                            "topic": "distribution",
                            "source_locator": condition["locator"],
                            "prohibition": True,
                            "applies_from": condition["applies_from"],
                            "applies_to": condition["applies_to"],
                        }
                    ],
                },
            },
            "base_terms": [
                {
                    "topic": "ltv_threshold",
                    "document_id": draft.roles["facility"],
                    "source_locator": base["locator"],
                    "value": float(base["value"]),
                    "unit": "percent",
                    "applies_from": base["applies_from"],
                }
            ],
            "provisions": provisions,
        }

    def activate(self) -> list[str]:
        draft = self.load_draft()
        errors = self.validate_draft(draft)
        if errors:
            draft.last_validation_errors = errors
            self.save_draft(draft)
            return errors

        payload_path = self.workspace_dir / "mapping.pending.json"
        self._atomic_write_json(payload_path, self.build_mapping_payload(draft))
        try:
            errors = self.manager.apply_mapping(
                self.workspace_id, payload_path
            )
        finally:
            payload_path.unlink(missing_ok=True)
        if errors:
            draft.last_validation_errors = errors
            self.save_draft(draft)
            return errors

        draft.last_validation_errors = []
        self.save_draft(draft)
        return []

    @staticmethod
    def _atomic_write_json(path: Path, value: dict[str, Any]) -> None:
        temp = path.with_suffix(path.suffix + ".tmp")
        temp.write_text(
            json.dumps(value, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        os.replace(temp, path)
