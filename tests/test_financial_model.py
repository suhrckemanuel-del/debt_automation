from __future__ import annotations

import unittest
from pathlib import Path

from agreement_intelligence.engine import AgreementIntelligenceEngine
from agreement_intelligence.financial_model import (
    apply_scenario,
    calculate_ltv_arithmetic,
    decimal_from_string,
)

ROOT = Path(__file__).resolve().parents[1]


class FinancialModelArithmeticTests(unittest.TestCase):
    def test_baseline_above_threshold_uses_exact_decimal_arithmetic(self) -> None:
        result = calculate_ltv_arithmetic("71000000", "100000000", "70")
        self.assertEqual(result.ltv_percent, "71")
        self.assertEqual(result.headroom_percentage_points, "-1")
        self.assertEqual(result.debt_capacity_headroom, "-1000000")
        self.assertEqual(result.arithmetic_status, "above_selected_threshold")

    def test_equality_is_not_relabelled_as_compliance(self) -> None:
        result = calculate_ltv_arithmetic("70", "100", "70")
        self.assertEqual(result.arithmetic_status, "at_selected_threshold")
        self.assertEqual(result.headroom_percentage_points, "0")

    def test_full_precision_controls_boundary_below(self) -> None:
        result = calculate_ltv_arithmetic("69.995", "100", "70")
        self.assertEqual(result.ltv_percent, "69.995")
        self.assertEqual(result.ltv_display, "70.00%")
        self.assertEqual(result.arithmetic_status, "below_selected_threshold")

    def test_full_precision_controls_boundary_above(self) -> None:
        result = calculate_ltv_arithmetic("70.004", "100", "70")
        self.assertEqual(result.ltv_percent, "70.004")
        self.assertEqual(result.ltv_display, "70.00%")
        self.assertEqual(result.arithmetic_status, "above_selected_threshold")

    def test_zero_and_negative_valuation_fail_closed(self) -> None:
        for valuation in ("0", "-1"):
            with self.subTest(valuation=valuation):
                with self.assertRaisesRegex(
                    ValueError, "valuation_amount must be greater than zero"
                ):
                    calculate_ltv_arithmetic("68", valuation, "70")

    def test_negative_debt_fails_closed(self) -> None:
        with self.assertRaisesRegex(
            ValueError, "debt_amount must be zero or greater"
        ):
            calculate_ltv_arithmetic("-1", "100", "70")

    def test_non_decimal_values_and_float_objects_are_rejected(self) -> None:
        for value in ("NaN", "Infinity", "1e2", " 70", 70.0):
            with self.subTest(value=value):
                with self.assertRaisesRegex(
                    ValueError, "must be a finite decimal string"
                ):
                    decimal_from_string(value, "test")  # type: ignore[arg-type]

    def test_valuation_scenario_does_not_mutate_base_inputs(self) -> None:
        scenario = {
            "scenario_id": "valuation-down-5",
            "label": "Valuation -5%",
            "valuation_change_percent": "-5",
            "rationale": "Synthetic sensitivity.",
        }
        debt, valuation, assumptions = apply_scenario(
            "68000000", "100000000", scenario
        )
        self.assertEqual(debt, "68000000")
        self.assertEqual(valuation, "95000000")
        self.assertIn("Valuation change: -5%", assumptions)

    def test_scenario_without_provenance_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "rationale are required"):
            apply_scenario(
                "68",
                "100",
                {
                    "scenario_id": "down",
                    "label": "Downside",
                    "valuation_change_percent": "-5",
                },
            )

    def test_ratio_is_scale_invariant(self) -> None:
        small = calculate_ltv_arithmetic("68", "100", "70")
        large = calculate_ltv_arithmetic("68000000", "100000000", "70")
        self.assertEqual(small.ltv_percent, large.ltv_percent)
        self.assertEqual(
            small.headroom_percentage_points,
            large.headroom_percentage_points,
        )


class FinancialModelIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = AgreementIntelligenceEngine(ROOT)

    def test_source_grounded_baseline_keeps_waiver_separate(self) -> None:
        result = self.engine.calculate_ltv()
        self.assertEqual(
            result["status"], "calculated_human_review_required"
        )
        self.assertEqual(
            result["outputs"]["arithmetic_status"],
            "above_selected_threshold",
        )
        self.assertEqual(result["selected_threshold"]["percent"], "70")
        self.assertTrue(
            result["waiver_observation"]["within_stated_numeric_range"]
        )
        self.assertTrue(
            result["waiver_observation"]["does_not_amend_threshold"]
        )
        self.assertTrue(result["human_review_required"])
        self.assertEqual(len(result["sources"]), 5)

    def test_every_model_source_is_an_exact_persisted_passage(self) -> None:
        result = self.engine.calculate_ltv()
        for source in result["sources"]:
            passage = self.engine.store.get(
                source["document_id"], source["locator"]
            )
            self.assertIn(source["supporting_passage"], passage.text)
            self.assertEqual(source["page"], passage.page)

    def test_configured_scenarios_are_deterministic(self) -> None:
        first = self.engine.calculate_ltv(
            scenario_id="valuation-down-5"
        )
        second = self.engine.calculate_ltv(
            scenario_id="valuation-down-5"
        )
        self.assertEqual(first, second)
        self.assertEqual(
            first["outputs"]["ltv_percent"],
            "74.736842105263157894736842105263157894736842105263",
        )

    def test_unknown_model_and_scenario_fail_explicitly(self) -> None:
        missing = self.engine.calculate_ltv(model_id="missing")
        self.assertEqual(missing["status"], "calculation_unavailable")
        self.assertTrue(missing["missing_information"])
        with self.assertRaisesRegex(ValueError, "Unknown scenario_id"):
            self.engine.calculate_ltv(scenario_id="missing")

    def test_missing_formula_mapping_abstains(self) -> None:
        self.engine.registry.provisions["ltv"].pop("definition")
        result = self.engine.calculate_ltv()
        self.assertEqual(result["status"], "calculation_unavailable")
        self.assertIn(
            "Reviewed source mapping: ltv.definition",
            result["missing_information"],
        )

    def test_currency_mismatch_and_future_inputs_abstain(self) -> None:
        model = self.engine.registry.financial_models["ltv_v1"]
        model["inputs"]["valuation_amount"]["currency"] = "USD"
        currency_result = self.engine.calculate_ltv()
        self.assertEqual(
            currency_result["status"], "calculation_unavailable"
        )
        self.assertIn("currencies do not match", currency_result[
            "missing_information"
        ][0])

        self.engine = AgreementIntelligenceEngine(ROOT)
        model = self.engine.registry.financial_models["ltv_v1"]
        model["inputs"]["valuation_amount"][
            "effective_date"
        ] = "2026-07-01"
        date_result = self.engine.calculate_ltv()
        self.assertEqual(date_result["status"], "calculation_unavailable")
        self.assertIn("after the selected Test Date", date_result[
            "missing_information"
        ][0])


if __name__ == "__main__":
    unittest.main()
