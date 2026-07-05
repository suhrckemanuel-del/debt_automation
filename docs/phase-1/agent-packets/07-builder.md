# Packet 07 — Builder

## Input context

- Completed `docs/phase-1/decision_record.md`
- Authorized next scope
- Synthetic corpus
- Gold answer key
- Trust and contrarian reviews
- PRD and build plan

## Exact task

After a documented `PROCEED` or scoped `ADAPT` decision, propose and implement the smallest local prototype that tests the authorized workflow.

## In scope

Only the scope explicitly authorized in the Phase -1 decision. Expected default:

- deterministic parser
- rule-based retrieval
- current-document hierarchy
- citation-producing structured output
- abstention and legal-review flags
- reproducible evaluation

## Out of scope

- Work before Phase -1 authorization
- Real document ingestion
- Cloud deployment
- Production authentication
- Vector database
- Dashboard expansion
- Autonomous legal conclusions

## Owned files

To be assigned after the decision. Shared schemas and gold answers remain independently owned.

## Expected output and acceptance criteria

- Simplest implementation sequence
- Explicit task/file ownership
- Tests mapped to authorized acceptance criteria
- Evidence bundle containing commands, results, representative outputs, failures, and assumptions

## Completion evidence

- Files changed
- Exact test and benchmark commands
- Full results, including failures
- Representative supported, unsupported, currentness, and legal-boundary outputs
- Confirmation that only synthetic data was used

## Stop and escalate when

- `decision_record.md` is incomplete or says `STOP`
- Authorized scope is ambiguous
- Citation, abstention, or legal-boundary requirements cannot be verified
- Implementation would require confidential data or new external authority

## Do not

- Build to compensate for weak demand evidence
- Add an LLM before deterministic trust mechanics work
- optimize UI before source correctness
- modify gold answers to make the prototype pass
