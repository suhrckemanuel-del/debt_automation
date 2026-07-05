import { z } from "zod";

export const ENGINE_CONTRACT_VERSION = "1.1.0" as const;

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
