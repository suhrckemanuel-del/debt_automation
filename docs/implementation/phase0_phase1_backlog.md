# Gate-Blocked Phase 0/1 Backlog

> Historical planning artifact. The local v0 was later authorized directly for a design partner in `prototype_decision.md`. Use this file as implementation history, not as the current gate.

## Authorization rule

Do not activate this backlog until `docs/phase-1/decision_record.md` contains:

- five serious sessions;
- a documented `PROCEED` or scoped `ADAPT`;
- an `authorized_next_scope`; and
- the decision date and rationale.

Planning is allowed. Implementation is not.

## Phase 0 — Corpus and independent benchmark

### P0-000 — Verify gate and scope

**Depends on:** Phase -1 decision
**Output:** Gate verification note and frozen authorized scope
**Acceptance:** No task below begins if the decision is missing, `STOP`, or ambiguous
**Stop:** Any conflict between the PRD, decision record, and authorized scope

### P0-010 — Freeze schemas

**Depends on:** P0-000
**Output:** JSON schemas for documents, passages, questions, gold propositions, and answers
**Acceptance:** Required fields, enums, dates, IDs, and validation errors are explicit
**Evidence:** Valid and invalid example records plus schema-validation results
**Owner:** Schema owner

### P0-020 — Expand synthetic corpus

**Depends on:** P0-010
**Output:** Authorized document set only
**Acceptance:** Every source is synthetic, page-marked, internally coherent, and mapped to a test purpose
**Evidence:** Document timeline, relationship map, and confidentiality check
**Owner:** Synthetic document owner

### P0-030 — Build document registry

**Depends on:** P0-010, P0-020
**Output:** `document_registry.json`
**Acceptance:** Original, amendment, waiver, and related-document relationships are machine-readable
**Evidence:** Schema validation and hierarchy examples
**Owner:** Registry owner

### P0-040 — Draft benchmark questions

**Depends on:** P0-020
**Output:** At least 25 questions if the original scope remains authorized
**Acceptance:** Includes currentness, cross-reference, abstention, and judgment-boundary cases
**Evidence:** Coverage matrix against requirements and failure modes
**Owner:** Benchmark owner

### P0-050 — Create independent gold key

**Depends on:** P0-020, P0-040
**Output:** Proposition-level gold answers and required passage IDs
**Acceptance:** Every proposition has direct evidence; forbidden claims are explicit
**Evidence:** Independent source audit and disagreement log
**Owner:** Gold owner, separate from implementation

### P0-060 — Phase 0 quality gate

**Depends on:** P0-030, P0-050
**Output:** Phase 0 review report
**Acceptance:** No unresolved material source contradiction; benchmark and gold key validate; legal boundaries are reviewable
**Stop:** Gold expectations depend on intended implementation behaviour rather than sources

## Phase 1 — Deterministic trust mechanics

### P1-010 — Markdown parser

**Depends on:** P0-060
**Output:** Passage records from page markers and clause headings
**Acceptance:** Exact text, page, clause, and document identity are preserved
**Tests:** Multiple passages per page, missing page marker, repeated heading, blank section
**Stop:** Parser normalizes source text so aggressively that exact citation is lost

### P1-020 — Query classification

**Depends on:** P0-060
**Output:** Deterministic question-family and legal-boundary classifier
**Acceptance:** Multi-topic questions may return multiple categories; unknown is explicit
**Tests:** LTV, distribution, disposal, prepayment, waiver, unsupported, and legal-action wording

### P1-030 — Candidate retrieval

**Depends on:** P1-010, P1-020
**Output:** Ranked passage candidates with reasons
**Acceptance:** No generated answer; candidate identity and matching signals remain inspectable
**Tests:** Synonyms, defined terms, cross-references, absent source

### P1-040 — Hierarchy resolver

**Depends on:** P0-030, P1-010
**Output:** Applicable source set and modification chain for an evaluation date
**Acceptance:** Distinguishes amendment from waiver and reports unresolved hierarchy
**Tests:** Before/inside/after temporary period, one-date waiver, missing related document, conflicting metadata

### P1-050 — Guardrails

**Depends on:** P1-020, P1-040
**Output:** Abstention, missing-information, legal-review, and finance-review decisions
**Acceptance:** Unsupported claims cannot reach answer assembly
**Tests:** Whole-answer abstention, partial missing field, legal yes/no request, unsupported calculation

### P1-060 — Structured answer engine

**Depends on:** P1-030, P1-040, P1-050
**Output:** Answer JSON and Markdown rendering
**Acceptance:** Every factual proposition links to passage IDs; currentness note and review fields are typed
**Stop:** Free-text assembly can introduce an unsupported proposition

### P1-070 — Evaluator

**Depends on:** P0-050, P1-060
**Output:** Per-question and aggregate report
**Acceptance:** Scores propositions, citations, currentness, abstention, boundaries, and completeness separately
**Evidence:** Every failure names the question, proposition, expected evidence, actual evidence, and responsible component

### P1-080 — Minimal CLI

**Depends on:** P1-060, P1-070
**Output:** Commands to ask one question and run the benchmark
**Acceptance:** No UI framework; output is inspectable and deterministic
**Stop:** CLI work begins to drive architecture or feature expansion

### P1-090 — Phase 1 evidence bundle

**Depends on:** P1-070, P1-080
**Output:** Commands, full results, representative answers, failures, assumptions, and synthetic-data confirmation
**Acceptance:** Another person can reproduce the result locally
**Exit gate:** Citation and abstention failures block feature expansion

## Ownership constraints

- Gold owner and implementation owner must be different work units.
- Shared schemas have one owner at a time.
- Hierarchy rules are integrated before answer-engine changes.
- Parallel tasks require non-overlapping files and an integration order.
- No task may edit benchmark expectations merely to make a failing implementation pass.
