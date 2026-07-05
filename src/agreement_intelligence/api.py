from __future__ import annotations

import json
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from .engine import AgreementIntelligenceEngine

CONTRACT_VERSION = "1.2.0"
MAX_REQUEST_BYTES = 32_768
ANSWER_PATH = re.compile(
    r"^/v1/workspaces/(?P<workspace_id>[a-z][a-z0-9-]{1,39})/answers$"
)
POSITION_PATH = re.compile(
    r"^/v1/workspaces/(?P<workspace_id>[a-z][a-z0-9-]{1,39})/position$"
)
LTV_MODEL_PATH = re.compile(
    r"^/v1/workspaces/(?P<workspace_id>[a-z][a-z0-9-]{1,39})"
    r"/models/ltv-calculations$"
)


def _json_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, ensure_ascii=False).encode("utf-8")


def make_engine_api_handler(
    repo_root: Path,
) -> type[BaseHTTPRequestHandler]:
    root = repo_root.resolve()

    class EngineApiHandler(BaseHTTPRequestHandler):
        server_version = "AgreementIntelligenceEngine/1.0"

        def _send_json(
            self, status: HTTPStatus, value: dict[str, Any]
        ) -> None:
            body = _json_bytes(value)
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            parsed_url = urlparse(self.path)
            path = unquote(parsed_url.path)
            if path == "/health":
                self._send_json(
                    HTTPStatus.OK,
                    {"status": "ok", "contract_version": CONTRACT_VERSION},
                )
                return
            match = POSITION_PATH.fullmatch(path)
            if match:
                try:
                    query = parse_qs(
                        parsed_url.query,
                        keep_blank_values=True,
                    )
                    if set(query) != {"as_of"} or len(query["as_of"]) != 1:
                        raise ValueError(
                            "Exactly one as_of ISO date is required."
                        )
                    engine = AgreementIntelligenceEngine(
                        root,
                        workspace_id=match.group("workspace_id"),
                    )
                    position = engine.contract_position(query["as_of"][0])
                except ValueError as exc:
                    self._send_json(
                        HTTPStatus.BAD_REQUEST,
                        {"error": str(exc)},
                    )
                    return
                except FileNotFoundError:
                    self._send_json(
                        HTTPStatus.NOT_FOUND,
                        {"error": "Workspace not found."},
                    )
                    return
                self._send_json(HTTPStatus.OK, position)
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found."})

        def do_POST(self) -> None:  # noqa: N802
            path = unquote(urlparse(self.path).path)
            answer_match = ANSWER_PATH.fullmatch(path)
            model_match = LTV_MODEL_PATH.fullmatch(path)
            match = answer_match or model_match
            if not match:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found."})
                return

            content_type = self.headers.get("Content-Type", "").split(";", 1)[0]
            if content_type != "application/json":
                self._send_json(
                    HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
                    {"error": "Content-Type must be application/json."},
                )
                return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                content_length = -1
            if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "Request body size is invalid."},
                )
                return

            try:
                payload: Any = json.loads(
                    self.rfile.read(content_length).decode("utf-8")
                )
                engine = AgreementIntelligenceEngine(
                    root,
                    workspace_id=match.group("workspace_id"),
                )
                if model_match:
                    model_id, scenario_id = self._validate_model_payload(
                        payload
                    )
                    result = engine.calculate_ltv(
                        model_id=model_id,
                        scenario_id=scenario_id,
                    )
                else:
                    question, as_of, test_date = self._validate_payload(
                        payload
                    )
                    result = engine.answer(
                        question,
                        as_of=as_of,
                        test_date=test_date,
                    ).to_dict()
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            except FileNotFoundError:
                self._send_json(
                    HTTPStatus.NOT_FOUND,
                    {"error": "Workspace not found."},
                )
                return

            self._send_json(HTTPStatus.OK, result)

        @staticmethod
        def _validate_model_payload(
            payload: Any,
        ) -> tuple[str, str | None]:
            if not isinstance(payload, dict):
                raise ValueError("Request body must be a JSON object.")
            allowed = {"model_id", "scenario_id"}
            unknown = set(payload) - allowed
            if unknown:
                raise ValueError(
                    f"Unsupported request field: {sorted(unknown)[0]}"
                )
            model_id = payload.get("model_id")
            scenario_id = payload.get("scenario_id")
            if model_id != "ltv-v1":
                raise ValueError("model_id must be ltv-v1.")
            if scenario_id is not None and (
                not isinstance(scenario_id, str)
                or not scenario_id.strip()
                or len(scenario_id) > 80
            ):
                raise ValueError(
                    "scenario_id must be a non-empty string or null."
                )
            return model_id, scenario_id

        @staticmethod
        def _validate_payload(
            payload: Any,
        ) -> tuple[str, str, str | None]:
            if not isinstance(payload, dict):
                raise ValueError("Request body must be a JSON object.")
            allowed = {"question", "as_of", "test_date"}
            unknown = set(payload) - allowed
            if unknown:
                raise ValueError(
                    f"Unsupported request field: {sorted(unknown)[0]}"
                )
            question = payload.get("question")
            as_of = payload.get("as_of")
            test_date = payload.get("test_date")
            if not isinstance(question, str) or not question.strip():
                raise ValueError("question must be a non-empty string.")
            if len(question) > 4000:
                raise ValueError("question must not exceed 4000 characters.")
            if not isinstance(as_of, str):
                raise ValueError("as_of must be an ISO date string.")
            if test_date is not None and not isinstance(test_date, str):
                raise ValueError("test_date must be an ISO date string or null.")
            return question.strip(), as_of, test_date

        def log_message(self, format: str, *args: object) -> None:
            print(f"[engine-api] {self.address_string()} {format % args}")

    return EngineApiHandler


def serve_engine_api(
    repo_root: Path,
    port: int = 8765,
) -> None:
    server = ThreadingHTTPServer(
        ("127.0.0.1", port),
        make_engine_api_handler(repo_root),
    )
    print(
        "Agreement Intelligence engine API listening on "
        f"http://127.0.0.1:{server.server_port}"
    )
    print("Local deterministic adapter; synthetic data only.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
