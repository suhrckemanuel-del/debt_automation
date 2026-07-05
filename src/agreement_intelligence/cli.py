from __future__ import annotations

import argparse
import json
from pathlib import Path

from .api import serve_engine_api
from .engine import AgreementIntelligenceEngine
from .evaluator import evaluate_benchmark
from .parser import parse_corpus
from .registry import DocumentRegistry
from .workspace import DOCUMENT_TYPES, WorkspaceManager


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Local source-backed agreement-intelligence prototype"
    )
    parser.add_argument(
        "--workspace",
        default="demo",
        help="Workspace ID (default: demo)",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ask = subparsers.add_parser("ask", help="Answer one agreement question")
    ask.add_argument("question")
    ask.add_argument("--as-of", default="2026-07-02")
    ask.add_argument("--test-date")
    ask.add_argument("--format", choices=("markdown", "json"), default="markdown")

    search = subparsers.add_parser("search", help="Inspect ranked source passages")
    search.add_argument("question")
    search.add_argument("--limit", type=int, default=8)

    benchmark = subparsers.add_parser("benchmark", help="Run the synthetic benchmark")
    benchmark.add_argument(
        "--path", default="data/benchmark_questions.json"
    )
    benchmark.add_argument("--format", choices=("text", "json"), default="text")

    api = subparsers.add_parser(
        "api", help="Run the narrow local deterministic engine API"
    )
    api.add_argument("--port", type=int, default=8765)

    workspace = subparsers.add_parser(
        "workspace", help="Create and inspect local document workspaces"
    )
    workspace_actions = workspace.add_subparsers(
        dest="workspace_action", required=True
    )
    workspace_actions.add_parser("list", help="List local workspaces")

    initialize = workspace_actions.add_parser(
        "init", help="Create an empty local workspace"
    )
    initialize.add_argument("workspace_id")
    initialize.add_argument("--name", required=True)
    initialize.add_argument("--facility-id")
    initialize.add_argument("--as-of")

    add = workspace_actions.add_parser("add", help="Import one local document")
    add.add_argument("workspace_id")
    add.add_argument("file")
    add.add_argument("--type", required=True, choices=sorted(DOCUMENT_TYPES))
    add.add_argument("--title", required=True)
    add.add_argument("--effective-date", required=True)
    add.add_argument("--execution-date")

    status = workspace_actions.add_parser(
        "status", help="Show workspace readiness"
    )
    status.add_argument("workspace_id")

    apply_map = workspace_actions.add_parser(
        "map", help="Apply and validate a reviewed provision mapping"
    )
    apply_map.add_argument("workspace_id")
    apply_map.add_argument("mapping_file")

    validate_map = workspace_actions.add_parser(
        "validate", help="Validate a workspace provision mapping"
    )
    validate_map.add_argument("workspace_id")

    template = workspace_actions.add_parser(
        "template", help="Write a reviewed-mapping template"
    )
    template.add_argument("workspace_id")
    template.add_argument("output_file")

    return parser


def main(argv: list[str] | None = None, repo_root: Path | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = repo_root or Path(__file__).resolve().parents[2]
    manager = WorkspaceManager(root)

    if args.command == "api":
        if not 1 <= args.port <= 65535:
            raise SystemExit("--port must be between 1 and 65535")
        serve_engine_api(root, port=args.port)
        return 0

    if args.command == "workspace":
        if args.workspace_action == "list":
            summaries = manager.list()
            if not summaries:
                print("No workspaces found.")
                return 0
            for summary in summaries:
                mode = "mapped answers" if summary.mapped else "evidence search"
                print(
                    f"{summary.workspace_id:20} "
                    f"{summary.document_count:2} docs  {mode:16}  "
                    f"{summary.workspace_name}"
                )
            return 0

        if args.workspace_action == "init":
            path = manager.initialize(
                args.workspace_id,
                args.name,
                facility_id=args.facility_id,
                default_as_of_date=args.as_of,
            )
            print(f"Created workspace: {path}")
            return 0

        if args.workspace_action == "add":
            document = manager.add_document(
                args.workspace_id,
                args.file,
                document_type=args.type,
                title=args.title,
                effective_date=args.effective_date,
                execution_date=args.execution_date,
            )
            print(
                f"Imported {document['title']} as {document['document_id']} "
                f"({document['source_path']})"
            )
            return 0

        if args.workspace_action == "map":
            errors = manager.apply_mapping(
                args.workspace_id, args.mapping_file
            )
            if errors:
                print("Mapping rejected:")
                for error in errors:
                    print(f"  - {error}")
                return 1
            print("Mapping applied and validated.")
            return 0

        if args.workspace_action == "validate":
            errors = manager.validate_mapping(args.workspace_id)
            if errors:
                print("Mapping is not ready:")
                for error in errors:
                    print(f"  - {error}")
                return 1
            print("Mapping is complete and source-valid.")
            return 0

        if args.workspace_action == "template":
            path = manager.write_mapping_template(
                args.workspace_id, args.output_file
            )
            print(f"Wrote mapping template: {path}")
            return 0

        registry = DocumentRegistry(root, workspace_id=args.workspace_id)
        passages = parse_corpus(registry)
        mapped = not manager.validate_mapping(args.workspace_id)
        print(f"Workspace: {registry.workspace_name} ({registry.workspace_id})")
        print(f"Documents: {len(registry.documents)}")
        print(f"Passages: {len(passages)}")
        print(f"Mode: {'mapped answers' if mapped else 'evidence search only'}")
        return 0

    engine = AgreementIntelligenceEngine(root, workspace_id=args.workspace)

    if args.command == "ask":
        answer = engine.answer(
            args.question, as_of=args.as_of, test_date=args.test_date
        )
        if args.format == "json":
            print(json.dumps(answer.to_dict(), indent=2, ensure_ascii=False))
        else:
            print(answer.to_markdown(), end="")
        return 0

    if args.command == "search":
        results = engine.search(args.question, limit=args.limit)
        for passage, score in results:
            print(
                f"{score:5.1f}  {passage.document_title} | "
                f"{passage.locator} | page {passage.page}"
            )
        return 0

    report = evaluate_benchmark(engine, root / args.path)
    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(
            f"Benchmark: {report['passed']}/{report['total']} passed "
            f"({report['pass_rate']:.0%})"
        )
        for result in report["results"]:
            status = "PASS" if result["passed"] else "FAIL"
            print(f"{status} {result['case_id']}")
            for failure in result["failures"]:
                print(f"  - {failure}")
    return 0 if report["failed"] == 0 else 1
