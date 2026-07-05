# Gate 1 — Real-Document Authorization Checklist

**Status: DRAFT — NOT APPROVED**

This document is a checklist template. It records **no approval**. Every item
below is an open owner decision. Until the owner replaces this draft with a
dated, signed decision and updates `AGENTS.md` and
`docs/implementation/prototype_decision.md` to match, the binding
authorization state remains:

```
DEMAND_VALIDATION_COMPLETE            = NO
REAL_OR_CONFIDENTIAL_DOCUMENTS_AUTHORIZED = NO
CLOUD_DEPLOYMENT_AUTHORIZED           = NO
LLM_OR_EXTERNAL_AI_AUTHORIZED         = NO
PRODUCTION_USE_AUTHORIZED             = NO
CURRENTLY_AUTHORIZED_DATA             = SYNTHETIC_ONLY
```

A template, a draft, or an agent-produced document is not approval. No agent
may mark any item below as decided.

## Consequence of the missing decision

While this document is unapproved, all work must use synthetic, adversarial,
or publicly reusable fixtures only. No real agreement, real entity name, real
deal term, or confidential value may enter the repository, a workspace, a
prompt, a log, a screenshot, a fixture, or an issue tracker.

## Owner decisions required

Each item must be completed by the owner with a dated, explicit answer.
"TBD", a template value, or silence means **not authorized**.

### 1. Pilot scope

- OWNER DECISION REQUIRED — Named pilot organization or design partner.
- OWNER DECISION REQUIRED — The single bounded workflow and permitted use.
- OWNER DECISION REQUIRED — Permitted document types, jurisdictions, and
  sensitivity classes.
- OWNER DECISION REQUIRED — Confirmation that the organization and the
  document owner permit processing.

### 2. Legal and privacy

- OWNER DECISION REQUIRED — Controller/processor roles and the applicable
  legal and privacy review.
- OWNER DECISION REQUIRED — Whether a data-protection impact assessment or
  equivalent is required, and by whom.

### 3. Storage and encryption

- OWNER DECISION REQUIRED — Approved storage location(s) and explicitly
  prohibited locations (including synced folders, Git, and cloud drives).
- OWNER DECISION REQUIRED — Encryption in transit and at rest.
- OWNER DECISION REQUIRED — Key ownership, rotation, recovery, and
  revocation.

### 4. Access control

- OWNER DECISION REQUIRED — User roles, least privilege, MFA, session
  controls, and workspace isolation requirements.
- OWNER DECISION REQUIRED — Audit access and reviewer accountability.

### 5. Data lifecycle

- OWNER DECISION REQUIRED — Retention schedule and legal hold process.
- OWNER DECISION REQUIRED — Export controls, verified deletion, and backup
  deletion behavior.

### 6. Incident readiness

- OWNER DECISION REQUIRED — Incident response, breach escalation, recovery,
  and rollback procedures.

### 7. Vendors and providers

- OWNER DECISION REQUIRED — Approved vendors and subprocessors (none are
  currently approved).
- OWNER DECISION REQUIRED — Model/OCR/provider retention, training,
  residency, transfer, and deletion terms (no external provider is currently
  approved; LLM authorization is a separate gate — see Gate 3).

### 8. Accountability

- OWNER DECISION REQUIRED — Named qualified reviewers.
- OWNER DECISION REQUIRED — The single person accountable for final
  decisions.

### 9. Pilot method

- OWNER DECISION REQUIRED — Pre-agreed pilot acceptance criteria and stop
  criteria.
- OWNER DECISION REQUIRED — A manual fallback procedure if the system is
  unavailable or untrusted.

## Preconditions independent of the owner decisions

Before this gate can be approved even in principle:

1. The threat model (`docs/security/threat_model.md`) must be reviewed and
   approved by the owner; it is currently a NOT APPROVED draft.
2. All synthetic baseline checks must pass (see the validation commands in
   `README.md`).
3. Pilot documents must remain in local, Git-ignored workspaces
   (`workspaces/`, excluding the synthetic `workspaces/demo`).

## Approval mechanics

Approval requires all of the following, together:

1. This file rewritten by the owner with each decision answered, dated, and
   the status line changed by the owner to `APPROVED` with the owner's name.
2. `AGENTS.md` updated to reflect the new authorization state.
3. `docs/implementation/prototype_decision.md` updated compatibly.

Partial approval is not approval. If any item is unanswered, agents must stop
at the real-data gate and continue only with synthetic work.
