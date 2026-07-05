from __future__ import annotations

import json
import shutil
import tempfile
import sys
import threading
import unittest
from datetime import date
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from agreement_intelligence.classification import classify_query
from agreement_intelligence.engine import AgreementIntelligenceEngine
from agreement_intelligence.evaluator import evaluate_benchmark
from agreement_intelligence.hierarchy import HierarchyResolver
from agreement_intelligence.mapping import MappingService, MappingStatus, SLOTS
from agreement_intelligence.parser import parse_corpus
from agreement_intelligence.registry import DocumentRegistry
from agreement_intelligence.web import make_handler, render_page
from agreement_intelligence.workspace import WorkspaceManager


def make_unmapped_synthetic_workspace(root: Path) -> MappingService:
    corpus_source = ROOT / "docs" / "phase-1" / "synthetic-corpus"
    corpus_target = root / "docs" / "phase-1" / "synthetic-corpus"
    corpus_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(corpus_source, corpus_target)

    manifest = json.loads(
        (ROOT / "workspaces" / "demo" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    manifest["workspace_id"] = "pilot"
    manifest["workspace_name"] = "Synthetic Guided Pilot"
    manifest["base_terms"] = []
    manifest["provisions"] = {}
    for document in manifest["documents"]:
        for key in (
            "modifies_document_id",
            "modifications",
            "waivers",
            "conditions",
        ):
            document.pop(key, None)
    workspace_dir = root / "workspaces" / "pilot"
    workspace_dir.mkdir(parents=True)
    (workspace_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return MappingService(root, "pilot")


def complete_mapping_draft(service: MappingService) -> None:
    service.update_roles(
        {
            "facility": "doc_facility_001",
            "amendment": "doc_amendment_001",
            "waiver": "doc_waiver_001",
            "confirm_amendment_relationship": "yes",
            "confirm_waiver_relationship": "yes",
        }
    )
    field_values = {
        "ltv_base": {
            "value": "65.0",
            "applies_from": "2024-01-15",
        },
        "ltv_amendment": {
            "value": "70.0",
            "applies_from": "2026-05-15",
            "applies_to": "2026-12-31",
        },
        "ltv_waiver": {
            "test_date": "2026-06-30",
            "relief_above": "70.0",
            "relief_up_to": "72.0",
        },
        "distribution_temporary": {
            "applies_from": "2026-07-01",
            "applies_to": "2026-09-30",
        },
    }
    for step in (2, 3, 4):
        form: dict[str, str] = {}
        for slot in (item for item in SLOTS if item.step == step):
            candidate = service.candidates(slot.slot_id)[0]
            form[f"{slot.slot_id}_passage_id"] = candidate.passage_id
            form[f"{slot.slot_id}_quote"] = candidate.text
            for field_name, value in field_values.get(
                slot.slot_id, {}
            ).items():
                form[f"{slot.slot_id}_{field_name}"] = value
        service.update_step(step, form)


def make_custom_guided_workspace(root: Path) -> MappingService:
    manager = WorkspaceManager(root)
    manager.initialize(
        "pilot",
        "Custom Guided Pilot",
        default_as_of_date="2028-07-02",
    )
    documents = (
        (
            "facility.md",
            "facility_agreement",
            "Custom Facility",
            "2027-01-01",
            """# Custom Facility

<!-- page: 1 -->
## Clause A — LTV

The Loan-to-Value Ratio shall not exceed 55.0% on any Test Date.

## Clause B — Distribution restriction

The Borrower shall not make a Distribution unless it is a Custom Permitted Distribution.

## Clause C — Distribution definition

**Custom Permitted Distribution** means a Distribution satisfying all reviewed conditions.

## Clause D — Disposal restriction

The Borrower shall not make a Disposal unless it is a Custom Permitted Disposal.

## Clause E — Disposal definition

**Custom Permitted Disposal** means a Disposal satisfying all reviewed sale conditions.

## Clause F — Mandatory prepayment

All Net Disposal Proceeds must be applied in mandatory prepayment.
""",
        ),
        (
            "amendment.md",
            "amendment_letter",
            "Custom Amendment",
            "2028-01-01",
            """# Custom Amendment

<!-- page: 1 -->
## Section A — LTV amendment

From the Effective Date through 31 December 2028, the LTV threshold is replaced by 60.0%.
""",
        ),
        (
            "waiver.md",
            "waiver_letter",
            "Custom Waiver",
            "2028-07-01",
            """# Custom Waiver

<!-- page: 1 -->
## Section A — Limited waiver

The Lender waives the LTV threshold above 60.0% but not above 62.0% for the Test Date on 30 June 2028 only. This does not amend the threshold.

## Section B — Distribution condition

The Borrower shall make no Distribution from the Effective Date through 30 September 2028.
""",
        ),
    )
    for file_name, document_type, title, effective_date, content in documents:
        path = root / file_name
        path.write_text(content, encoding="utf-8")
        manager.add_document(
            "pilot",
            path,
            document_type,
            title,
            effective_date,
        )
    return MappingService(root, "pilot")


class RegistryAndParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = DocumentRegistry(ROOT)
        cls.passages = parse_corpus(cls.registry)

    def test_registry_contains_five_synthetic_documents(self) -> None:
        self.assertEqual(len(self.registry.documents), 5)

    def test_parser_extracts_expected_passages(self) -> None:
        self.assertEqual(len(self.passages), 15)
        lookup = {
            (passage.document_id, passage.locator): passage
            for passage in self.passages
        }
        self.assertEqual(
            lookup[("doc_facility_001", "Clause 10.2")].page,
            14,
        )
        self.assertEqual(
            lookup[("doc_waiver_001", "Section 3")].page,
            2,
        )

    def test_registry_paths_stay_inside_repository(self) -> None:
        for document in self.registry.documents:
            path = self.registry.source_file(document.document_id)
            self.assertIn(ROOT.resolve(), path.parents)


class ClassificationTests(unittest.TestCase):
    def test_classifies_three_supported_workflows(self) -> None:
        self.assertEqual(
            classify_query("What is the current maximum LTV?"),
            "current_ltv",
        )
        self.assertEqual(
            classify_query("Are distributions restricted?"),
            "distribution_restriction",
        )
        self.assertEqual(
            classify_query(
                "Can the borrower sell part of the asset and distribute the proceeds?"
            ),
            "disposal_and_distribution",
        )

    def test_unknown_question_stays_unknown(self) -> None:
        self.assertEqual(
            classify_query("Who is the relationship manager?"),
            "unknown",
        )


class HierarchyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.resolver = HierarchyResolver(DocumentRegistry(ROOT))

    def test_amendment_controls_in_2026(self) -> None:
        position = self.resolver.ltv_position("2026-07-02")
        self.assertEqual(position.threshold, 70.0)
        self.assertTrue(position.amendment_active)
        self.assertIsNotNone(position.waiver)
        self.assertTrue(position.waiver["does_not_amend"])

    def test_original_threshold_resumes_in_2027(self) -> None:
        position = self.resolver.ltv_position("2027-01-02")
        self.assertEqual(position.threshold, 65.0)
        self.assertFalse(position.amendment_active)
        self.assertIsNone(position.waiver)

    def test_waiver_does_not_apply_to_other_test_date(self) -> None:
        position = self.resolver.ltv_position(
            "2026-07-02", test_date=date(2026, 12, 31)
        )
        self.assertEqual(position.threshold, 70.0)
        self.assertIsNone(position.waiver)

    def test_distribution_condition_expires(self) -> None:
        self.assertIsNotNone(
            self.resolver.active_distribution_condition("2026-07-02")
        )
        self.assertIsNone(
            self.resolver.active_distribution_condition("2026-10-01")
        )


class AnswerEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = AgreementIntelligenceEngine(ROOT)

    def test_current_ltv_distinguishes_waiver_from_threshold(self) -> None:
        answer = self.engine.answer(
            "What is the current maximum LTV, considering amendments or waivers?"
        )
        self.assertEqual(answer.support_status, "supported")
        self.assertIn("70.0%", answer.short_answer)
        self.assertIn("does not change the contractual threshold", answer.short_answer)
        self.assertEqual(len(answer.sources), 3)

    def test_distribution_answer_includes_definition_and_waiver(self) -> None:
        answer = self.engine.answer(
            "Are distributions restricted, and where are Permitted Distributions defined?"
        )
        self.assertEqual(answer.support_status, "supported")
        self.assertEqual(
            {source.locator for source in answer.sources},
            {"Clause 13.1", "Clause 1.1", "Section 3"},
        )

    def test_judgment_question_requires_human_review(self) -> None:
        answer = self.engine.answer(
            "Can the borrower sell part of the asset and distribute the proceeds?"
        )
        self.assertEqual(answer.support_status, "legal_review_required")
        self.assertTrue(answer.human_review_required)
        self.assertTrue(answer.short_answer.startswith("No final yes/no"))
        self.assertGreaterEqual(len(answer.missing_information), 6)

    def test_unknown_question_abstains_exactly(self) -> None:
        answer = self.engine.answer(
            "Does the facility require a debt yield covenant?"
        )
        self.assertEqual(answer.support_status, "source_not_found")
        self.assertEqual(answer.short_answer, "Source not found.")
        self.assertEqual(answer.sources, [])

    def test_every_citation_is_an_exact_source_excerpt(self) -> None:
        questions = [
            "What is the current maximum LTV?",
            "Are distributions restricted?",
            "Can the borrower sell part of the asset and distribute the proceeds?",
        ]
        for question in questions:
            answer = self.engine.answer(question)
            for citation in answer.sources:
                passage = self.engine.store.get(
                    citation.document_id, citation.locator
                )
                self.assertIn(citation.supporting_passage, passage.text)

    def test_retrieval_prioritizes_modifying_documents_for_ltv(self) -> None:
        results = self.engine.search("What is the current maximum LTV?")
        document_types = [passage.document_type for passage, _ in results[:3]]
        self.assertIn("amendment_letter", document_types)
        self.assertIn("waiver_letter", document_types)


class BenchmarkTests(unittest.TestCase):
    def test_benchmark_passes(self) -> None:
        report = evaluate_benchmark(
            AgreementIntelligenceEngine(ROOT),
            ROOT / "data" / "benchmark_questions.json",
        )
        self.assertEqual(report["failed"], 0, json.dumps(report, indent=2))
        self.assertEqual(report["passed"], 13)


class WebInterfaceTests(unittest.TestCase):
    def test_initial_page_contains_form_and_examples(self) -> None:
        page = render_page()
        self.assertIn("Current Document Answer Assistant", page)
        self.assertIn('name="q"', page)
        self.assertIn("Find supported answer", page)

    def test_supported_answer_renders_sources(self) -> None:
        engine = AgreementIntelligenceEngine(ROOT)
        answer = engine.answer("What is the current maximum LTV?")
        page = render_page(question=answer.question, answer=answer)
        self.assertIn("Supported", page)
        self.assertIn("Synthetic Amendment Letter No. 1", page)
        self.assertIn("Clause 10.2", page)

    def test_user_content_is_escaped(self) -> None:
        page = render_page(question="<script>alert(1)</script>")
        self.assertNotIn("<script>alert(1)</script>", page)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", page)


class GuidedMappingTests(unittest.TestCase):
    def test_candidate_ranking_returns_expected_passage_for_all_slots(
        self,
    ) -> None:
        expected = {
            "ltv_base": ("doc_facility_001", "Clause 10.2"),
            "ltv_amendment": ("doc_amendment_001", "Section 2.1"),
            "ltv_waiver": ("doc_waiver_001", "Section 2.1"),
            "distribution_restriction": (
                "doc_facility_001",
                "Clause 13.1",
            ),
            "distribution_definition": (
                "doc_facility_001",
                "Clause 1.1",
            ),
            "distribution_temporary": ("doc_waiver_001", "Section 3"),
            "disposal_restriction": (
                "doc_facility_001",
                "Clause 12.3",
            ),
            "disposal_definition": (
                "doc_facility_001",
                "Clause 1.1",
            ),
            "mandatory_prepayment": (
                "doc_facility_001",
                "Clause 6.4",
            ),
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            service = make_unmapped_synthetic_workspace(Path(temp_dir))
            for slot in SLOTS:
                candidates = service.candidates(slot.slot_id)
                self.assertGreater(len(candidates), 0)
                self.assertLessEqual(len(candidates), 5)
                self.assertEqual(
                    (
                        candidates[0].document_id,
                        candidates[0].locator,
                    ),
                    expected[slot.slot_id],
                )
                self.assertGreater(len(candidates[0].reasons), 0)

    def test_draft_saves_reloads_and_reports_progress(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = make_unmapped_synthetic_workspace(root)
            self.assertEqual(service.status(), MappingStatus.UNMAPPED)
            complete_mapping_draft(service)

            resumed = MappingService(root, "pilot")
            self.assertEqual(resumed.progress(), (9, 9))
            self.assertEqual(resumed.status(), MappingStatus.DRAFT)
            self.assertEqual(resumed.validate_draft(), [])
            self.assertEqual(
                resumed.load_draft().roles["amendment"],
                "doc_amendment_001",
            )

    def test_invalid_quotes_dates_documents_and_missing_values_are_rejected(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = make_unmapped_synthetic_workspace(root)
            complete_mapping_draft(service)
            valid = service.load_draft()

            invalid_quote = service.load_draft()
            invalid_quote.slots["ltv_base"]["quote"] = "Invented quotation"
            self.assertTrue(
                any(
                    "not an exact source excerpt" in error
                    for error in service.validate_draft(invalid_quote)
                )
            )

            missing_value = service.load_draft()
            missing_value.slots["ltv_amendment"]["value"] = ""
            self.assertTrue(
                any(
                    "requires value" in error
                    for error in service.validate_draft(missing_value)
                )
            )

            unsupported_value = service.load_draft()
            unsupported_value.slots["ltv_base"]["value"] = "66.0"
            self.assertTrue(
                any(
                    "not shown in its exact supporting quotation" in error
                    for error in service.validate_draft(unsupported_value)
                )
            )

            unknown_document = service.load_draft()
            unknown_document.roles["waiver"] = "doc_unknown"
            self.assertTrue(
                any(
                    "unknown document" in error
                    for error in service.validate_draft(unknown_document)
                )
            )

            inconsistent_period = service.load_draft()
            inconsistent_period.slots["ltv_waiver"][
                "test_date"
            ] = "2027-06-30"
            self.assertTrue(
                any(
                    "inside the amendment period" in error
                    for error in service.validate_draft(inconsistent_period)
                )
            )
            self.assertEqual(service.validate_draft(valid), [])

    def test_activation_is_atomic_and_preserves_last_valid_manifest(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = make_unmapped_synthetic_workspace(root)
            complete_mapping_draft(service)
            self.assertEqual(service.activate(), [])
            self.assertEqual(service.status(), MappingStatus.READY)
            manager = WorkspaceManager(root)
            self.assertEqual(manager.validate_mapping("pilot"), [])

            answer = AgreementIntelligenceEngine(
                root, workspace_id="pilot"
            ).answer(
                "What is the current maximum LTV, considering waivers?",
                as_of="2026-07-02",
            )
            self.assertEqual(answer.support_status, "supported")
            self.assertIn("70.0%", answer.short_answer)

            complete_mapping_draft(service)
            self.assertEqual(service.activate(), [])
            backup = (
                root
                / "workspaces"
                / "pilot"
                / "manifest.last-valid.json"
            )
            self.assertTrue(backup.exists())

            manifest_path = manager.manifest_path("pilot")
            before = manifest_path.read_bytes()
            draft = service.load_draft()
            draft.slots["ltv_base"]["quote"] = "Not in the source"
            service.save_draft(draft)
            self.assertGreater(len(service.activate()), 0)
            self.assertEqual(before, manifest_path.read_bytes())
            self.assertEqual(service.status(), MappingStatus.INVALID)
            summary = WorkspaceManager(root).list()[0]
            self.assertTrue(summary.mapped)
            self.assertEqual(summary.mapping_status, "invalid")

    def test_guided_activation_uses_custom_values_and_dates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = make_custom_guided_workspace(root)
            service.update_roles(
                {
                    "facility": "doc_custom_facility",
                    "amendment": "doc_custom_amendment",
                    "waiver": "doc_custom_waiver",
                    "confirm_amendment_relationship": "yes",
                    "confirm_waiver_relationship": "yes",
                }
            )
            field_values = {
                "ltv_base": {
                    "value": "55.0",
                    "applies_from": "2027-01-01",
                },
                "ltv_amendment": {
                    "value": "60.0",
                    "applies_from": "2028-01-01",
                    "applies_to": "2028-12-31",
                },
                "ltv_waiver": {
                    "test_date": "2028-06-30",
                    "relief_above": "60.0",
                    "relief_up_to": "62.0",
                },
                "distribution_temporary": {
                    "applies_from": "2028-07-01",
                    "applies_to": "2028-09-30",
                },
            }
            for step in (2, 3, 4):
                fields: dict[str, str] = {}
                for slot in (
                    item for item in SLOTS if item.step == step
                ):
                    candidate = service.candidates(slot.slot_id)[0]
                    fields[
                        f"{slot.slot_id}_passage_id"
                    ] = candidate.passage_id
                    fields[f"{slot.slot_id}_quote"] = candidate.text
                    for name, value in field_values.get(
                        slot.slot_id, {}
                    ).items():
                        fields[f"{slot.slot_id}_{name}"] = value
                service.update_step(step, fields)

            self.assertEqual(service.activate(), [])
            answer = AgreementIntelligenceEngine(
                root, workspace_id="pilot"
            ).answer(
                "What is the current maximum LTV including waivers?",
                as_of="2028-07-02",
            )
            for expected in ("55.0%", "60.0%", "62.0%"):
                self.assertIn(expected, answer.short_answer)
            for demo_value in ("65.0%", "70.0%", "72.0%"):
                self.assertNotIn(demo_value, answer.short_answer)
            self.assertIn("30 June 2028", answer.short_answer)

    def test_browser_routes_complete_the_wizard_using_posted_mapping_data(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            service = make_unmapped_synthetic_workspace(root)
            server = ThreadingHTTPServer(
                ("127.0.0.1", 0), make_handler(root)
            )
            thread = threading.Thread(
                target=server.serve_forever, daemon=True
            )
            thread.start()
            base_url = f"http://127.0.0.1:{server.server_port}"

            def post(path: str, fields: dict[str, str]) -> tuple[str, str]:
                body = urlencode(fields).encode("utf-8")
                request = Request(
                    f"{base_url}{path}",
                    data=body,
                    headers={
                        "Content-Type": (
                            "application/x-www-form-urlencoded"
                        ),
                        "Content-Length": str(len(body)),
                    },
                    method="POST",
                )
                with urlopen(request, timeout=5) as response:
                    return (
                        response.geturl(),
                        response.read().decode("utf-8"),
                    )

            try:
                with urlopen(
                    f"{base_url}/workspace/map?workspace=pilot&step=1",
                    timeout=5,
                ) as response:
                    first_page = response.read().decode("utf-8")
                self.assertIn("Assign document roles", first_page)

                final_url, role_page = post(
                    "/workspace/map/save",
                    {
                        "workspace": "pilot",
                        "step": "1",
                        "facility": "doc_facility_001",
                        "amendment": "doc_amendment_001",
                        "waiver": "doc_waiver_001",
                        "confirm_amendment_relationship": "yes",
                        "confirm_waiver_relationship": "yes",
                    },
                )
                self.assertIn("Map LTV provisions", role_page)
                self.assertIn('data-target="ltv_base-quote"', role_page)
                self.assertIn(
                    'data-source="ltv_base-candidate-0-source"',
                    role_page,
                )
                self.assertIn(
                    'id="ltv_base-candidate-0-source"',
                    role_page,
                )
                self.assertIn('id="ltv_base-quote"', role_page)
                self.assertNotIn("70.0", final_url)

                field_values = {
                    "ltv_base": {
                        "value": "65.0",
                        "applies_from": "2024-01-15",
                    },
                    "ltv_amendment": {
                        "value": "70.0",
                        "applies_from": "2026-05-15",
                        "applies_to": "2026-12-31",
                    },
                    "ltv_waiver": {
                        "test_date": "2026-06-30",
                        "relief_above": "70.0",
                        "relief_up_to": "72.0",
                    },
                    "distribution_temporary": {
                        "applies_from": "2026-07-01",
                        "applies_to": "2026-09-30",
                    },
                }
                for step in (2, 3, 4):
                    fields = {"workspace": "pilot", "step": str(step)}
                    for slot in (
                        item for item in SLOTS if item.step == step
                    ):
                        candidate = service.candidates(slot.slot_id)[0]
                        fields[
                            f"{slot.slot_id}_passage_id"
                        ] = candidate.passage_id
                        fields[f"{slot.slot_id}_quote"] = (
                            candidate.text.replace("\n", "\r\n")
                        )
                        for name, value in field_values.get(
                            slot.slot_id, {}
                        ).items():
                            fields[f"{slot.slot_id}_{name}"] = value
                    final_url, page = post(
                        "/workspace/map/save", fields
                    )
                    self.assertNotIn("65.0", final_url)
                    self.assertNotIn("2026-12-31", final_url)
                self.assertIn("Review and activate", page)
                self.assertIn("9/9 provisions reviewed", page)

                final_url, activated_page = post(
                    "/workspace/map/activate",
                    {"workspace": "pilot"},
                )
                self.assertIn("Guided mapping activated", activated_page)
                self.assertIn("Ready · full answers enabled", activated_page)
                self.assertNotIn("70.0", final_url)
                self.assertEqual(
                    WorkspaceManager(root).validate_mapping("pilot"), []
                )
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


class WorkspaceTests(unittest.TestCase):
    def test_demo_mapping_is_complete_and_source_valid(self) -> None:
        errors = WorkspaceManager(ROOT).validate_mapping("demo")
        self.assertEqual(errors, [])

    def test_markdown_workspace_import_and_evidence_mode(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manager = WorkspaceManager(root)
            manager.initialize(
                "pilot",
                "Pilot Workspace",
                default_as_of_date="2026-07-02",
            )
            source = root / "sample.md"
            source.write_text(
                "Distributions are restricted unless lender consent is obtained.",
                encoding="utf-8",
            )
            document = manager.add_document(
                "pilot",
                source,
                document_type="facility_agreement",
                title="Pilot Facility Agreement",
                effective_date="2026-01-01",
            )

            imported = root / document["source_path"]
            self.assertTrue(imported.exists())
            self.assertIn("<!-- page: 1 -->", imported.read_text(encoding="utf-8"))

            engine = AgreementIntelligenceEngine(root, workspace_id="pilot")
            answer = engine.answer("Are distributions restricted?")
            self.assertEqual(answer.support_status, "partially_supported")
            self.assertTrue(answer.human_review_required)
            self.assertGreaterEqual(len(answer.sources), 1)

    def test_pdf_import_preserves_page_and_empty_text_warning(self) -> None:
        from pypdf import PdfWriter

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manager = WorkspaceManager(root)
            manager.initialize("pilot", "Pilot Workspace")
            pdf_path = root / "blank.pdf"
            writer = PdfWriter()
            writer.add_blank_page(width=200, height=200)
            with pdf_path.open("wb") as stream:
                writer.write(stream)

            document = manager.add_document(
                "pilot",
                pdf_path,
                document_type="amendment_letter",
                title="Blank Amendment",
                effective_date="2026-01-01",
            )
            imported_text = (root / document["source_path"]).read_text(
                encoding="utf-8"
            )
            self.assertIn("<!-- page: 1 -->", imported_text)
            self.assertIn("[No extractable text on this page]", imported_text)

    def test_mapping_template_and_invalid_mapping_rollback(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manager = WorkspaceManager(root)
            manager.initialize("pilot", "Pilot Workspace")
            source = root / "facility.md"
            source.write_text("LTV threshold is 65%.", encoding="utf-8")
            manager.add_document(
                "pilot",
                source,
                document_type="facility_agreement",
                title="Pilot Facility",
                effective_date="2026-01-01",
            )

            template_path = root / "mapping.json"
            manager.write_mapping_template("pilot", template_path)
            template = json.loads(template_path.read_text(encoding="utf-8"))
            self.assertIn("provisions", template)
            self.assertEqual(
                template["base_terms"][0]["document_id"],
                "doc_pilot_facility",
            )

            before = manager.load_manifest("pilot")
            errors = manager.apply_mapping("pilot", template_path)
            after = manager.load_manifest("pilot")
            self.assertGreater(len(errors), 0)
            self.assertEqual(before, after)

    def test_mapped_workspace_answers_use_workspace_values_not_demo_values(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manager = WorkspaceManager(root)
            manager.initialize(
                "pilot",
                "Custom Pilot",
                default_as_of_date="2028-07-02",
            )

            facility = root / "facility.md"
            facility.write_text(
                """# Custom Facility

<!-- page: 1 -->
## Clause A — LTV

The LTV shall not exceed 55.0%.

## Clause B — Distributions

No Distribution may be made except a Custom Permitted Distribution.

## Clause C — Distribution definition

A Custom Permitted Distribution requires the reviewed conditions.

## Clause D — Disposal restriction

No Disposal may be made without satisfying the Custom Disposal rule.

## Clause E — Disposal definition

A Custom Disposal must satisfy the reviewed sale conditions.

## Clause F — Prepayment

Custom Disposal Proceeds must be applied in mandatory prepayment.
""",
                encoding="utf-8",
            )
            amendment = root / "amendment.md"
            amendment.write_text(
                """# Custom Amendment

<!-- page: 1 -->
## Section A — LTV amendment

For Test Dates in 2028, the LTV threshold is 60.0%.
""",
                encoding="utf-8",
            )
            waiver = root / "waiver.md"
            waiver.write_text(
                """# Custom Waiver

<!-- page: 1 -->
## Section A — Limited waiver

For 30 June 2028 only, LTV above 60.0% but not above 62.0% is waived without amending the threshold.

## Section B — Distribution condition

No Distribution may be made from 1 July through 30 September 2028.
""",
                encoding="utf-8",
            )

            manager.add_document(
                "pilot",
                facility,
                "facility_agreement",
                "Custom Facility",
                "2027-01-01",
            )
            manager.add_document(
                "pilot",
                amendment,
                "amendment_letter",
                "Custom Amendment",
                "2028-01-01",
            )
            manager.add_document(
                "pilot",
                waiver,
                "waiver_letter",
                "Custom Waiver",
                "2028-07-01",
            )

            mapping = {
                "document_updates": {
                    "doc_custom_amendment": {
                        "current_status": "effective",
                        "modifies_document_id": "doc_custom_facility",
                        "modifications": [
                            {
                                "topic": "ltv_threshold",
                                "original_locator": "Clause A",
                                "source_locator": "Section A",
                                "value": 60.0,
                                "unit": "percent",
                                "applies_from": "2028-01-01",
                                "applies_to": "2028-12-31",
                            }
                        ],
                    },
                    "doc_custom_waiver": {
                        "current_status": "effective",
                        "related_document_ids": [
                            "doc_custom_facility",
                            "doc_custom_amendment",
                        ],
                        "waivers": [
                            {
                                "topic": "ltv_threshold",
                                "source_locator": "Section A",
                                "test_date": "2028-06-30",
                                "relief_above": 60.0,
                                "relief_up_to": 62.0,
                                "unit": "percent",
                                "does_not_amend": True,
                            }
                        ],
                        "conditions": [
                            {
                                "topic": "distribution",
                                "source_locator": "Section B",
                                "prohibition": True,
                                "applies_from": "2028-07-01",
                                "applies_to": "2028-09-30",
                            }
                        ],
                    },
                },
                "base_terms": [
                    {
                        "topic": "ltv_threshold",
                        "document_id": "doc_custom_facility",
                        "source_locator": "Clause A",
                        "value": 55.0,
                        "unit": "percent",
                        "applies_from": "2027-01-01",
                    }
                ],
                "provisions": {
                    "ltv": {
                        "base": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause A",
                            "quote": "The LTV shall not exceed 55.0%.",
                        },
                        "amendment": {
                            "document_id": "doc_custom_amendment",
                            "locator": "Section A",
                            "quote": "For Test Dates in 2028, the LTV threshold is 60.0%.",
                        },
                        "waiver": {
                            "document_id": "doc_custom_waiver",
                            "locator": "Section A",
                            "quote": (
                                "For 30 June 2028 only, LTV above 60.0% but not above "
                                "62.0% is waived without amending the threshold."
                            ),
                        },
                    },
                    "distribution": {
                        "restriction": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause B",
                            "quote": (
                                "No Distribution may be made except a Custom "
                                "Permitted Distribution."
                            ),
                        },
                        "definition": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause C",
                            "quote": (
                                "A Custom Permitted Distribution requires the "
                                "reviewed conditions."
                            ),
                        },
                        "temporary_prohibition": {
                            "document_id": "doc_custom_waiver",
                            "locator": "Section B",
                            "quote": (
                                "No Distribution may be made from 1 July through "
                                "30 September 2028."
                            ),
                        },
                    },
                    "disposal_distribution": {
                        "disposal_restriction": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause D",
                            "quote": (
                                "No Disposal may be made without satisfying the "
                                "Custom Disposal rule."
                            ),
                        },
                        "disposal_definition": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause E",
                            "quote": (
                                "A Custom Disposal must satisfy the reviewed "
                                "sale conditions."
                            ),
                        },
                        "mandatory_prepayment": {
                            "document_id": "doc_custom_facility",
                            "locator": "Clause F",
                            "quote": (
                                "Custom Disposal Proceeds must be applied in "
                                "mandatory prepayment."
                            ),
                        },
                    },
                },
            }
            mapping_path = root / "mapping.json"
            mapping_path.write_text(
                json.dumps(mapping, indent=2), encoding="utf-8"
            )
            self.assertEqual(manager.apply_mapping("pilot", mapping_path), [])

            engine = AgreementIntelligenceEngine(root, workspace_id="pilot")
            ltv_answer = engine.answer(
                "What is the current maximum LTV including waivers?",
                as_of="2028-07-02",
            )
            self.assertIn("55.0%", ltv_answer.short_answer)
            self.assertIn("60.0%", ltv_answer.short_answer)
            self.assertIn("62.0%", ltv_answer.short_answer)
            self.assertIn("Custom Amendment", ltv_answer.short_answer)
            self.assertNotIn("65.0%", ltv_answer.short_answer)
            self.assertNotIn("70.0%", ltv_answer.short_answer)
            self.assertNotIn("72.0%", ltv_answer.short_answer)

            distribution_answer = engine.answer(
                "Are distributions restricted?",
                as_of="2028-07-02",
            )
            self.assertIn("Clause C", distribution_answer.short_answer)
            self.assertIn("30 September 2028", distribution_answer.short_answer)
            self.assertNotIn("Clause 1.1", distribution_answer.short_answer)

    def test_browser_workspace_create_and_import(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(root))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base_url = f"http://127.0.0.1:{server.server_port}"

            try:
                create_body = urlencode(
                    {
                        "workspace_id": "pilot",
                        "workspace_name": "Pilot Workspace",
                        "default_as_of_date": "2026-07-02",
                    }
                ).encode("utf-8")
                create_request = Request(
                    f"{base_url}/workspace/create",
                    data=create_body,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Content-Length": str(len(create_body)),
                    },
                    method="POST",
                )
                with urlopen(create_request, timeout=5) as response:
                    created_page = response.read().decode("utf-8")
                self.assertIn("Created local workspace", created_page)

                boundary = "----AgreementIntelligenceTestBoundary"
                fields = {
                    "workspace_id": "pilot",
                    "title": "Pilot Facility Agreement",
                    "document_type": "facility_agreement",
                    "effective_date": "2026-01-01",
                }
                chunks: list[bytes] = []
                for name, value in fields.items():
                    chunks.extend(
                        [
                            f"--{boundary}\r\n".encode(),
                            (
                                f'Content-Disposition: form-data; name="{name}"'
                                "\r\n\r\n"
                            ).encode(),
                            value.encode(),
                            b"\r\n",
                        ]
                    )
                chunks.extend(
                    [
                        f"--{boundary}\r\n".encode(),
                        (
                            'Content-Disposition: form-data; name="file"; '
                            'filename="facility.md"\r\n'
                            "Content-Type: text/markdown\r\n\r\n"
                        ).encode(),
                        b"Distributions are restricted.",
                        b"\r\n",
                        f"--{boundary}--\r\n".encode(),
                    ]
                )
                upload_body = b"".join(chunks)
                upload_request = Request(
                    f"{base_url}/workspace/add",
                    data=upload_body,
                    headers={
                        "Content-Type": f"multipart/form-data; boundary={boundary}",
                        "Content-Length": str(len(upload_body)),
                    },
                    method="POST",
                )
                with urlopen(upload_request, timeout=5) as response:
                    imported_page = response.read().decode("utf-8")
                self.assertIn("Imported locally", imported_page)

                manifest = WorkspaceManager(root).load_manifest("pilot")
                self.assertEqual(len(manifest["documents"]), 1)
                self.assertEqual(
                    manifest["documents"][0]["document_type"],
                    "facility_agreement",
                )
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
