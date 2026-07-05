from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import DocumentMetadata


class DocumentRegistry:
    def __init__(
        self,
        repo_root: Path,
        registry_path: Path | None = None,
        workspace_id: str = "demo",
    ) -> None:
        self.repo_root = repo_root.resolve()
        self.registry_path = (
            registry_path
            or self.repo_root / "workspaces" / workspace_id / "manifest.json"
        )
        raw = json.loads(self.registry_path.read_text(encoding="utf-8"))
        self.workspace_id: str = raw.get("workspace_id", workspace_id)
        self.workspace_name: str = raw.get("workspace_name", self.workspace_id)
        self.default_as_of_date: str = raw.get("default_as_of_date", "2026-07-02")
        self.facility_id: str = raw["facility_id"]
        self.base_terms: list[dict[str, Any]] = raw.get("base_terms", [])
        self.provisions: dict[str, Any] = raw.get("provisions", {})
        self._documents: dict[str, DocumentMetadata] = {}

        for item in raw["documents"]:
            metadata = DocumentMetadata(
                document_id=item["document_id"],
                document_type=item["document_type"],
                title=item["title"],
                source_path=item["source_path"],
                execution_date=item["execution_date"],
                effective_date=item["effective_date"],
                current_status=item["current_status"],
                raw=item,
            )
            self._documents[metadata.document_id] = metadata

    @property
    def documents(self) -> list[DocumentMetadata]:
        return list(self._documents.values())

    def get(self, document_id: str) -> DocumentMetadata:
        try:
            return self._documents[document_id]
        except KeyError as exc:
            raise KeyError(f"Unknown document_id: {document_id}") from exc

    def source_file(self, document_id: str) -> Path:
        metadata = self.get(document_id)
        path = (self.repo_root / metadata.source_path).resolve()
        if self.repo_root not in path.parents:
            raise ValueError(f"Source path escapes repository: {metadata.source_path}")
        return path

    def documents_of_type(self, document_type: str) -> list[DocumentMetadata]:
        return [
            document
            for document in self.documents
            if document.document_type == document_type
        ]
