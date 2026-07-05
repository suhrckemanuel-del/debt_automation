from __future__ import annotations

import json
import os
import re
import shutil
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

WORKSPACE_ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]{1,39}$")
SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf"}
DOCUMENT_TYPES = {
    "facility_agreement",
    "amendment_letter",
    "waiver_letter",
    "compliance_certificate",
    "valuation_report",
    "hedge_document",
    "consent_letter",
    "other",
}
REQUIRED_PROVISIONS = {
    "ltv": {"base", "amendment", "waiver"},
    "distribution": {"restriction", "definition", "temporary_prohibition"},
    "disposal_distribution": {
        "disposal_restriction",
        "disposal_definition",
        "mandatory_prepayment",
    },
}


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "document"


@dataclass(frozen=True)
class WorkspaceSummary:
    workspace_id: str
    workspace_name: str
    document_count: int
    mapped: bool
    mapping_status: str
    reviewed_count: int
    total_count: int
    default_as_of_date: str
    manifest_path: str


class WorkspaceManager:
    def __init__(self, repo_root: Path | str) -> None:
        self.repo_root = Path(repo_root).resolve()
        self.workspaces_root = self.repo_root / "workspaces"
        self.workspaces_root.mkdir(exist_ok=True)

    def _validate_id(self, workspace_id: str) -> str:
        if not WORKSPACE_ID_PATTERN.fullmatch(workspace_id):
            raise ValueError(
                "Workspace ID must start with a lowercase letter and contain only "
                "lowercase letters, numbers, or hyphens (2–40 characters)."
            )
        return workspace_id

    def workspace_dir(self, workspace_id: str) -> Path:
        valid_id = self._validate_id(workspace_id)
        path = (self.workspaces_root / valid_id).resolve()
        if self.workspaces_root.resolve() not in path.parents:
            raise ValueError("Workspace path escapes workspace root.")
        return path

    def manifest_path(self, workspace_id: str) -> Path:
        return self.workspace_dir(workspace_id) / "manifest.json"

    def load_manifest(self, workspace_id: str) -> dict[str, Any]:
        path = self.manifest_path(workspace_id)
        if not path.exists():
            raise FileNotFoundError(f"Workspace not found: {workspace_id}")
        return json.loads(path.read_text(encoding="utf-8"))

    def list(self) -> list[WorkspaceSummary]:
        summaries: list[WorkspaceSummary] = []
        if not self.workspaces_root.exists():
            return summaries
        for path in sorted(self.workspaces_root.iterdir()):
            manifest_path = path / "manifest.json"
            if not path.is_dir() or not manifest_path.exists():
                continue
            try:
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            draft_path = path / "mapping_draft.json"
            mapping_errors = self.validate_mapping(
                manifest.get("workspace_id", path.name)
            )
            manifest_ready = not mapping_errors
            draft_invalid = False
            if draft_path.exists():
                try:
                    draft = json.loads(
                        draft_path.read_text(encoding="utf-8")
                    )
                    reviewed_count = sum(
                        1
                        for entry in draft.get("slots", {}).values()
                        if entry.get("passage_id") and entry.get("quote")
                    )
                    draft_invalid = bool(
                        draft.get("last_validation_errors")
                    )
                except (json.JSONDecodeError, OSError):
                    reviewed_count = 0
                    draft_invalid = True
            else:
                reviewed_count = 0

            if draft_invalid:
                mapping_status = "invalid"
            elif manifest_ready:
                mapping_status = "ready"
                reviewed_count = 9
            elif draft_path.exists():
                mapping_status = "draft"
            else:
                mapping_status = "unmapped"
            summaries.append(
                WorkspaceSummary(
                    workspace_id=manifest["workspace_id"],
                    workspace_name=manifest.get(
                        "workspace_name", manifest["workspace_id"]
                    ),
                    document_count=len(manifest.get("documents", [])),
                    mapped=manifest_ready,
                    mapping_status=mapping_status,
                    reviewed_count=reviewed_count,
                    total_count=9,
                    default_as_of_date=manifest.get(
                        "default_as_of_date", date.today().isoformat()
                    ),
                    manifest_path=str(manifest_path.relative_to(self.repo_root)),
                )
            )
        return summaries

    @staticmethod
    def _mapping_shape_complete(manifest: dict[str, Any]) -> bool:
        provisions = manifest.get("provisions", {})
        for group, required_keys in REQUIRED_PROVISIONS.items():
            if not required_keys.issubset(set(provisions.get(group, {}))):
                return False
        return bool(manifest.get("base_terms"))

    def validate_mapping(
        self,
        workspace_id: str,
        manifest_path: Path | None = None,
    ) -> list[str]:
        from .parser import parse_corpus
        from .registry import DocumentRegistry
        from .retrieval import PassageStore

        selected_manifest_path = manifest_path or self.manifest_path(workspace_id)
        manifest = json.loads(
            selected_manifest_path.read_text(encoding="utf-8")
        )
        errors: list[str] = []
        if not self._mapping_shape_complete(manifest):
            errors.append(
                "Mapping is incomplete. Required groups: ltv, distribution, "
                "and disposal_distribution."
            )
            return errors

        document_ids = {
            document["document_id"] for document in manifest.get("documents", [])
        }
        for term in manifest.get("base_terms", []):
            if term.get("document_id") not in document_ids:
                errors.append(
                    f"Base term references unknown document: {term.get('document_id')}"
                )

        try:
            registry = DocumentRegistry(
                self.repo_root,
                registry_path=selected_manifest_path,
                workspace_id=workspace_id,
            )
            store = PassageStore(parse_corpus(registry))
        except (KeyError, ValueError, FileNotFoundError) as exc:
            errors.append(f"Workspace corpus could not be parsed: {exc}")
            return errors

        for group, entries in manifest["provisions"].items():
            for key, provision in entries.items():
                label = f"{group}.{key}"
                document_id = provision.get("document_id")
                locator = provision.get("locator")
                quote = provision.get("quote")
                if not all((document_id, locator, quote)):
                    errors.append(f"{label} requires document_id, locator, and quote.")
                    continue
                try:
                    passage = store.get(document_id, locator)
                except KeyError:
                    errors.append(
                        f"{label} points to a missing passage: "
                        f"{document_id} {locator}"
                    )
                    continue
                if quote not in passage.text:
                    errors.append(
                        f"{label} quote is not an exact excerpt of "
                        f"{document_id} {locator}."
                    )

        amendment_topics = {
            modification.get("topic")
            for document in manifest.get("documents", [])
            for modification in document.get("modifications", [])
        }
        waiver_topics = {
            waiver.get("topic")
            for document in manifest.get("documents", [])
            for waiver in document.get("waivers", [])
        }
        condition_topics = {
            condition.get("topic")
            for document in manifest.get("documents", [])
            for condition in document.get("conditions", [])
        }
        if "ltv_threshold" not in amendment_topics:
            errors.append("No ltv_threshold amendment metadata is configured.")
        if "ltv_threshold" not in waiver_topics:
            errors.append("No ltv_threshold waiver metadata is configured.")
        if "distribution" not in condition_topics:
            errors.append("No distribution condition metadata is configured.")
        return errors

    def apply_mapping(
        self, workspace_id: str, mapping_path: Path | str
    ) -> list[str]:
        if workspace_id == "demo":
            raise PermissionError("The synthetic demo workspace is read-only.")
        path = Path(mapping_path).expanduser().resolve()
        if not path.is_file() or path.suffix.lower() != ".json":
            raise ValueError("Mapping must be a local JSON file.")

        mapping = json.loads(path.read_text(encoding="utf-8"))
        manifest_path = self.manifest_path(workspace_id)
        manifest = self.load_manifest(workspace_id)
        updates = mapping.get("document_updates", {})
        known_documents = {
            document["document_id"]: document for document in manifest["documents"]
        }
        for document_id, update in updates.items():
            if document_id not in known_documents:
                raise ValueError(
                    f"Mapping references unknown document: {document_id}"
                )
            allowed_fields = {
                "current_status",
                "related_document_ids",
                "modifies_document_id",
                "modifications",
                "waivers",
                "conditions",
            }
            for key, value in update.items():
                if key not in allowed_fields:
                    raise ValueError(
                        f"Unsupported document update field: {document_id}.{key}"
                    )
                known_documents[document_id][key] = value

        manifest["base_terms"] = mapping.get("base_terms", [])
        manifest["provisions"] = mapping.get("provisions", {})
        pending_path = manifest_path.with_name("manifest.pending.json")
        self._write_manifest(pending_path, manifest)
        errors = self.validate_mapping(
            workspace_id, manifest_path=pending_path
        )
        if errors:
            pending_path.unlink(missing_ok=True)
            return errors

        if not self.validate_mapping(workspace_id):
            backup_path = manifest_path.with_name("manifest.last-valid.json")
            backup_temp = backup_path.with_suffix(".json.tmp")
            shutil.copy2(manifest_path, backup_temp)
            os.replace(backup_temp, backup_path)

        os.replace(pending_path, manifest_path)
        return errors

    def write_mapping_template(
        self, workspace_id: str, output_path: Path | str
    ) -> Path:
        manifest = self.load_manifest(workspace_id)
        output = Path(output_path).expanduser().resolve()
        if output.suffix.lower() != ".json":
            raise ValueError("Mapping template output must end in .json.")
        if output.exists():
            raise FileExistsError(f"Output already exists: {output}")

        by_type: dict[str, str] = {}
        for document in manifest.get("documents", []):
            by_type.setdefault(
                document["document_type"], document["document_id"]
            )
        facility = by_type.get("facility_agreement", "")
        amendment = by_type.get("amendment_letter", "")
        waiver = by_type.get("waiver_letter", "")

        template = {
            "_instructions": (
                "Fill every null/empty mapping value from reviewed source text. "
                "Quotes must be exact excerpts. Do not infer legal conclusions."
            ),
            "document_updates": {
                amendment: {
                    "current_status": "effective",
                    "modifies_document_id": facility,
                    "modifications": [
                        {
                            "topic": "ltv_threshold",
                            "original_locator": "",
                            "source_locator": "",
                            "value": None,
                            "unit": "percent",
                            "applies_from": None,
                            "applies_to": None,
                        }
                    ],
                },
                waiver: {
                    "current_status": "effective",
                    "related_document_ids": [
                        item for item in (facility, amendment) if item
                    ],
                    "waivers": [
                        {
                            "topic": "ltv_threshold",
                            "source_locator": "",
                            "test_date": None,
                            "relief_above": None,
                            "relief_up_to": None,
                            "unit": "percent",
                            "does_not_amend": True,
                        }
                    ],
                    "conditions": [
                        {
                            "topic": "distribution",
                            "source_locator": "",
                            "prohibition": True,
                            "applies_from": None,
                            "applies_to": None,
                        }
                    ],
                },
            },
            "base_terms": [
                {
                    "topic": "ltv_threshold",
                    "document_id": facility,
                    "source_locator": "",
                    "value": None,
                    "unit": "percent",
                    "applies_from": None,
                }
            ],
            "provisions": {
                "ltv": {
                    "base": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                    "amendment": {
                        "document_id": amendment,
                        "locator": "",
                        "quote": "",
                    },
                    "waiver": {
                        "document_id": waiver,
                        "locator": "",
                        "quote": "",
                    },
                },
                "distribution": {
                    "restriction": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                    "definition": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                    "temporary_prohibition": {
                        "document_id": waiver,
                        "locator": "",
                        "quote": "",
                    },
                },
                "disposal_distribution": {
                    "disposal_restriction": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                    "disposal_definition": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                    "mandatory_prepayment": {
                        "document_id": facility,
                        "locator": "",
                        "quote": "",
                    },
                },
            },
        }
        template["document_updates"] = {
            key: value
            for key, value in template["document_updates"].items()
            if key
        }
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(template, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        return output

    def initialize(
        self,
        workspace_id: str,
        workspace_name: str,
        facility_id: str | None = None,
        default_as_of_date: str | None = None,
    ) -> Path:
        if not workspace_name.strip():
            raise ValueError("Workspace name is required.")
        if default_as_of_date:
            date.fromisoformat(default_as_of_date)
        workspace_dir = self.workspace_dir(workspace_id)
        manifest_path = workspace_dir / "manifest.json"
        if manifest_path.exists():
            raise FileExistsError(f"Workspace already exists: {workspace_id}")

        (workspace_dir / "documents").mkdir(parents=True)
        manifest = {
            "workspace_id": workspace_id,
            "workspace_name": workspace_name.strip() or workspace_id,
            "facility_id": facility_id or workspace_id,
            "default_as_of_date": default_as_of_date or date.today().isoformat(),
            "documents": [],
            "base_terms": [],
            "provisions": {},
        }
        self._write_manifest(manifest_path, manifest)
        return manifest_path

    def add_document(
        self,
        workspace_id: str,
        source: Path | str,
        document_type: str,
        title: str,
        effective_date: str,
        execution_date: str | None = None,
    ) -> dict[str, Any]:
        if not title.strip():
            raise ValueError("Document title is required.")
        date.fromisoformat(effective_date)
        if execution_date:
            date.fromisoformat(execution_date)
        if workspace_id == "demo":
            raise PermissionError("The synthetic demo workspace is read-only.")
        if document_type not in DOCUMENT_TYPES:
            raise ValueError(
                f"Unsupported document type: {document_type}. "
                f"Choose one of: {', '.join(sorted(DOCUMENT_TYPES))}"
            )

        source_path = Path(source).expanduser().resolve()
        if not source_path.is_file():
            raise FileNotFoundError(f"Document not found: {source_path}")
        if source_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {source_path.suffix}. "
                "Supported types: .md, .txt, .pdf"
            )

        manifest_path = self.manifest_path(workspace_id)
        manifest = self.load_manifest(workspace_id)
        documents_dir = manifest_path.parent / "documents"
        documents_dir.mkdir(exist_ok=True)

        base_slug = _slug(title.strip())
        used_ids = {document["document_id"] for document in manifest["documents"]}
        document_id = f"doc_{base_slug.replace('-', '_')}"
        suffix = 2
        while document_id in used_ids:
            document_id = f"doc_{base_slug.replace('-', '_')}_{suffix}"
            suffix += 1

        output_path = documents_dir / f"{base_slug}.md"
        suffix = 2
        while output_path.exists():
            output_path = documents_dir / f"{base_slug}-{suffix}.md"
            suffix += 1

        if source_path.suffix.lower() == ".pdf":
            text = self._extract_pdf(source_path, title.strip())
        else:
            text = self._normalize_text_document(source_path, title.strip())

        output_path.write_text(text, encoding="utf-8")
        relative_output = output_path.relative_to(self.repo_root).as_posix()

        document = {
            "document_id": document_id,
            "document_type": document_type,
            "title": title.strip(),
            "source_path": relative_output,
            "execution_date": execution_date or effective_date,
            "effective_date": effective_date,
            "current_status": "unreviewed",
            "related_document_ids": [],
        }
        manifest["documents"].append(document)
        self._write_manifest(manifest_path, manifest)
        return document

    def _extract_pdf(self, source_path: Path, title: str) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError(
                "PDF support requires pypdf. Run setup.bat or "
                "python -m pip install -e ."
            ) from exc

        try:
            reader = PdfReader(str(source_path))
        except Exception as exc:
            raise RuntimeError(
                "The PDF could not be opened. It may be encrypted or damaged."
            ) from exc
        lines = [
            f"# {title}",
            "",
            "> Locally extracted text. Review page text before relying on it.",
            "",
        ]
        for page_number, page in enumerate(reader.pages, start=1):
            try:
                text = (page.extract_text() or "").strip()
            except Exception as exc:
                raise RuntimeError(
                    f"Text extraction failed on PDF page {page_number}."
                ) from exc
            lines.extend(
                [
                    f"<!-- page: {page_number} -->",
                    f"## Page {page_number}",
                    "",
                    text or "[No extractable text on this page]",
                    "",
                ]
            )
        return "\n".join(lines).rstrip() + "\n"

    def _normalize_text_document(self, source_path: Path, title: str) -> str:
        text = source_path.read_text(encoding="utf-8").strip()
        if "<!-- page:" in text and re.search(r"^## ", text, re.MULTILINE):
            return text + "\n"
        return (
            f"# {title}\n\n"
            "> Locally imported text. Review source structure before relying on it.\n\n"
            "<!-- page: 1 -->\n"
            "## Document\n\n"
            f"{text}\n"
        )

    @staticmethod
    def _write_manifest(path: Path, manifest: dict[str, Any]) -> None:
        path.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
