import {
  requestEngineContractPosition,
  type EngineCitation,
  type EngineContractPosition,
} from "@/lib/engine-contract";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";
import type { PassageEvidence } from "@/lib/persistence/types";

export const decisionDates = [
  { value: "2026-04-01", label: "Before amendment" },
  { value: "2026-07-02", label: "Current review" },
  { value: "2026-10-01", label: "After waiver block" },
  { value: "2027-01-02", label: "After amendment" },
] as const;

export type DecisionDate = (typeof decisionDates)[number]["value"];

export interface DecisionChange {
  title: string;
  summary: string;
  evidence: PassageEvidence;
}

export interface DecisionSurface {
  asOf: DecisionDate;
  tone: "stable" | "attention";
  status: string;
  statusDetail: string;
  whyItMatters: string;
  recommendation: {
    title: string;
    detail: string;
    href: string;
    label: string;
  };
  changes: DecisionChange[];
  timeline: Array<{
    date: string;
    label: string;
    detail: string;
    state: "original" | "amendment" | "waiver" | "condition";
  }>;
  evidence: PassageEvidence[];
}

export type DecisionSurfaceResult =
  | { kind: "ready"; surface: DecisionSurface }
  | {
      kind: "missing_support" | "unavailable";
      title: string;
      detail: string;
      missingInformation: string[];
    };

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function evidenceKey(documentId: string, locator: string): string {
  return `${documentId}::${locator}`;
}

function validateEvidence(
  sources: EngineCitation[],
): Map<string, PassageEvidence> {
  const persistence = getPersistence();
  const evidence = new Map<string, PassageEvidence>();
  for (const source of sources) {
    const persisted = persistence.getPassageEvidence(
      localSyntheticActor,
      localSyntheticWorkspaceId,
      source.document_id,
      source.locator,
    );
    if (
      persisted.page !== source.page ||
      persisted.documentTitle !== source.document_title ||
      !persisted.text.includes(source.supporting_passage)
    ) {
      throw new Error(
        `Engine evidence does not match persisted source: ${source.document_id} ${source.locator}.`,
      );
    }
    evidence.set(
      evidenceKey(source.document_id, source.locator),
      persisted,
    );
  }
  return evidence;
}

function getEvidence(
  evidence: Map<string, PassageEvidence>,
  documentId: string,
  locator: string,
): PassageEvidence {
  const item = evidence.get(evidenceKey(documentId, locator));
  if (!item) {
    throw new Error(
      `Engine position omitted required evidence: ${documentId} ${locator}.`,
    );
  }
  return item;
}

