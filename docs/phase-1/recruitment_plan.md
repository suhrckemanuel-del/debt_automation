# Phase -1 Recruitment Plan

**Sprint window:** 2–16 July 2026

**Decision date:** 16 July 2026

**Required outcome:** Five serious workflow-review sessions—not five expressions of interest.

## Participant mix

Recruit for workflow evidence rather than titles alone.

| ID | Target profile | Why included |
|---|---|---|
| P01 | Debt-capital practitioner who both prepares and reviews document answers | Best first test of combined analyst-plus-reviewer burden |
| P02 | Junior or mid-level analyst who regularly searches finance documents | Tests current workaround and analyst friction |
| P03 | Senior finance reviewer or transaction lead | Tests verification burden and decision readiness |
| P04 | Practitioner with amendment, waiver, or covenant-monitoring exposure | Tests current-truth relevance |
| P05 | Second reviewer or practitioner from a meaningfully different workflow context | Reduces dependence on one team's habits |

At least two completed sessions should involve people who regularly review another person's answers.

## Recruitment sequence

### Wave 1 — Anchor sessions

Target dates: 2–6 July

- Invite P01 first.
- Invite one analyst and one senior reviewer in parallel.
- Use two concrete scheduling options.
- Do not attach the completed reviewer pack before the session.

### Wave 2 — Fill evidence gaps

Target dates: 7–10 July

- Review the role mix of accepted sessions.
- Recruit specifically for missing reviewer or workflow perspectives.
- Include at least one person likely to be skeptical or satisfied with existing tools.

### Session completion

Target dates: 6–14 July

- Create each local record with `New-Phase1Session.ps1`.
- Run the same core protocol.
- Preserve negative evidence.
- Do not revise the decision criteria.

### Decision preparation

Target dates: 14–16 July

- Validate the evidence log.
- Complete the positive, adapt, and stop tables.
- Run the contrarian review against observed evidence.
- Make one written decision on 16 July: `PROCEED`, `ADAPT`, or `STOP`.

## Selection discipline

Prefer participants who:

- can describe a recent comparable task;
- directly prepare or review source-backed finance answers;
- will challenge the artifact rather than merely encourage the project; and
- can discuss workflow without sharing confidential details.

Do not select only:

- friends likely to be supportive;
- people interested in AI but unfamiliar with the workflow;
- participants from a single team or seniority level; or
- legal specialists who never experience the finance handoff.

## Funnel tracking

Track invitations in the local, Git-ignored `outreach_tracker.csv`.

Responses mean:

- `accepted`: session scheduled;
- `declined`: explicit no;
- `no_response`: no reply after one follow-up; or
- `not_relevant`: person says the workflow does not map to their role.

Acceptance is recruitment evidence, not demand evidence.

## Confidentiality boundary

- Send no source documents until the participant confirms the session.
- Share synthetic documents only.
- Store contact and calendar details outside this repository.
- Store only participant ID and broad role in the local tracker.
- Remove accidentally disclosed sensitive information immediately.
