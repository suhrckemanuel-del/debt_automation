# Packet 02 — Synthetic Document Creator

## Input context

- The three questions in `docs/phase-1/three_question_reviewer_pack.md`
- Product guardrails in `README.md`

## Exact task

Create the minimum fictional document set needed to test current truth, cross-references, and judgment boundaries.

## In scope

- One facility agreement
- One amendment
- One limited waiver
- Explicit page markers, clause identifiers, dates, defined terms, and modification relationships

## Out of scope

- Realistic full-length legal drafting
- PDFs or OCR
- Compliance certificates, valuations, hedge documents, or unrelated clauses
- Real deal terms

## Owned files

- `docs/phase-1/synthetic-corpus/facility_agreement.md`
- `docs/phase-1/synthetic-corpus/amendment_letter_1.md`
- `docs/phase-1/synthetic-corpus/waiver_letter.md`

## Expected output and acceptance criteria

- Original LTV threshold is explicit
- Amendment changes the threshold for a defined period
- Waiver gives narrower relief without silently changing the threshold
- Distribution clause cross-references a defined term
- Disposal, proceeds, and distribution provisions create a genuine multi-clause review problem
- All documents state that they are synthetic

## Completion evidence

- Clause-to-question coverage table
- Date/currentness timeline
- Confirmation that no real entity or transaction data appears
- List of deliberate ambiguities and why they are useful

## Stop and escalate when

- A requested scenario would require a legal conclusion to be encoded as fact
- The same fact conflicts accidentally across documents
- Any source material may be real or confidential

## Do not

- Copy text from real agreements
- Expand the corpus beyond what the three questions need
- Resolve every ambiguity; missing facts are part of the test
