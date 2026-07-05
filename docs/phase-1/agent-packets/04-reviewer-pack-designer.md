# Packet 04 — Reviewer-Pack Designer

## Input context

- Frozen synthetic corpus
- Three questions
- Independent gold answer key, when available
- Reviewer-handoff requirements

## Exact task

Design a concise reviewer pack that answers what the documents directly support, exposes currentness and missing facts, and makes verification faster.

## In scope

- Short answer
- Support status
- Exact document, clause, page, and passage citations
- Currentness note
- Missing information
- Human-review boundary

## Out of scope

- Legal or commercial conclusions
- Product UI
- Additional question families

## Owned files

- `docs/phase-1/three_question_reviewer_pack.md`

## Expected output and acceptance criteria

- Question 1 separates original threshold, amended threshold, and limited waiver relief
- Question 2 identifies both the restriction and defined-term location
- Question 3 gives no final yes/no
- Every factual statement is traceable
- Missing facts are specific enough to guide the next reviewer action

## Completion evidence

- Source-support audit
- Reading-length estimate
- At least one deliberately excluded unsupported conclusion
- Known reviewer-friction risks

## Stop and escalate when

- A claim lacks direct support
- Currentness cannot be established
- The output format hides qualifications or review requirements

## Do not

- Fill missing facts with assumptions
- Use general legal knowledge as a source
- Describe waiver relief as a permanent amendment
