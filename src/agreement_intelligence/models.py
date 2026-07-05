from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class DocumentMetadata:
    document_id: str
    document_type: str
    title: str
    source_path: str
    execution_date: str
    effective_date: str
    current_status: str
    raw: dict[str, Any] = field(repr=False)


@dataclass(frozen=True)
class Passage:
    passage_id: str
    document_id: str
    document_title: str
    document_type: str
    locator: str
    heading: str
    page: int
    text: str
    source_path: str


@dataclass(frozen=True)
class Citation:
    document_id: str
    document_title: str
    document_type: str
    locator: str
    page: int
    passage_id: str
    supporting_passage: str
    source_path: str


@dataclass
class Answer:
    question: str
    as_of_date: str
    short_answer: str
    support_status: str
    sources: list[Citation] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    missing_information: list[str] = field(default_factory=list)
    human_review_required: bool = False
    review_note: str = ""
    notes_on_currentness: str = ""
    query_category: str = "unknown"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_markdown(self) -> str:
        lines = [
            f"# Answer",
            "",
            self.short_answer,
            "",
            "## Support status",
            "",
            self.support_status,
        ]

        if self.sources:
            lines.extend(["", "## Sources", ""])
            for index, source in enumerate(self.sources, start=1):
                lines.extend(
                    [
                        (
                            f"{index}. **{source.document_title}**, "
                            f"{source.locator}, page {source.page}"
                        ),
                        "",
                        f"   > {source.supporting_passage.replace(chr(10), chr(10) + '   > ')}",
                        "",
                    ]
                )

        if self.notes_on_currentness:
            lines.extend(
                ["## Currentness note", "", self.notes_on_currentness, ""]
            )

        if self.assumptions:
            lines.extend(["## Assumptions", ""])
            lines.extend(f"- {item}" for item in self.assumptions)
            lines.append("")

        if self.missing_information:
            lines.extend(["## Missing information", ""])
            lines.extend(f"- {item}" for item in self.missing_information)
            lines.append("")

        if self.review_note:
            lines.extend(["## Human review", "", self.review_note, ""])

        return "\n".join(lines).rstrip() + "\n"
