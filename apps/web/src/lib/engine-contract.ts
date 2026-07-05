import { z } from "zod";

export const ENGINE_CONTRACT_VERSION = "1.2.0" as const;

export const supportStatusSchema = z.enum([
  "supported",
  "partially_supported",
  "source_not_found",
  "legal_review_required",
]);

export const engineCitationSchema = z
  .object({
    document_id: z.string().min(1),
    document_title: z.string().min(1),
    document_type: z.string().min(1),
    locator: z.string().min(1),
    page: z.number().int().positive(),
    passage_id: z.string().min(1),
    supporting_passage: z.string().min(1),
    source_path: z.string().min(1),
  })
  .strict();

export const engineAnswerSchema = z
  .object({
    question: z.string().min(1).max(4000),
    as_of_date: z.iso.date(),
    short_answer: z.string().min(1),
    support_status: supportStatusSchema,
    sources: z.array(engineCitationSchema),
    assumptions: z.array(z.string()),
    missing_information: z.array(z.string()),
    human_review_required: z.boolean(),
    review_note: z.string(),
    notes_on_currentness: z.string(),
    query_category: z.string().min(1),
  })
  .strict();

export type SupportStatus = z.infer<typeof supportStatusSchema>;
export type EngineCitation = z.infer<typeof engineCitationSchema>;
export type EngineAnswer = z.infer<typeof engineAnswerSchema>;

export const engineAnswerRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(4000),
    as_of: z.iso.date(),
    test_date: z.iso.date().nullable().optional(),
  })
  .strict();

export type EngineAnswerRequest = z.infer<typeof engineAnswerRequestSchema>;

const ltvModificationSchema = z
  .object({
    document_id: z.string().min(1),
    locator: z.string().min(1),
    value: z.number(),
    unit: z.string().min(1),
    applies_from: z.iso.date(),
    applies_to: z.iso.date(),
    active: z.boolean(),
  })
  .strict();

const ltvWaiverSchema = z
  .object({
    document_id: z.string().min(1),
    locator: z.string().min(1),
    test_date: z.iso.date(),
    relief_above: z.number(),
    relief_up_to: z.number(),
    unit: z.string().min(1),
    does_not_amend: z.boolean(),
    relevant: z.boolean(),
  })
  .strict();

const distributionConditionSchema = z
  .object({
    document_id: z.string().min(1),
    locator: z.string().min(1),
    prohibition: z.boolean(),
    applies_from: z.iso.date(),
    applies_to: z.iso.date(),
    active: z.boolean(),
  })
  .strict();

export const engineContractPositionSchema = z
  .object({
    as_of_date: z.iso.date(),
    support_status: z.enum(["supported", "missing_support"]),
    ltv: z
      .object({
        base_threshold: z.number(),
        base_applies_from: z.iso.date(),
        base_document_id: z.string().min(1),
        base_locator: z.string().min(1),
        current_threshold: z.number(),
        unit: z.string().min(1),
        controlling_document_id: z.string().min(1),
        controlling_locator: z.string().min(1),
        amendment_active: z.boolean(),
        waiver_relevant: z.boolean(),
        distribution_condition_active: z.boolean(),
      })
      .strict()
      .nullable(),
    ltv_modifications: z.array(ltvModificationSchema),
    ltv_waivers: z.array(ltvWaiverSchema),
    distribution_conditions: z.array(distributionConditionSchema),
    sources: z.array(engineCitationSchema),
    missing_information: z.array(z.string()),
  })
  .strict();

export type EngineContractPosition = z.infer<
  typeof engineContractPositionSchema
>;

const decimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);

const ltvArithmeticSchema = z
  .object({
    debt_amount: decimalStringSchema,
    valuation_amount: decimalStringSchema,
    threshold_percent: decimalStringSchema,
    ltv_percent: decimalStringSchema,
    ltv_display: z.string().min(1),
    headroom_percentage_points: decimalStringSchema,
    headroom_display: z.string().min(1),
    maximum_debt_at_threshold: decimalStringSchema,
    debt_capacity_headroom: decimalStringSchema,
    minimum_valuation_at_threshold: decimalStringSchema,
    arithmetic_status: z.enum([
      "below_selected_threshold",
      "at_selected_threshold",
      "above_selected_threshold",
    ]),
  })
  .strict();

