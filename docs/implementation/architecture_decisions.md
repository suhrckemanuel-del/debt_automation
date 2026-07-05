# Proposed Architecture Decisions

These decisions describe the implemented local v0. The owner-directed authorization is recorded in `prototype_decision.md`.

## ADR-001 — Local deterministic first

**Status:** Implemented

Use Python, Markdown source documents, and JSON metadata locally. Build deterministic parsing, hierarchy resolution, retrieval, and evaluation before considering an LLM.

**Reason:** Trust mechanics must be observable and reproducible. An LLM is not required to prove source selection, amendment awareness, abstention, or legal-boundary behaviour.

## ADR-002 — Stable source identity

**Status:** Implemented

Every document and passage receives a stable ID. A passage records:

- document ID;
- clause or section;
- page marker;
- exact text;
- topic tags; and
- source path.

**Reason:** Evaluation must compare evidence identities, not merely similar answer wording.

## ADR-003 — Explicit current-document hierarchy

**Status:** Implemented

Currentness is resolved from explicit metadata before retrieval results become answers. Amendments modify provisions; waivers provide scoped relief unless they expressly amend a term.

**Reason:** Similar language in an original agreement is unsafe when a later document controls.

## ADR-004 — Proposition-level answer assembly

**Status:** Implemented

An answer is a set of propositions, each linked to one or more supporting passage IDs. Unsupported propositions are rejected.

**Reason:** Whole-answer string matching is brittle and can hide a partially unsupported answer.

## ADR-005 — Abstention is field-specific

**Status:** Implemented

Return `Source not found.` for a wholly unsupported answer. For a partially supported structured answer, identify each missing field without guessing.

**Reason:** A reporting deadline may be missing even when the reporting obligation itself is supported.

## ADR-006 — Legal and commercial boundaries are typed

**Status:** Implemented

Represent legal-review and senior-finance-review requirements as explicit output fields, not a disclaimer appended to free text.

**Reason:** Boundaries must be testable.

## ADR-007 — Gold answers are independently owned

**Status:** Implemented

The implementation owner must not silently edit gold answers. Source-document, gold-key, and code changes require distinct review steps.

**Reason:** A benchmark is useless if expectations move to fit the output.

## ADR-008 — No confidential-data path in v0

**Status:** Accepted for all phases

Phase 0/1 accepts only repository synthetic documents. Real or sanitized production documents require a separate governance decision and threat review.

**Reason:** Confidentiality risk is not needed to test the initial trust mechanics.
