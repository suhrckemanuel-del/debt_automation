from __future__ import annotations

import re
from pathlib import Path

from .models import DocumentMetadata, Passage

PAGE_PATTERN = re.compile(r"^<!-- page: (?P<page>\d+) -->$")
HEADING_PATTERN = re.compile(r"^## (?P<heading>.+)$")


def _locator_from_heading(heading: str) -> str:
    return heading.split(" — ", maxsplit=1)[0].strip()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def parse_document(metadata: DocumentMetadata, path: Path) -> list[Passage]:
    lines = path.read_text(encoding="utf-8").splitlines()
    passages: list[Passage] = []
    current_page: int | None = None
    current_heading: str | None = None
    current_locator: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer
        if current_heading is None or current_locator is None or current_page is None:
            buffer = []
            return

        text = "\n".join(buffer).strip()
        if not text:
            buffer = []
            return

        passage_id = f"{metadata.document_id}:{_slug(current_locator)}"
        passages.append(
            Passage(
                passage_id=passage_id,
                document_id=metadata.document_id,
                document_title=metadata.title,
                document_type=metadata.document_type,
                locator=current_locator,
                heading=current_heading,
                page=current_page,
                text=text,
                source_path=metadata.source_path,
            )
        )
        buffer = []

    for line in lines:
        page_match = PAGE_PATTERN.match(line)
        if page_match:
            if current_heading is not None and buffer:
                flush()
                current_heading = None
                current_locator = None
            current_page = int(page_match.group("page"))
            continue

        heading_match = HEADING_PATTERN.match(line)
        if heading_match:
            flush()
            current_heading = heading_match.group("heading").strip()
            current_locator = _locator_from_heading(current_heading)
            continue

        if current_heading is not None:
            buffer.append(line)

    flush()
    return passages


def parse_corpus(registry: "DocumentRegistry") -> list[Passage]:
    from .registry import DocumentRegistry

    if not isinstance(registry, DocumentRegistry):
        raise TypeError("registry must be a DocumentRegistry")

    passages: list[Passage] = []
    for document in registry.documents:
        passages.extend(parse_document(document, registry.source_file(document.document_id)))
    return passages