const ltvScenarioSchema = z
  .object({
    scenario_id: z.string().min(1),
    label: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const engineLtvCalculationSchema = z.discriminatedUnion("status", [
  z
    .object({
      model_id: z.string().min(1),
      status: z.literal("calculation_unavailable"),
      missing_information: z.array(z.string().min(1)).min(1),
      human_review_required: z.literal(true),
      sources: z.array(engineCitationSchema),
    })
    .strict(),
  z
    .object({
      model_id: z.literal("ltv-v1"),
      model_version: z.number().int().positive(),
      status: z.literal("calculated_human_review_required"),
      calculation_purpose: z.literal("covenant_test"),
      evaluation_date: z.iso.date(),
      test_date: z.iso.date(),
      currency: z.string().length(3),
      scenario: ltvScenarioSchema,
      source_inputs: z
        .object({
          debt_amount: z
            .object({
              value: decimalStringSchema,
              effective_date: z.iso.date(),
              document_id: z.string().min(1),
              locator: z.string().min(1),
            })
            .strict(),
          valuation_amount: z
            .object({
              value: decimalStringSchema,
              effective_date: z.iso.date(),
              document_id: z.string().min(1),
              locator: z.string().min(1),
            })
            .strict(),
        })
        .strict(),
      calculation_inputs: z
        .object({
          debt_amount: decimalStringSchema,
          valuation_amount: decimalStringSchema,
        })
        .strict(),
      formula: z
        .object({
          expression: z.string().min(1),
          comparison_policy: z.literal("full_precision"),
          display_rounding: z.string().min(1),
          trace: z.string().min(1),
        })
        .strict(),
      outputs: ltvArithmeticSchema,
      selected_threshold: z
        .object({
          percent: decimalStringSchema,
          document_id: z.string().min(1),
          locator: z.string().min(1),
          amendment_active: z.boolean(),
        })
        .strict(),
      waiver_observation: z
        .object({
          relevant: z.literal(true),
          test_date: z.iso.date(),
          relief_above_percent: decimalStringSchema,
          relief_up_to_percent: decimalStringSchema,
          within_stated_numeric_range: z.boolean(),
          does_not_amend_threshold: z.boolean(),
        })
        .strict()
        .nullable(),
      assumptions: z.array(z.string()),
      missing_information: z.array(z.string()).length(0),
      human_review_required: z.literal(true),
      review_note: z.string().min(1),
      sources: z.array(engineCitationSchema).min(4),
    })
    .strict(),
]);

export type EngineLtvCalculation = z.infer<
  typeof engineLtvCalculationSchema
>;
export type CalculatedEngineLtv = Extract<
  EngineLtvCalculation,
  { status: "calculated_human_review_required" }
>;

export const engineLtvRequestSchema = z
  .object({
    model_id: z.literal("ltv-v1"),
    scenario_id: z.string().trim().min(1).max(80).nullable(),
  })
  .strict();

function getEngineBaseUrl(): string {
  const baseUrl = process.env.AGREEMENT_ENGINE_API_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "AGREEMENT_ENGINE_API_URL is not configured; no transient or rewritten engine is used.",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

export async function requestEngineAnswer(
  workspaceId: string,
  request: EngineAnswerRequest,
): Promise<EngineAnswer> {
  const validatedRequest = engineAnswerRequestSchema.parse(request);
  const baseUrl = getEngineBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedRequest),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Engine API request failed with HTTP ${response.status}.`);
  }
  const payload: unknown = await response.json();
  const answer = engineAnswerSchema.parse(payload);
  if (answer.question !== validatedRequest.question) {
    throw new Error("Engine API returned an answer for a different question.");
  }
  return answer;
}

export async function requestEngineContractPosition(
  workspaceId: string,
  asOf: string,
): Promise<EngineContractPosition> {
  const validatedDate = z.iso.date().parse(asOf);
  const response = await fetch(
    `${getEngineBaseUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/position?as_of=${encodeURIComponent(validatedDate)}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Engine position API request failed with HTTP ${response.status}.`,
    );
  }
  const payload: unknown = await response.json();
  const position = engineContractPositionSchema.parse(payload);
  if (position.as_of_date !== validatedDate) {
    throw new Error(
      "Engine API returned a contractual position for a different date.",
    );
  }
  return position;
}

export async function requestEngineLtvCalculation(
  workspaceId: string,
  scenarioId: string | null,
): Promise<EngineLtvCalculation> {
  const request = engineLtvRequestSchema.parse({
    model_id: "ltv-v1",
    scenario_id: scenarioId,
  });
  const response = await fetch(
    `${getEngineBaseUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/models/ltv-calculations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Engine LTV calculation failed with HTTP ${response.status}.`,
    );
  }
  const payload: unknown = await response.json();
  return engineLtvCalculationSchema.parse(payload);
}
