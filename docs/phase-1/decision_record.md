# Phase -1 Decision Record

## Freeze

- `criteria_frozen_on`: 2026-07-02
- `planned_decision_date`: 2026-07-16
- `decision_owner`: Manuel
- `required_serious_sessions`: 5

Complete the dates above before the first session. Do not change the criteria after evidence collection begins.

## Decision rule

Continue to a coded prototype when:

- five serious workflow-review sessions are complete;
- multiple positive signals are present;
- no stop condition dominates; and
- the written rationale explains positive, absent, and contradictory evidence.

This is a judgment gate rather than a weighted score.

## Positive signals

| Signal | Target | Observed | Supporting participant IDs |
|---|---:|---:|---|
| Pack maps to real recurring pain | At least 3 |  |  |
| Specific current workaround identified | At least 2 |  |  |
| Follow-up, introduction, or additional scenario requested | At least 2 |  |  |
| Citations/missing-information flags improve reviewer trust | Qualitative |  |  |
| Total analyst-plus-reviewer saving is meaningful | Qualitative |  |  |
| No major confidentiality/legal blocker | Required |  |  |

## Adapt evidence

| Signal | Observed? | Supporting participant IDs and notes |
|---|---|---|
| Clause pack preferred over direct answers |  |  |
| Covenant calendar valued more than ad hoc questions |  |  |
| Answer format too long or not decision-ready |  |  |
| Pain concentrated in infrequent transactions |  |  |
| Explicit human-in-the-loop design required |  |  |

## Stop evidence

| Signal | Observed? | Supporting participant IDs and notes |
|---|---|---|
| Existing tools solve the workflow well enough |  |  |
| Pack increases total review burden |  |  |
| Participants cannot name recent examples |  |  |
| No second session or introduction accepted |  |  |
| Confidential-system access is not realistically manageable |  |  |
| Legal/compliance concerns make extraction unattractive |  |  |

## Cross-session evidence

Median or range of observed manual task time:

Median or range of reviewer-pack verification time:

Material corrections in baseline outputs:

Material corrections in reviewer-pack outputs:

Strongest evidence for building:

Strongest evidence against building:

Most important adoption friction:

## Decision

- `decision`: PROCEED | ADAPT | STOP
- `decision_date`:
- `authorized_next_scope`:

### Rationale

Positive signals observed:

Signals not observed:

Contradictory evidence:

Why the decision follows from the frozen criteria:

### If ADAPT

New wedge:

What will not be carried forward:

New validation required before implementation:

### If PROCEED

The Builder packet may be activated only for the `authorized_next_scope` above.

### If STOP

Archive the evidence and do not continue feature development without materially new evidence.
