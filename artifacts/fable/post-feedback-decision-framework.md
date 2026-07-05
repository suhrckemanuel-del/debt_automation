# Post-feedback decision framework

Date: 5 July 2026
Purpose: decide what to build — or stop — after the first people see the
F-001 demo. This file contains no feedback; it must not be filled with
invented reactions. The demand gate remains 0 of 5 serious sessions.

## How to classify what comes back

**Presentation feedback** (improves the demo, proves nothing about demand):

- Comments on clarity, pacing, visual design, wording, or confusion about a
  step.
- Compliments of any strength, including from people who like you.
- "I understood it" — comprehension is the demo working, not the workflow
  mattering.

**Workflow-demand evidence** (counts toward the 5-session gate only when it
comes from someone who actually performs or supervises agreement review):

- They describe a specific recent situation where establishing the current
  position across amendments/waivers cost real time or created real risk.
- They name their current workaround and its cost unprompted.
- They ask to run their own (redacted or synthetic) scenario through it.
- They take a costly next step: schedule a working session, introduce a
  colleague who owns the problem, or offer documents under proper terms.

## Which signals justify which work

| Signal actually observed | Work it unlocks |
| --- | --- |
| Two or more reviewers independently ask to load their own documents and accept the local/manual boundary for now | Document ingestion beyond the synthetic corpus (still local, still Git-ignored) |
| A design partner commits to recurring use that physically cannot run on the developer's machine | Authentication + hosted deployment (the versioned Supabase schema exists for this moment, not before) |
| Reviewers repeatedly hit provisions outside the nine slots and say the gap blocks their read of the position | Expanded mapping workflows (edit/validate/activate UI on top of the existing immutable activation) |
| Sessions show the abstention/citation trust mechanics are what they value | Deepen evidence tooling before any breadth |

## Signals that should cause the project to stop or pivot

- Five serious sessions completed and no one describes recurring pain or a
  costly workaround.
- Reviewers consistently say the hard part is somewhere else (negotiation,
  drafting, data collection) and current-position resolution is already fine.
- Explicit stop signals in the existing scorecard
  (`docs/phase-1/facilitator_scorecard.md`) trigger.
- The only enthusiasm comes from people who would not use or buy it.

## Guarding against friendly encouragement

The first viewer is a friend. Their encouragement is a reason to improve the
demo, never a reason to build infrastructure. Rules:

1. Nothing a friend says can move the demand gate unless they are themselves
   a qualifying reviewer describing their own concrete workflow.
2. Record verbatim quotes with date and role in the session evidence
   templates (`docs/phase-1/session_evidence_template.md`); classify each as
   presentation or workflow evidence using the definitions above.
3. Any decision to start deferred infrastructure must cite at least one
   logged workflow-demand item, not a feeling of momentum.

## Explicitly deferred until the gate says otherwise

Hosted Supabase deployment; production authentication; private object-storage
integration; real document upload; OCR; LLM integration; vector databases;
billing; CRM integrations; multi-organization administration.
