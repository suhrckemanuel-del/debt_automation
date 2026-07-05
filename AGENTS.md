# Repository Instructions

## Objective

Advance F-001 agreement intelligence through evidence-based demand validation and, only after authorization, a small source-grounded prototype.

## Always-loaded rules

1. Use synthetic data only.
2. Never request or retain real agreements, entity names, deal terms, credentials, or non-public information.
3. Do not fabricate participant evidence, demand signals, timings, introductions, or reviewer reactions.
4. Do not claim broader demand validation. The local synthetic v0 is authorized by `docs/implementation/prototype_decision.md` for a named design-partner workflow.
5. Retrieval and extraction may be automated. Legal interpretation and commercial judgment remain human responsibilities.
6. Every factual answer must cite a directly supporting document, clause or section, page, and passage.
7. Distinguish original terms, amendments, and limited waivers.
8. Missing support must produce abstention or an explicit missing-information flag.

## Context layers

- Repository rules: this file
- Product and phase context: `README.md` and `docs/phase-1/README.md`
- Task context: the applicable bounded packet in `docs/phase-1/agent-packets/`

Keep task prompts narrow. Do not copy the entire repository into every task.

## Current phase

The repository is implementing an owner-directed local v0.

Allowed:

- deterministic parsing, classification, retrieval, hierarchy resolution, structured answers, CLI, and evaluation;
- synthetic document and reviewer-pack quality improvements;
- session, evidence, privacy, and validation tooling; and
- adversarial review.

Not yet allowed:

- LLM integration;
- real or confidential document ingestion;
- cloud deployment;
- vector database, dashboard, or integration expansion.

## Completion evidence

For each task report:

- files changed;
- checks run and exact results;
- representative output where relevant;
- assumptions and unresolved risks; and
- confirmation that no confidential data was introduced.

Do not report success while hiding failed checks.
