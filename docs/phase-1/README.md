# Phase -1 Validation Kit

## Objective

Determine whether the three-question source-backed reviewer pack addresses a sufficiently real workflow problem to justify a larger benchmark and coded prototype.

## Artifacts

- `synthetic-corpus/`: the three fictional source documents
- `participant_invitation.md`: confidentiality-safe recruitment copy
- `recruitment_plan.md`: two-week participant mix and recruitment sequence
- `outreach/P01_brief.md`: first-participant outreach and follow-up workflow
- `outreach_tracker_template.csv`: tracked schema for a local, de-identified recruitment tracker
- `baseline_task.md`: participant task with questions and sources but no answers
- `three_question_reviewer_pack.md`: the proposed assisted output
- `outreach_questions.md`: ten non-leading workflow questions
- `session_script.md`: repeatable 45-minute session protocol
- `facilitator_scorecard.md`: compact live capture sheet
- `session_evidence_template.md`: detailed evidence record for one session
- `evidence_log_template.csv`: tracked schema for the local cross-session evidence log
- `sessions/`: de-identified completed session records
- `decision_record.md`: frozen criteria and final proceed/adapt/stop decision
- `trust_review.md`: pre-session source, currentness, and boundary audit
- `contrarian_review.md`: pre-session no-build hypotheses and falsification tests
- `agent-packets/`: bounded instructions for the next work units

## Required sequence

1. Enter the criteria freeze date and planned decision date in `decision_record.md`.
2. Copy `evidence_log_template.csv` to `evidence_log.csv`. The populated file is ignored by Git.
3. Copy `outreach_tracker_template.csv` to `outreach_tracker.csv`. The populated file is ignored by Git.
4. Recruit target practitioners and reviewers without requesting confidential material.
5. Create a local session record with `.\scripts\New-Phase1Session.ps1 -ParticipantId P01`.
6. Run five serious workflow-review sessions using `session_script.md`.
7. Complete one evidence record per session and one row in the local `evidence_log.csv`.
8. Record positive, contradictory, adapt, and stop evidence.
9. Make and explain one decision: `PROCEED`, `ADAPT`, or `STOP`.
10. Only after `PROCEED` or a scoped `ADAPT`, authorize the Builder packet.

## Definition of a serious session

The participant must:

- inspect the synthetic source documents and reviewer pack;
- discuss a recent comparable workflow without revealing confidential details;
- describe their actual current workaround; and
- give concrete feedback on usefulness, trust, total review burden, and adoption friction.

A product pitch, casual conversation, or expression of general interest does not count.
