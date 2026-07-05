from __future__ import annotations

import argparse
import html
import json
import tempfile
import threading
import webbrowser
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

from .engine import AgreementIntelligenceEngine
from .mapping import MappingService
from .mapping_ui import render_mapping_wizard
from .models import Answer
from .workspace import WorkspaceSummary, WorkspaceManager


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _render_answer(answer: Answer) -> str:
    status_labels = {
        "supported": "Supported",
        "partially_supported": "Candidate evidence",
        "source_not_found": "Source not found",
        "legal_review_required": "Legal review required",
    }
    status = status_labels.get(answer.support_status, answer.support_status)

    sources = ""
    if answer.sources:
        source_cards = []
        for source in answer.sources:
            quote = _escape(source.supporting_passage).replace("\n", "<br>")
            source_cards.append(
                f"""
                <article class="source-card">
                  <div class="source-meta">
                    <strong>{_escape(source.document_title)}</strong>
                    <span>{_escape(source.locator)} · page {source.page}</span>
                  </div>
                  <blockquote>{quote}</blockquote>
                </article>
                """
            )
        sources = (
            '<section><h2>Sources</h2><div class="source-list">'
            + "".join(source_cards)
            + "</div></section>"
        )

    missing = ""
    if answer.missing_information:
        items = "".join(
            f"<li>{_escape(item)}</li>" for item in answer.missing_information
        )
        missing = f"<section><h2>Missing information</h2><ul>{items}</ul></section>"

    currentness = ""
    if answer.notes_on_currentness:
        currentness = (
            "<section><h2>Currentness</h2>"
            f"<p>{_escape(answer.notes_on_currentness)}</p></section>"
        )

    review = ""
    if answer.review_note:
        review = (
            '<section class="review-note"><h2>Human review</h2>'
            f"<p>{_escape(answer.review_note)}</p></section>"
        )

    return f"""
    <div class="answer-shell">
      <div class="answer-heading">
        <span class="status status-{_escape(answer.support_status)}">{_escape(status)}</span>
        <span class="as-of">As of {_escape(answer.as_of_date)}</span>
      </div>
      <p class="short-answer">{_escape(answer.short_answer)}</p>
      {currentness}
      {sources}
      {missing}
      {review}
    </div>
    """


