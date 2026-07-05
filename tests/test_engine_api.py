from __future__ import annotations

import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

from agreement_intelligence.api import make_engine_api_handler


class EngineApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.root = Path(__file__).resolve().parents[1]
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0),
            make_engine_api_handler(cls.root),
        )
        cls.thread = threading.Thread(
            target=cls.server.serve_forever,
            daemon=True,
        )
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def test_health_exposes_contract_version(self) -> None:
        with urlopen(f"{self.base_url}/health", timeout=5) as response:
            payload = json.loads(response.read())
        self.assertEqual(
            payload,
            {"status": "ok", "contract_version": "1.1.0"},
        )

    def test_position_exposes_resolved_facts_and_exact_sources(self) -> None:
        with urlopen(
            f"{self.base_url}/v1/workspaces/demo/position"
            "?as_of=2026-07-02",
            timeout=5,
        ) as response:
            payload = json.loads(response.read())

        self.assertEqual(payload["support_status"], "supported")
        self.assertEqual(payload["ltv"]["current_threshold"], 70.0)
        self.assertTrue(payload["ltv"]["amendment_active"])
        self.assertTrue(payload["ltv"]["waiver_relevant"])
        self.assertTrue(payload["ltv"]["distribution_condition_active"])
        self.assertEqual(len(payload["sources"]), 4)
        self.assertTrue(
            all(source["supporting_passage"] for source in payload["sources"])
        )

    def test_position_resolves_each_review_date_without_ui_rules(self) -> None:
        cases = {
            "2026-04-01": (65.0, False, False, False),
            "2026-07-02": (70.0, True, True, True),
            "2026-10-01": (70.0, True, False, False),
            "2027-01-02": (65.0, False, False, False),
        }
        for as_of, expected in cases.items():
            with self.subTest(as_of=as_of):
                with urlopen(
                    f"{self.base_url}/v1/workspaces/demo/position"
                    f"?as_of={as_of}",
                    timeout=5,
                ) as response:
                    payload = json.loads(response.read())
                ltv = payload["ltv"]
                self.assertEqual(
                    (
                        ltv["current_threshold"],
                        ltv["amendment_active"],
                        ltv["waiver_relevant"],
                        ltv["distribution_condition_active"],
                    ),
                    expected,
                )

    def test_answer_preserves_structured_citations_and_abstention(self) -> None:
        body = json.dumps(
            {
                "question": "Does the facility require a debt yield covenant?",
                "as_of": "2026-07-02",
            }
        ).encode()
        request = Request(
            f"{self.base_url}/v1/workspaces/demo/answers",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=5) as response:
            payload = json.loads(response.read())
        self.assertEqual(payload["support_status"], "source_not_found")
        self.assertEqual(payload["short_answer"], "Source not found.")
        self.assertEqual(payload["sources"], [])


if __name__ == "__main__":
    unittest.main()
