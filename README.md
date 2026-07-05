# F-001 Agreement Intelligence

Local v0 and validation materials for a source-backed agreement-intelligence workflow.

The tracked repository uses synthetic data. The pilot can import approved local documents into Git-ignored workspaces; it is not a production legal system.

## Product question

Can a small local system establish the current contractual position from an agreement, amendment, and waiver while returning exact evidence, missing-information flags, and explicit judgment boundaries?

## Scenario

All materials concern the fictional Facility A and are evaluated as of **2 July 2026**, unless a question states otherwise.

The minimum synthetic document set is:

1. Facility Agreement
2. Amendment Letter No. 1
3. Waiver Letter

The three workflow questions test:

1. Current truth across an agreement, amendment, and waiver
2. Defined-term and clause cross-references
3. The boundary between source extraction and legal judgment

## Start here

1. Double-click `setup.bat` once.
2. Double-click `start_app.bat` to open the browser interface.
3. Create or select a pilot workspace, import the three document roles, and open
   **Configure provisions** to complete the guided mapping.
4. Follow the [friend pilot guide](docs/pilot_guide.md).

Command-line help:

```powershell
python app.py --help
```

## Persistence-first web foundation

The existing Python interface remains available. A separate Next.js product
shell and durable local synthetic persistence adapter now live in
[`apps/web`](apps/web/README.md). From that directory:

```powershell
npm install
npm run dev:synthetic
```

The hosted data model is versioned under [`supabase`](supabase/README.md) but is
not deployed. No cloud credentials or real agreements are part of this
milestone.

`npm run demo:reset` (from `apps/web`, with the engine running) restores the
synthetic demonstration state deterministically; see
[`apps/web/README.md`](apps/web/README.md) for its safety guards.

## Product and quality documents

- Owner-directed build decision: [`docs/implementation/prototype_decision.md`](docs/implementation/prototype_decision.md)
- Architecture decisions: [`docs/implementation/architecture_decisions.md`](docs/implementation/architecture_decisions.md)
- Acceptance matrix: [`docs/quality/phase1_acceptance_matrix.md`](docs/quality/phase1_acceptance_matrix.md)
- Historical implementation backlog: [`docs/implementation/phase0_phase1_backlog.md`](docs/implementation/phase0_phase1_backlog.md)

## Earlier research artifacts

- Participant artifact: [`docs/phase-1/three_question_reviewer_pack.md`](docs/phase-1/three_question_reviewer_pack.md)
- Answer-free baseline task: [`docs/phase-1/baseline_task.md`](docs/phase-1/baseline_task.md)
- Participant invitation: [`docs/phase-1/participant_invitation.md`](docs/phase-1/participant_invitation.md)
- Recruitment plan: [`docs/phase-1/recruitment_plan.md`](docs/phase-1/recruitment_plan.md)
- P01 outreach brief: [`docs/phase-1/outreach/P01_brief.md`](docs/phase-1/outreach/P01_brief.md)
- Facilitator instructions: [`docs/phase-1/session_script.md`](docs/phase-1/session_script.md)
- Live scorecard: [`docs/phase-1/facilitator_scorecard.md`](docs/phase-1/facilitator_scorecard.md)
- Evidence capture: [`docs/phase-1/session_evidence_template.md`](docs/phase-1/session_evidence_template.md)
- Decision record: [`docs/phase-1/decision_record.md`](docs/phase-1/decision_record.md)
- Agent packets: [`docs/phase-1/agent-packets/README.md`](docs/phase-1/agent-packets/README.md)

## Validation

Run the application benchmark:

```powershell
python app.py benchmark
```

Run the Python tests:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

Run the current structural and evidence-state check:

```powershell
.\scripts\Test-Phase1.ps1
```

Run the validator regression test:

```powershell
.\tests\Test-Phase1.ps1
```

Verify all critical reviewer-pack quotations against their claimed source locator and page:

```powershell
.\scripts\Test-ReviewerPackCitations.ps1
```

Create a privacy-safe local record before a session:

```powershell
.\scripts\New-Phase1Session.ps1 -ParticipantId P01
```

The Phase -1 validator covers the earlier research workflow. The Python suite and application benchmark cover the working pilot.

## Safety boundary

- Every tracked document and entity in this repository is synthetic.
- Approved pilot documents must remain in local, Git-ignored workspaces and must never be committed.
- The reviewer pack supports retrieval and review. It does not provide legal, investment, tax, accounting, or regulatory advice.
- Full answers require a reviewed, source-valid provision map. Import alone enables evidence search, not contractual conclusions.
- Guided mapping is deterministic and local: it ranks candidate passages, but a human must select and confirm every source, exact quote, value, date, and document relationship.
