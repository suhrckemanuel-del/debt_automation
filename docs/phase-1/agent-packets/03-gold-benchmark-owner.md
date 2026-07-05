# Packet 03 — Gold Benchmark Owner

## Input context

- The frozen synthetic corpus
- The three questions
- Support-status and reviewer-handoff requirements

## Exact task

Independently define the correct answer propositions, required citations, unacceptable claims, missing-information expectations, and legal-review boundary for each question.

## In scope

- Proposition-level answer key
- Exact source mapping
- Acceptable paraphrases
- Required abstention or qualification
- Material-error definition

## Out of scope

- Editing the synthetic source documents
- Implementing retrieval or generation
- Scoring user demand

## Owned files

- Future output: `docs/phase-1/gold_answer_key.md`

## Expected output and acceptance criteria

- Every factual proposition maps to a directly supporting passage
- Current threshold and waiver relief are distinguished
- Cross-referenced definition is mandatory for question 2
- Question 3 rejects an unqualified yes/no
- Material and non-material errors are distinguished

## Completion evidence

- Proposition-to-citation matrix
- List of forbidden conclusions
- Independent comparison against the reviewer pack after the key is drafted
- Any disagreement reported rather than harmonized silently

## Stop and escalate when

- A proposition cannot be supported directly
- The source documents are internally inconsistent
- Legal interpretation is required to declare a single correct answer

## Do not

- Derive the key by copying the reviewer pack
- Reward plausible but unsupported claims
- Edit gold expectations to accommodate implementation output
