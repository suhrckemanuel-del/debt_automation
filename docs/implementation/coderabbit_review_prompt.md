# CodeRabbit review-loop prompt (F-002 / F-002.1)

Reusable prompt for driving an external review pass and closing the loop.
Update the commit hash and "previous findings" section each cycle, then paste
the prompt below into the session that runs CodeRabbit.

---

## Prompt

You are running one adversarial review cycle with CodeRabbit on this
repository and closing the loop on its findings.

Repository: `C:\Users\User\Documents\debt automation`
Branch: `codex/financial-modeling-foundation`
Review target: everything from `8a943d4` through `47a5c82` (the F-002
covenant calculator plus the F-002.1 Excel verification pack and its
review fixes).

### Context you must load before judging anything

1. `AGENTS.md` — binding repository rules.
2. `docs/implementation/excel_verification_pack_decision.md` — authorized
   scope and trust boundaries for the verification pack.
3. `docs/implementation/excel_verification_pack_pdr.md` — the binding design.
4. `docs/implementation/financial_model_foundation.md` — the F-002 baseline.

A finding that asks the code to violate these documents is itself invalid.

### Previous findings already fixed (verify closure, do not re-litigate)

Commit `47a5c82` addressed five findings:

1. Workbook endpoint now recomputes the live model and rejects tampered
   source or calculation inputs (`src/agreement_intelligence/api.py`).
2. Regression test for valid citations with tampered numeric inputs
   (`tests/test_engine_api.py`).
3. `/models` status card derives title, icon, tone, and threshold text from
   actual arithmetic status (`apps/web/src/app/(product)/models/page.tsx`).
4. Base64 download flow hardened with a decode guard and deferred object-URL
   cleanup (`apps/web/src/components/verification-pack-download-form.tsx`).
5. PDR headroom format and waiver-ceiling test wording corrected.

For each, confirm the fix is present and sufficient, or state precisely why
it is not, with file, line, and a concrete failure scenario.

### Review priorities, in order

1. **Trust invariants** — these outrank style and performance:
   - The 72.0% waiver range must never appear in any threshold-labelled
     field, cell, or message.
   - Every abstention or verification-failure path must fail closed: no
     workbook bytes, no partial state, no persisted artifact.
   - Engine Decimal values are authoritative everywhere; Excel recomputation
     is presented only as a cross-check.
   - The workbook must stay macro-free with no external links.
   - Identical payload + identical `generated_at` must produce byte-identical
     files.
   - No compliance, breach, default, or waiver-satisfaction conclusion
     anywhere in code, UI copy, or workbook text.
2. **Endpoint hardening** — `_verify_workbook_payload` in `api.py`: find an
   input that passes verification but produces a misleading workbook, or a
   payload shape that crashes the handler instead of returning a typed 400.
3. **Client download flow** — memory leaks, double-download on re-render,
   unsafe filename handling, error states that strand the reviewer.
4. **Test gaps** — an invariant above with no test pinning it is a finding.
5. Ordinary correctness, simplification, and efficiency issues last.

### Constraints on your findings

- Verify against the actual code before reporting; no speculative findings.
- Every finding needs: severity, file and line, one-sentence defect
  statement, and a concrete inputs-to-wrong-output failure scenario.
- Do not propose scope expansions: no LLM features, no cloud services, no
  spreadsheet import, no new dependencies, no real-data handling. Those are
  governance decisions, not review findings.
- Do not weaken a test or gold expectation to make code pass.
- Synthetic data only in any reproduction you construct.

### If you apply fixes

- Smallest change that resolves the finding; match surrounding style.
- After all fixes, rerun and record exact results:
  - `python -m unittest discover -s tests -p "test_*.py"` (repo root)
  - `python app.py benchmark` (repo root)
  - `npm test`, `npx eslint .`, `npx tsc --noEmit`, and
    `npm run build:synthetic` (all from `apps/web`, never the repo root)
- Do not commit; leave changes in the working tree and report them.

### Required output

1. Closure verdict per previous finding: CLOSED or REOPENED (with evidence).
2. New findings, most severe first, in the format above — or an explicit
   statement that none were found.
3. Exact commands run and their results.
4. Confirmation that no confidential data, new dependencies, or scope
   expansions were introduced.
