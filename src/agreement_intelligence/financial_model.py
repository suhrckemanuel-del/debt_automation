from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_EVEN, localcontext
from typing import Any

DECIMAL_PATTERN = re.compile(r"^-?(?:0|[1-9]\d*)(?:\.\d+)?$")
DISPLAY_QUANTUM = Decimal("0.01")


def decimal_from_string(value: str, field: str) -> Decimal:
    if not isinstance(value, str) or not DECIMAL_PATTERN.fullmatch(value):
        raise ValueError(f"{field} must be a finite decimal string.")
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"{field} must be a finite decimal string.") from exc


def decimal_string(value: Decimal) -> str:
    rendered = format(value, "f")
    if "." in rendered:
        rendered = rendered.rstrip("0").rstrip(".")
    return rendered or "0"


def display_percent(value: Decimal) -> str:
    rounded = value.quantize(DISPLAY_QUANTUM, rounding=ROUND_HALF_EVEN)
    return f"{format(rounded, '.2f')}%"


@dataclass(frozen=True)
class LtvArithmetic:
    debt_amount: str
    valuation_amount: str
    threshold_percent: str
    ltv_percent: str
    ltv_display: str
    headroom_percentage_points: str
    headroom_display: str
    maximum_debt_at_threshold: str
    debt_capacity_headroom: str
    minimum_valuation_at_threshold: str
    arithmetic_status: str

    def to_dict(self) -> dict[str, str]:
        return {
            "debt_amount": self.debt_amount,
            "valuation_amount": self.valuation_amount,
            "threshold_percent": self.threshold_percent,
            "ltv_percent": self.ltv_percent,
            "ltv_display": self.ltv_display,
            "headroom_percentage_points": self.headroom_percentage_points,
            "headroom_display": self.headroom_display,
            "maximum_debt_at_threshold": self.maximum_debt_at_threshold,
            "debt_capacity_headroom": self.debt_capacity_headroom,
            "minimum_valuation_at_threshold": (
                self.minimum_valuation_at_threshold
            ),
            "arithmetic_status": self.arithmetic_status,
        }


def calculate_ltv_arithmetic(
    debt_amount: str,
    valuation_amount: str,
    threshold_percent: str,
) -> LtvArithmetic:
    debt = decimal_from_string(debt_amount, "debt_amount")
    valuation = decimal_from_string(valuation_amount, "valuation_amount")
    threshold = decimal_from_string(threshold_percent, "threshold_percent")

    if debt < 0:
        raise ValueError("debt_amount must be zero or greater.")
    if valuation <= 0:
        raise ValueError("valuation_amount must be greater than zero.")
    if threshold <= 0 or threshold >= 100:
        raise ValueError(
            "threshold_percent must be greater than zero and less than 100."
        )

    with localcontext() as context:
        context.prec = 50
        ltv_percent = debt / valuation * Decimal("100")
        headroom = threshold - ltv_percent
        threshold_fraction = threshold / Decimal("100")
        maximum_debt = valuation * threshold_fraction
        debt_capacity = maximum_debt - debt
        minimum_valuation = debt / threshold_fraction

    if ltv_percent < threshold:
        status = "below_selected_threshold"
    elif ltv_percent == threshold:
        status = "at_selected_threshold"
    else:
        status = "above_selected_threshold"

    return LtvArithmetic(
        debt_amount=decimal_string(debt),
        valuation_amount=decimal_string(valuation),
        threshold_percent=decimal_string(threshold),
        ltv_percent=decimal_string(ltv_percent),
        ltv_display=display_percent(ltv_percent),
        headroom_percentage_points=decimal_string(headroom),
        headroom_display=f"{decimal_string(headroom)} pp",
        maximum_debt_at_threshold=decimal_string(maximum_debt),
        debt_capacity_headroom=decimal_string(debt_capacity),
        minimum_valuation_at_threshold=decimal_string(minimum_valuation),
        arithmetic_status=status,
    )


def apply_scenario(
    debt_amount: str,
    valuation_amount: str,
    scenario: dict[str, Any] | None,
) -> tuple[str, str, list[str]]:
    debt = decimal_from_string(debt_amount, "debt_amount")
    valuation = decimal_from_string(valuation_amount, "valuation_amount")
    assumptions: list[str] = []
    if scenario is None:
        return decimal_string(debt), decimal_string(valuation), assumptions

    allowed = {
        "scenario_id",
        "label",
        "rationale",
        "debt_change",
        "valuation_change_percent",
    }
    unknown = set(scenario) - allowed
    if unknown:
        raise ValueError(
            f"Unsupported scenario field: {sorted(unknown)[0]}"
        )
    scenario_id = scenario.get("scenario_id")
    label = scenario.get("label")
    rationale = scenario.get("rationale")
    if not all(
        isinstance(item, str) and item.strip()
        for item in (scenario_id, label, rationale)
    ):
        raise ValueError("Scenario identity, label, and rationale are required.")

    if "debt_change" in scenario:
        change = decimal_from_string(
            scenario["debt_change"], "scenario.debt_change"
        )
        debt += change
        assumptions.append(f"Debt change: {decimal_string(change)}")
    if "valuation_change_percent" in scenario:
        change = decimal_from_string(
            scenario["valuation_change_percent"],
            "scenario.valuation_change_percent",
        )
        with localcontext() as context:
            context.prec = 50
            valuation *= Decimal("1") + change / Decimal("100")
        assumptions.append(
            f"Valuation change: {decimal_string(change)}%"
        )
    assumptions.append(f"Scenario rationale: {rationale.strip()}")
    return decimal_string(debt), decimal_string(valuation), assumptions