function buildDecisionSurface(
  asOf: DecisionDate,
  position: EngineContractPosition,
): DecisionSurface {
  if (position.support_status !== "supported" || !position.ltv) {
    throw new Error("Supported contractual facts were not returned.");
  }

  const evidence = validateEvidence(position.sources);
  const ltv = position.ltv;
  const activeAmendment = position.ltv_modifications.find(
    (item) => item.active,
  );
  const relevantWaiver = position.ltv_waivers.find(
    (item) => item.relevant,
  );
  const activeCondition = position.distribution_conditions.find(
    (item) => item.active,
  );
  const expiredAmendment = [...position.ltv_modifications]
    .filter((item) => item.applies_to < asOf)
    .sort((a, b) => b.applies_to.localeCompare(a.applies_to))[0];
  const endedCondition = [...position.distribution_conditions]
    .filter((item) => item.applies_to < asOf)
    .sort((a, b) => b.applies_to.localeCompare(a.applies_to))[0];

  if (
    ltv.amendment_active !== Boolean(activeAmendment) ||
    ltv.waiver_relevant !== Boolean(relevantWaiver) ||
    ltv.distribution_condition_active !== Boolean(activeCondition)
  ) {
    throw new Error("Engine position flags and dated facts are inconsistent.");
  }

  const baseEvidence = getEvidence(
    evidence,
    ltv.base_document_id,
    ltv.base_locator,
  );

  const timeline: DecisionSurface["timeline"] = [
    {
      date: formatDate(ltv.base_applies_from),
      label: "Original agreement",
      detail: `${percent(ltv.base_threshold)} LTV threshold`,
      state: "original",
    },
    ...position.ltv_modifications.map((item) => ({
      date: formatDate(item.applies_from),
      label: "Amendment effective",
      detail: `${percent(item.value)} through ${formatDate(item.applies_to)}`,
      state: "amendment" as const,
    })),
    ...position.ltv_waivers.map((item) => ({
      date: formatDate(item.test_date),
      label: "Limited waiver",
      detail: `Relief to ${percent(item.relief_up_to)} for this Test Date only`,
      state: "waiver" as const,
    })),
    ...position.distribution_conditions.map((item) => ({
      date: `${formatDate(item.applies_from)}–${formatDate(item.applies_to)}`,
      label: "Distribution condition",
      detail: item.prohibition
        ? "No Distribution during the stated period"
        : "Distribution condition applies during the stated period",
      state: "condition" as const,
    })),
  ];

  if (activeAmendment && relevantWaiver && activeCondition) {
    const amendmentEvidence = getEvidence(
      evidence,
      activeAmendment.document_id,
      activeAmendment.locator,
    );
    const waiverEvidence = getEvidence(
      evidence,
      relevantWaiver.document_id,
      relevantWaiver.locator,
    );
    const conditionEvidence = getEvidence(
      evidence,
      activeCondition.document_id,
      activeCondition.locator,
    );
    return {
      asOf,
      tone: "attention",
      status: "Amendment controls; waiver remains limited",
      statusDetail: `The contractual threshold is ${percent(ltv.current_threshold)}. Relief to ${percent(relevantWaiver.relief_up_to)} applies only to the ${formatDate(relevantWaiver.test_date)} Test Date and does not amend that threshold.`,
      whyItMatters: `Describing the waiver as a ${percent(relevantWaiver.relief_up_to)} covenant would misstate current terms. A separate no-Distribution condition is active through ${formatDate(activeCondition.applies_to)}.`,
      recommendation: {
        title: "Review waiver conditions before relying",
        detail:
          "Confirm the relevant Test Date and proposed transaction date against the limited waiver and distribution condition.",
        href: `#evidence-${conditionEvidence.passageId}`,
        label: "Inspect exact waiver passage",
      },
      changes: [
        {
          title: "LTV threshold temporarily increased",
          summary: `The ${percent(ltv.base_threshold)} reference is replaced by ${percent(activeAmendment.value)} through ${formatDate(activeAmendment.applies_to)}.`,
          evidence: amendmentEvidence,
        },
        {
          title: "Relief granted without amending the threshold",
          summary: `Relief above ${percent(relevantWaiver.relief_above)} and up to ${percent(relevantWaiver.relief_up_to)} is limited to the ${formatDate(relevantWaiver.test_date)} Test Date.`,
          evidence: waiverEvidence,
        },
        {
          title: "Separate distribution condition is active",
          summary: `No Distribution may be made from ${formatDate(activeCondition.applies_from)} through ${formatDate(activeCondition.applies_to)}.`,
          evidence: conditionEvidence,
        },
      ],
      timeline,
      evidence: [...evidence.values()],
    };
  }

  if (activeAmendment) {
    const amendmentEvidence = getEvidence(
      evidence,
      activeAmendment.document_id,
      activeAmendment.locator,
    );
    const conditionEvidence = endedCondition
      ? getEvidence(
          evidence,
          endedCondition.document_id,
          endedCondition.locator,
        )
      : null;
    return {
      asOf,
      tone: "stable",
      status: endedCondition
        ? "Amendment controls; distribution block has ended"
        : "Amendment controls",
      statusDetail: endedCondition
        ? `The ${percent(ltv.current_threshold)} threshold remains active, while the temporary no-Distribution condition ended on ${formatDate(endedCondition.applies_to)}.`
        : `The temporary ${percent(ltv.current_threshold)} threshold controls for this date.`,
      whyItMatters:
        "The LTV amendment and waiver conditions have different scopes and end dates; they cannot be treated as one change.",
      recommendation: {
        title: "Check for any later consent or waiver",
        detail:
          "Confirm that the tracked document set contains every later modifying document before relying.",
        href: `#evidence-${amendmentEvidence.passageId}`,
        label: "Inspect amendment passage",
      },
      changes: [
        {
          title: "Temporary LTV amendment remains active",
          summary: `The original ${percent(ltv.base_threshold)} reference is replaced by ${percent(activeAmendment.value)} through ${formatDate(activeAmendment.applies_to)}.`,
          evidence: amendmentEvidence,
        },
        ...(conditionEvidence && endedCondition
          ? [
              {
                title: "Distribution condition reached its end date",
                summary: `The no-Distribution condition applied through ${formatDate(endedCondition.applies_to)}.`,
                evidence: conditionEvidence,
              },
            ]
          : []),
      ],
      timeline,
      evidence: [...evidence.values()],
    };
  }

  if (expiredAmendment) {
    const amendmentEvidence = getEvidence(
      evidence,
      expiredAmendment.document_id,
      expiredAmendment.locator,
    );
    return {
      asOf,
      tone: "stable",
      status: "Original threshold has resumed",
      statusDetail: `The temporary ${percent(expiredAmendment.value)} amendment ended on ${formatDate(expiredAmendment.applies_to)}.`,
      whyItMatters: `Using the expired ${percent(expiredAmendment.value)} threshold would overstate current contractual headroom; the original ${percent(ltv.base_threshold)} threshold applies again.`,
      recommendation: {
        title: `Re-run the covenant review at ${percent(ltv.base_threshold)}`,
        detail:
          "Collect the applicable debt amount and valuation for the relevant Test Date.",
        href: `/ask?q=What%20is%20the%20current%20maximum%20LTV%3F&asOf=${asOf}`,
        label: "Ask with this date",
      },
      changes: [
        {
          title: "Temporary amendment expired",
          summary: `The ${percent(expiredAmendment.value)} replacement applied only through ${formatDate(expiredAmendment.applies_to)}.`,
          evidence: amendmentEvidence,
        },
        {
          title: "Original covenant is controlling again",
          summary: `The Facility Agreement states the ${percent(ltv.base_threshold)} threshold.`,
          evidence: baseEvidence,
        },
      ],
      timeline,
      evidence: [...evidence.values()],
    };
  }

  return {
    asOf,
    tone: "stable",
    status: "Original covenant controls",
    statusDetail:
      "The selected date precedes the tracked temporary amendment and limited waiver.",
    whyItMatters: `The directly supported LTV threshold is ${percent(ltv.base_threshold)}; later relief must not be applied retrospectively.`,
    recommendation: {
      title: "Review the original covenant inputs",
      detail:
        "Confirm the debt amount, valuation, and Test Date before assessing compliance.",
      href: `#evidence-${baseEvidence.passageId}`,
      label: "Inspect original passage",
    },
    changes: [
      {
        title: "No modifying document is active yet",
        summary:
          "The original Facility Agreement remains the controlling source for this date.",
        evidence: baseEvidence,
      },
    ],
    timeline,
    evidence: [...evidence.values()],
  };
}

export function normalizeDecisionDate(value: string | undefined): DecisionDate {
  return decisionDates.some((option) => option.value === value)
    ? (value as DecisionDate)
    : "2026-07-02";
}

export async function loadDecisionSurface(
  workspaceSlug: string,
  asOf: DecisionDate,
): Promise<DecisionSurfaceResult> {
  try {
    const position = await requestEngineContractPosition(workspaceSlug, asOf);
    if (position.support_status === "missing_support" || !position.ltv) {
      return {
        kind: "missing_support",
        title: "Current position cannot be established",
        detail:
          "The engine abstained because required reviewed provision mappings are missing.",
        missingInformation: position.missing_information,
      };
    }
    return {
      kind: "ready",
      surface: buildDecisionSurface(asOf, position),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const engineConnectionFailed =
      message.includes("fetch failed") ||
      message.includes("timeout") ||
      message.includes("Engine position API request failed");
    return {
      kind: "unavailable",
      title: "Decision engine unavailable",
      detail:
        "No contractual status is shown because the authoritative deterministic engine or its source validation failed.",
      missingInformation: [
        engineConnectionFailed
          ? "A working connection to the configured local deterministic engine"
          : "An engine response matching contract v1.1.0 and persisted source evidence",
      ],
    };
  }
}