def render_page(
    question: str = "",
    as_of: str = "2026-07-02",
    test_date: str = "",
    answer: Answer | None = None,
    error: str = "",
    workspaces: list[WorkspaceSummary] | None = None,
    selected_workspace: str = "demo",
    notice: str = "",
) -> str:
    answer_html = _render_answer(answer) if answer else ""
    error_html = f'<div class="error">{_escape(error)}</div>' if error else ""
    examples = [
        "What is the current maximum LTV, considering amendments or waivers?",
        "Are distributions restricted, and where are Permitted Distributions defined?",
        "Can the borrower sell part of the asset and distribute the proceeds?",
        "Does the facility require a debt yield covenant?",
    ]
    example_buttons = "".join(
        (
            '<button type="button" class="example" '
            f'data-question="{_escape(example)}">{_escape(example)}</button>'
        )
        for example in examples
    )
    workspace_options = ""
    selected_summary = None
    for workspace in workspaces or []:
        selected = " selected" if workspace.workspace_id == selected_workspace else ""
        workspace_options += (
            f'<option value="{_escape(workspace.workspace_id)}"{selected}>'
            f"{_escape(workspace.workspace_name)}"
            "</option>"
        )
        if workspace.workspace_id == selected_workspace:
            selected_summary = workspace

    if not workspace_options:
        workspace_options = '<option value="demo" selected>Synthetic Facility A</option>'

    workspace_mode = ""
    if selected_summary:
        invalid_mode = (
            "Invalid draft · previous full answers remain active"
            if selected_summary.mapped
            else "Invalid mapping · activation blocked"
        )
        mode = {
            "ready": "Ready · full answers enabled",
            "draft": "Draft mapping · evidence search only",
            "invalid": invalid_mode,
            "unmapped": "Unmapped workspace · evidence search only",
        }.get(selected_summary.mapping_status, selected_summary.mapping_status)
        workspace_mode = (
            f'<div class="workspace-mode">{_escape(mode)} · '
            f"{selected_summary.reviewed_count}/{selected_summary.total_count} "
            f"provisions reviewed · {selected_summary.document_count} document(s)</div>"
        )
    if notice:
        notice_class = "error" if notice.startswith("Could not") else "notice"
        notice_html = (
            f'<div class="{notice_class}">{_escape(notice)}</div>'
        )
    else:
        notice_html = ""
    import_disabled = " disabled" if selected_workspace == "demo" else ""
    import_hint = (
        "Create or select a pilot workspace before importing documents."
        if selected_workspace == "demo"
        else "Files stay on this computer. Imported workspaces begin in evidence-search mode."
    )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Current Document Answer Assistant</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #17211b;
      --muted: #617069;
      --paper: #f6f5ef;
      --card: #fffef9;
      --line: #d9ddd6;
      --green: #166534;
      --green-soft: #dcfce7;
      --amber: #92400e;
      --amber-soft: #fef3c7;
      --red: #991b1b;
      --red-soft: #fee2e2;
      --accent: #214e3b;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font: 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    }}
    main {{ width: min(980px, calc(100% - 32px)); margin: 48px auto 80px; }}
    header {{ margin-bottom: 28px; }}
    .eyebrow {{
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }}
    h1 {{ margin: 6px 0 8px; font-size: clamp(32px, 5vw, 54px); line-height: 1.05; }}
    h2 {{ margin: 0 0 10px; font-size: 18px; }}
    .lede {{ max-width: 720px; margin: 0; color: var(--muted); font-size: 18px; }}
    .panel, .answer-shell {{
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--card);
      box-shadow: 0 14px 40px rgba(38, 54, 44, .07);
    }}
    .panel {{ padding: 24px; }}
    label {{ display: block; margin-bottom: 7px; font-weight: 750; }}
    textarea, input {{
      width: 100%;
      border: 1px solid #bdc6bf;
      border-radius: 10px;
      background: white;
      color: var(--ink);
      font: inherit;
      padding: 12px 14px;
    }}
    textarea {{ min-height: 108px; resize: vertical; }}
    textarea:focus, input:focus {{
      outline: 3px solid rgba(33, 78, 59, .16);
      border-color: var(--accent);
    }}
    .dates {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }}
    .actions {{ display: flex; justify-content: flex-end; margin-top: 18px; }}
    .submit {{
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: white;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      padding: 12px 20px;
    }}
    .examples {{ margin: 20px 0 0; }}
    .examples p {{ color: var(--muted); font-size: 13px; font-weight: 700; margin: 0 0 8px; }}
    .example {{
      display: inline-block;
      margin: 0 6px 8px 0;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fafbf8;
      color: var(--ink);
      cursor: pointer;
      padding: 7px 11px;
      text-align: left;
    }}
    .answer-shell {{ margin-top: 24px; padding: 28px; }}
    .answer-heading {{ display: flex; justify-content: space-between; gap: 16px; align-items: center; }}
    .status {{ border-radius: 999px; font-size: 13px; font-weight: 850; padding: 6px 10px; }}
    .status-supported {{ color: var(--green); background: var(--green-soft); }}
    .status-source_not_found {{ color: var(--red); background: var(--red-soft); }}
    .status-legal_review_required {{ color: var(--amber); background: var(--amber-soft); }}
    .status-partially_supported {{ color: #1d4ed8; background: #dbeafe; }}
    .as-of {{ color: var(--muted); font-size: 13px; }}
    .short-answer {{ margin: 20px 0 28px; font-size: 20px; line-height: 1.5; }}
    section {{ margin-top: 26px; }}
    .source-list {{ display: grid; gap: 12px; }}
    .source-card {{ border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
    .source-meta {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      background: #f0f3ee;
      font-size: 13px;
    }}
    .source-meta span {{ color: var(--muted); white-space: nowrap; }}
    blockquote {{ margin: 0; padding: 16px 18px; color: #34443b; }}
    ul {{ margin: 0; padding-left: 22px; }}
    .review-note {{ border-left: 4px solid #d69e2e; padding-left: 16px; }}
    .error {{ margin-top: 18px; color: var(--red); background: var(--red-soft); border-radius: 10px; padding: 12px; }}
    .notice {{ margin: 0 0 18px; color: var(--green); background: var(--green-soft); border-radius: 10px; padding: 12px; }}
    .workspace-mode {{ color: var(--muted); font-size: 13px; margin-top: 7px; }}
    select {{
      width: 100%;
      border: 1px solid #bdc6bf;
      border-radius: 10px;
      background: white;
      color: var(--ink);
      font: inherit;
      padding: 12px 14px;
    }}
    details {{ margin-top: 18px; border-top: 1px solid var(--line); padding-top: 16px; }}
    summary {{ cursor: pointer; font-weight: 800; }}
    .workspace-tools {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; }}
    .tool-card {{ border: 1px solid var(--line); border-radius: 12px; padding: 15px; }}
    .tool-card h3 {{ margin: 0 0 12px; font-size: 16px; }}
    .tool-card label {{ font-size: 13px; margin-top: 9px; }}
    .tool-card button {{ margin-top: 13px; }}
    .tool-card .submit-link {{
      display: inline-block;
      margin-top: 13px;
      border-radius: 10px;
      background: var(--accent);
      color: white;
      font-weight: 800;
      padding: 12px 20px;
      text-decoration: none;
    }}
    .hint {{ color: var(--muted); font-size: 12px; margin: 8px 0 0; }}
    footer {{ margin-top: 20px; color: var(--muted); font-size: 12px; }}
    @media (max-width: 650px) {{
      main {{ margin-top: 28px; }}
      .dates, .workspace-tools {{ grid-template-columns: 1fr; }}
      .answer-heading, .source-meta {{ align-items: flex-start; flex-direction: column; }}
      .source-meta span {{ white-space: normal; }}
      .panel, .answer-shell {{ padding: 19px; border-radius: 14px; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">Synthetic local prototype</div>
      <h1>Current Document Answer Assistant</h1>
      <p class="lede">Ask a narrow question. Get the current position, exact source passages, missing information, and a clear human-review boundary.</p>
    </header>

    {notice_html}
    <form class="panel" action="/ask" method="post">
      <label for="workspace">Document workspace</label>
      <select id="workspace" name="workspace">{workspace_options}</select>
      {workspace_mode}
      <div style="height:16px"></div>
      <label for="question">Question</label>
      <textarea id="question" name="q" required placeholder="What is the current maximum LTV?">{_escape(question)}</textarea>
      <div class="dates">
        <div>
          <label for="as-of">As-of date</label>
          <input id="as-of" name="as_of" type="date" value="{_escape(as_of)}" required>
        </div>
        <div>
          <label for="test-date">Test date <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
          <input id="test-date" name="test_date" type="date" value="{_escape(test_date)}">
        </div>
      </div>
      <div class="actions"><button class="submit" type="submit">Find supported answer</button></div>
      <div class="examples">
        <p>TRY AN EXAMPLE</p>
        {example_buttons}
      </div>
      {error_html}
    </form>

    <details class="panel" style="margin-top:18px">
      <summary>Manage local workspaces</summary>
      <div class="workspace-tools">
        <form class="tool-card" action="/workspace/create" method="post">
          <h3>Create workspace</h3>
          <label for="new-id">Workspace ID</label>
          <input id="new-id" name="workspace_id" placeholder="friend-pilot" required pattern="[a-z][a-z0-9-]{{1,39}}">
          <label for="new-name">Display name</label>
          <input id="new-name" name="workspace_name" placeholder="Friend pilot" required>
          <label for="new-date">Default as-of date</label>
          <input id="new-date" name="default_as_of_date" type="date" value="{_escape(as_of)}" required>
          <button class="submit" type="submit">Create workspace</button>
        </form>
        <form class="tool-card" action="/workspace/add" method="post" enctype="multipart/form-data">
          <h3>Import document</h3>
          <input type="hidden" name="workspace_id" value="{_escape(selected_workspace)}">
          <label for="file">PDF, Markdown, or text file</label>
          <input id="file" name="file" type="file" accept=".pdf,.md,.txt" required{import_disabled}>
          <label for="document-title">Document title</label>
          <input id="document-title" name="title" required{import_disabled}>
          <label for="document-type">Document type</label>
          <select id="document-type" name="document_type"{import_disabled}>
            <option value="facility_agreement">Facility agreement</option>
            <option value="amendment_letter">Amendment letter</option>
            <option value="waiver_letter">Waiver letter</option>
            <option value="compliance_certificate">Compliance certificate</option>
            <option value="valuation_report">Valuation report</option>
            <option value="hedge_document">Hedge document</option>
            <option value="consent_letter">Consent letter</option>
            <option value="other">Other</option>
          </select>
          <label for="effective-date">Effective date</label>
          <input id="effective-date" name="effective_date" type="date" required{import_disabled}>
          <button class="submit" type="submit"{import_disabled}>Import locally</button>
          <p class="hint">{_escape(import_hint)}</p>
        </form>
        <section class="tool-card">
          <h3>Configure provisions</h3>
          <p class="hint">Review nine locally ranked source passages and confirm every quote, value, and date.</p>
          <a class="submit-link" href="/workspace/map?workspace={_escape(selected_workspace)}&step=1">Open guided mapper</a>
          <p class="hint">{'Create or select a pilot workspace first.' if selected_workspace == 'demo' else 'Draft progress is saved locally in this workspace.'}</p>
        </section>
        <form class="tool-card" action="/workspace/map/upload" method="post" enctype="multipart/form-data">
          <h3>Advanced JSON fallback</h3>
          <input type="hidden" name="workspace_id" value="{_escape(selected_workspace)}">
          <label for="mapping-file">Provision mapping JSON</label>
          <input id="mapping-file" name="file" type="file" accept=".json" required{import_disabled}>
          <button class="submit" type="submit"{import_disabled}>Validate and apply</button>
          <p class="hint">Full answers activate only when every configured quote exactly matches an imported source passage.</p>
        </form>
      </div>
    </details>

    {answer_html}

    <footer>Uses synthetic documents only. This prototype does not provide legal or investment advice.</footer>
  </main>
  <script>
    const question = document.getElementById("question");
    const workspace = document.getElementById("workspace");
    workspace.addEventListener("change", () => {{
      window.location.href = "/?" + new URLSearchParams({{workspace: workspace.value}}).toString();
    }});
    document.querySelectorAll(".example").forEach((button) => {{
      button.addEventListener("click", () => {{
        question.value = button.dataset.question;
        question.focus();
      }});
    }});
  </script>
</body>
</html>"""


def make_handler(repo_root: Path) -> type[BaseHTTPRequestHandler]:
    manager = WorkspaceManager(repo_root)
    engines: dict[str, tuple[int, AgreementIntelligenceEngine]] = {}

    def get_engine(workspace_id: str) -> AgreementIntelligenceEngine:
        manifest_path = manager.manifest_path(workspace_id)
        modified = manifest_path.stat().st_mtime_ns
        cached = engines.get(workspace_id)
        if cached is None or cached[0] != modified:
            engine = AgreementIntelligenceEngine(
                repo_root, workspace_id=workspace_id
            )
            engines[workspace_id] = (modified, engine)
        return engines[workspace_id][1]

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            if parsed.path == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
                return

            if parsed.path == "/api/answer":
                self._serve_api(params)
                return

            if parsed.path == "/workspace/map":
                workspace_id = params.get("workspace", [""])[0]
                if not workspace_id or workspace_id == "demo":
                    self._redirect(
                        "/",
                        {
                            "workspace": workspace_id or "demo",
                            "notice": (
                                "Could not open guided mapping: "
                                "select a pilot workspace."
                            ),
                        },
                    )
                    return
                try:
                    step = int(params.get("step", ["1"])[0])
                    service = MappingService(repo_root, workspace_id)
                    body = render_mapping_wizard(
                        service,
                        step,
                        notice=params.get("notice", [""])[0],
                    ).encode("utf-8")
                except (
                    ValueError,
                    KeyError,
                    FileNotFoundError,
                    json.JSONDecodeError,
                ) as exc:
                    self._redirect(
                        "/",
                        {
                            "workspace": workspace_id,
                            "notice": f"Could not open guided mapping: {exc}",
                        },
                    )
                    return
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if parsed.path != "/":
                self.send_error(404)
                return

            question = params.get("q", [""])[0].strip()
            workspace_id = params.get("workspace", ["demo"])[0]
            summaries = manager.list()
            summary = next(
                (
                    item
                    for item in summaries
                    if item.workspace_id == workspace_id
                ),
                None,
            )
            default_as_of = (
                summary.default_as_of_date if summary else "2026-07-02"
            )
            as_of = params.get("as_of", [default_as_of])[0]
            test_date = params.get("test_date", [""])[0]
            notice = params.get("notice", [""])[0]
            answer = None
            error = ""

            if question:
                try:
                    answer = get_engine(workspace_id).answer(
                        question,
                        as_of=as_of,
                        test_date=test_date or None,
                    )
                except (ValueError, KeyError, FileNotFoundError) as exc:
                    error = str(exc)

            body = render_page(
                question,
                as_of,
                test_date,
                answer,
                error,
                workspaces=summaries,
                selected_workspace=workspace_id,
                notice=notice,
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            try:
                if parsed.path == "/ask":
                    self._answer_form()
                    return
                if parsed.path == "/workspace/create":
                    self._create_workspace()
                    return
                if parsed.path == "/workspace/add":
                    self._add_document()
                    return
                if parsed.path == "/workspace/map/save":
                    self._save_mapping_draft()
                    return
                if parsed.path == "/workspace/map/activate":
                    self._activate_mapping()
                    return
                if parsed.path == "/workspace/map/upload":
                    self._apply_mapping()
                    return
                self.send_error(404)
            except (
                ValueError,
                FileNotFoundError,
                FileExistsError,
                PermissionError,
                RuntimeError,
            ) as exc:
                self._redirect("/", {"notice": f"Could not complete action: {exc}"})

        def _answer_form(self) -> None:
            content_length = self._content_length(max_bytes=64_000)
            body = self.rfile.read(content_length).decode("utf-8")
            fields = parse_qs(body)
            workspace_id = fields.get("workspace", ["demo"])[0]
            question = fields.get("q", [""])[0].strip()
            as_of = fields.get("as_of", ["2026-07-02"])[0]
            test_date = fields.get("test_date", [""])[0]
            if not question:
                raise ValueError("Question is required.")

            summaries = manager.list()
            answer = get_engine(workspace_id).answer(
                question,
                as_of=as_of,
                test_date=test_date or None,
            )
            body_bytes = render_page(
                question,
                as_of,
                test_date,
                answer,
                "",
                workspaces=summaries,
                selected_workspace=workspace_id,
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)

        def _create_workspace(self) -> None:
            content_length = self._content_length(max_bytes=64_000)
            body = self.rfile.read(content_length).decode("utf-8")
            fields = parse_qs(body)
            workspace_id = fields.get("workspace_id", [""])[0]
            workspace_name = fields.get("workspace_name", [""])[0]
            default_as_of_date = fields.get(
                "default_as_of_date", ["2026-07-02"]
            )[0]
            manager.initialize(
                workspace_id,
                workspace_name,
                default_as_of_date=default_as_of_date,
            )
            self._redirect(
                "/",
                {
                    "workspace": workspace_id,
                    "notice": f"Created local workspace: {workspace_name}",
                },
            )

        def _add_document(self) -> None:
            fields, file_name, file_bytes = self._read_multipart(
                max_bytes=50 * 1024 * 1024
            )
            suffix = Path(file_name).suffix.lower()
            if suffix not in {".pdf", ".md", ".txt"}:
                raise ValueError("Supported file types are .pdf, .md, and .txt.")

            temp_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=suffix
                ) as temp_file:
                    temp_file.write(file_bytes)
                    temp_path = Path(temp_file.name)
                document = manager.add_document(
                    fields.get("workspace_id", ""),
                    temp_path,
                    document_type=fields.get("document_type", ""),
                    title=fields.get("title", "").strip(),
                    effective_date=fields.get("effective_date", ""),
                )
            finally:
                if temp_path and temp_path.exists():
                    temp_path.unlink()

            engines.pop(fields["workspace_id"], None)
            self._redirect(
                "/",
                {
                    "workspace": fields["workspace_id"],
                    "notice": f"Imported locally: {document['title']}",
                },
            )

        def _apply_mapping(self) -> None:
            fields, file_name, file_bytes = self._read_multipart(
                max_bytes=2 * 1024 * 1024
            )
            if Path(file_name).suffix.lower() != ".json":
                raise ValueError("Provision mapping must be a JSON file.")

            temp_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".json"
                ) as temp_file:
                    temp_file.write(file_bytes)
                    temp_path = Path(temp_file.name)
                errors = manager.apply_mapping(
                    fields.get("workspace_id", ""), temp_path
                )
            finally:
                if temp_path and temp_path.exists():
                    temp_path.unlink()

            if errors:
                raise ValueError("Mapping rejected: " + " | ".join(errors))
            engines.pop(fields["workspace_id"], None)
            self._redirect(
                "/",
                {
                    "workspace": fields["workspace_id"],
                    "notice": "Reviewed mapping applied; full answers are enabled.",
                },
            )

        def _read_urlencoded(self, max_bytes: int = 512_000) -> dict[str, str]:
            content_length = self._content_length(max_bytes=max_bytes)
            content_type = self.headers.get("Content-Type", "")
            if "application/x-www-form-urlencoded" not in content_type:
                raise ValueError("Form submission must be URL encoded.")
            body = self.rfile.read(content_length).decode("utf-8")
            return {
                key: values[0]
                for key, values in parse_qs(
                    body, keep_blank_values=True
                ).items()
            }

        def _save_mapping_draft(self) -> None:
            fields = self._read_urlencoded()
            workspace_id = fields.get("workspace", "")
            try:
                step = int(fields.get("step", "0"))
            except ValueError:
                step = 1
            try:
                if step not in {1, 2, 3, 4}:
                    raise ValueError("Unknown mapping step.")
                service = MappingService(repo_root, workspace_id)
                if step == 1:
                    service.update_roles(fields)
                else:
                    service.update_step(step, fields)
            except (
                ValueError,
                KeyError,
                FileNotFoundError,
                json.JSONDecodeError,
            ) as exc:
                self._redirect(
                    "/workspace/map",
                    {
                        "workspace": workspace_id,
                        "step": str(max(1, min(step, 5))),
                        "notice": f"Could not save draft: {exc}",
                    },
                )
                return
            self._redirect(
                "/workspace/map",
                {
                    "workspace": workspace_id,
                    "step": str(step + 1),
                    "notice": "Draft saved locally.",
                },
            )

        def _activate_mapping(self) -> None:
            fields = self._read_urlencoded()
            workspace_id = fields.get("workspace", "")
            service = MappingService(repo_root, workspace_id)
            errors = service.activate()
            if errors:
                self._redirect(
                    "/workspace/map",
                    {
                        "workspace": workspace_id,
                        "step": "5",
                        "notice": (
                            "Activation failed. The previous valid manifest "
                            "was preserved."
                        ),
                    },
                )
                return
            engines.pop(workspace_id, None)
            self._redirect(
                "/",
                {
                    "workspace": workspace_id,
                    "notice": (
                        "Guided mapping activated; full answers are enabled."
                    ),
                },
            )

        def _read_multipart(
            self, max_bytes: int
        ) -> tuple[dict[str, str], str, bytes]:
            content_length = self._content_length(max_bytes=max_bytes)
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                raise ValueError("Upload requires multipart form data.")

            body = self.rfile.read(content_length)
            message = BytesParser(policy=email_policy).parsebytes(
                (
                    f"Content-Type: {content_type}\r\n"
                    "MIME-Version: 1.0\r\n\r\n"
                ).encode("utf-8")
                + body
            )
            fields: dict[str, str] = {}
            file_name = ""
            file_bytes: bytes | None = None
            for part in message.iter_parts():
                name = part.get_param("name", header="content-disposition")
                if not name:
                    continue
                filename = part.get_filename()
                payload = part.get_payload(decode=True) or b""
                if filename:
                    file_name = Path(filename).name
                    file_bytes = payload
                else:
                    fields[name] = payload.decode(
                        part.get_content_charset() or "utf-8"
                    )

            if not file_name or file_bytes is None:
                raise ValueError("No file was provided.")
            return fields, file_name, file_bytes

        def _content_length(self, max_bytes: int) -> int:
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError as exc:
                raise ValueError("Invalid Content-Length.") from exc
            if length <= 0:
                raise ValueError("Request body is empty.")
            if length > max_bytes:
                raise ValueError(
                    f"Request exceeds the local {max_bytes // (1024 * 1024) or 1} MB limit."
                )
            return length

        def _redirect(self, path: str, params: dict[str, str]) -> None:
            location = f"{path}?{urlencode(params)}"
            self.send_response(303)
            self.send_header("Location", location)
            self.end_headers()

        def _serve_api(self, params: dict[str, list[str]]) -> None:
            question = params.get("q", [""])[0].strip()
            workspace_id = params.get("workspace", ["demo"])[0]
            if not question:
                self.send_error(400, "Missing q parameter")
                return
            try:
                answer = get_engine(workspace_id).answer(
                    question,
                    as_of=params.get("as_of", ["2026-07-02"])[0],
                    test_date=params.get("test_date", [""])[0] or None,
                )
                body = json.dumps(
                    answer.to_dict(), ensure_ascii=False, indent=2
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (ValueError, KeyError, FileNotFoundError) as exc:
                self.send_error(400, str(exc))

        def log_message(self, format: str, *args: object) -> None:
            parsed = urlparse(self.path)
            print(f"[web] {self.command} {parsed.path}")

    return Handler


def serve(
    repo_root: Path,
    host: str = "127.0.0.1",
    port: int = 8765,
    open_browser: bool = True,
) -> None:
    server = ThreadingHTTPServer((host, port), make_handler(repo_root))
    url = f"http://{host}:{port}"
    print(f"Current Document Answer Assistant running at {url}")
    print("Press Ctrl+C to stop.")

    if open_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main(argv: list[str] | None = None, repo_root: Path | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the local browser interface")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)
    root = repo_root or Path(__file__).resolve().parents[2]
    serve(root, args.host, args.port, open_browser=not args.no_browser)
    return 0
