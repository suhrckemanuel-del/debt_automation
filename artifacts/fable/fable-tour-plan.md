# F-001 Fable tour plan

Date: 5 July 2026
Status: narrative approved locally; capture pending (requires interactive Chrome with the Fable extension and the user's logged-in session).

Fable is a showcase layer over the real working product. Every step below shows
actual application behavior against the persisted synthetic Facility A corpus.
Nothing is simulated or retouched to hide missing functionality.

## Audience and intent

- First viewer: a trusted friend seeing the product for the first time.
- Later viewers: potential design partners who review agreements.
- Success: the viewer can explain, in under two minutes and without narration,
  what the product resolves, how evidence is shown, and where human judgment
  stays.

## Application state before capture

1. Stop any running app instance.
2. From `apps/web`, run the engine (`python ../../app.py api --port 8765` from
   the repo root, or leave `npm run dev:engine` for step 4).
3. Run `npm run demo:reset` (engine must be up). Expected output: 5 documents,
   15 passages, manifest v1, then three replayed answers —
   `supported · 3`, `source_not_found · 0`, `legal_review_required · 6`.
4. Build and start in production mode so no dev badge appears:
   `npm run build:synthetic` then `npm run start:synthetic`.
5. Spot-check: `/dashboard` shows "Amendment controls; waiver remains limited";
   `/ask` lists the three canonical answers; `/provision-map` shows 10/10.

## Tour steps, guide copy, and hotspots

Every guide is one idea, one or two sentences, no legal conclusion, no claim of
demand or real usage. Amber is reserved for the review-sensitive waiver step.
Keep each guide card placed away from the evidence text it discusses.

| # | Screen / state | Hotspot target | Guide copy (exact) |
|---|---|---|---|
| 1 | `/dashboard` (as of 2026-07-02) | The page headline "Can we rely on the current contractual position?" | "Three synthetic documents give three plausible numbers: 65%, 70%, and 72%. This dashboard answers which one controls on a chosen date." |
| 2 | Same | "Current status" block | "As of 2 July 2026 the amendment controls: the threshold is 70.0%. The 72.0% figure is one-date relief, not the covenant." |
| 3 | Same | "What changed" list | "Original threshold, temporary amendment, and narrow waiver stay separate facts — each with its own source link." |
| 4 | Same | "Why it matters" panel | "Calling the waiver a 72% covenant would misstate the terms, and a separate no-Distribution condition runs to 30 September 2026." |
| 5 | Click "Inspect exact waiver passage" → `/documents/doc_waiver_001#doc_waiver_001:section-3` | The highlighted Section 3 passage | "Every citation lands on the exact persisted passage — document, section, page, and stored text." |
| 6 | Navigate to `/provision-map` | The "Limited waiver" slot card | "Nine reviewed slots anchor each provision to its exact source passage. Until a mapping like this is reviewed and activated, no answer can be saved at all." |
| 7 | Back to `/dashboard?asOf=2027-01-02` | The date selector, then status | "Move the review date past the amendment's end and the original 65.0% threshold resumes. The hierarchy is resolved per date, not guessed." |
| 8 | `/ask` with the saved "debt yield covenant" answer open | The "Source not found" alert | "Ask something the documents don't support and the engine abstains with 'Source not found' — zero invented citations." |
| 9 | `/ask` with the "sell part of the asset" answer open | The "Human review required" alert, then closing CTA | "Extraction and currentness are automated; legal interpretation stays with a human reviewer. What would you still need to verify before relying on this?" |

Step 9's final CTA text field (Fable end-of-demo module): title
"Would this make a first-pass review clearer?" body "This is a local synthetic
v0. Reply with what you'd still need to verify — that's the feedback that
matters." No lead form.

## Capture sequence (one continuous extension recording)

1. Start on `/dashboard`.
2. Click "Inspect exact waiver passage" (recommendation button).
3. From the document page, click nav "Provision Map".
4. Click nav "Dashboard", then the `2027-01-02` date button.
5. Click nav "Ask", open the debt-yield answer from "Recent answers".
6. Open the asset-sale answer.
7. Stop recording.

Expected raw capture: 7 screens. Delete any loading or duplicate frames.
Reorder is not expected to be necessary.

## Editing checklist

- [ ] Replace all auto-generated guide text with the exact copy above.
- [ ] One hotspot per step, sized to the stated target, emerald accent
      (product primary), amber only on step 4/5 waiver emphasis.
- [ ] Remove accidental clicks, empty steps, loading states.
- [ ] No novelty effects, blur, or animated attention-grabbers.
- [ ] Verify guide cards do not cover cited passages or numbers.
- [ ] Confirm exact figures: 65.0%, 70.0%, 72.0%, 30 June 2026, 31 December
      2026, 30 September 2026, 2 July 2026.
- [ ] Confirm "SYNTHETIC" / local-v0 labels remain visible in captures.
- [ ] Preview the full flow on a laptop width and Fable's responsive/mobile
      preview if available.

## Publication checklist

- [ ] Publish as unlisted share link only; no CRM, no lead form, no public
      listing.
- [ ] Open the share link in a fresh browser profile (logged out) and click
      through all 9 steps.
- [ ] Confirm analytics are enabled for view counts only; record zero-state,
      never fabricate viewer data.
- [ ] Screenshot the published tour (first step + one mid step + CTA) into
      `artifacts/fable/`.
- [ ] Record the share URL, title, description, creation date, and app state
      in `artifacts/fable/fable-demo.md`.
- [ ] Verify no account email, workspace billing data, or tokens are visible
      in any screenshot.

## Recovery instructions

- Capture interrupted: stop the recording, delete the draft in Fable, re-run
  `npm run demo:reset`, restart `npm run start:synthetic`, capture again.
- Wrong application state mid-capture (e.g. wrong date selected): finish the
  recording anyway, then delete the wrong frames in the editor, or recapture —
  the reset makes state reproducible in under a minute.
- Engine died during capture: the dashboard fails closed (that state is
  honest but not the planned step); restart the engine and recapture.

## Feedback questions to send with the link

1. In one sentence, what does this product do?
2. Which number controls today, and why is 72% not the answer?
3. What would you still need to verify before relying on this in a real
   review?
4. Where did you want to click that didn't respond?
5. What's missing before this would matter in your (or a colleague's) actual
   agreement-review workflow?

Questions seek comprehension and workflow evidence. A friendly "looks great"
is presentation feedback only — see
`artifacts/fable/post-feedback-decision-framework.md`.

## Fable capability notes (from official docs)

- The Chrome extension performs full HTML/DOM capture of any browser-based
  application and auto-stitches steps from your actions —
  https://help.sharefable.com/Capturing-Demos/Overview,
  https://help.sharefable.com/Introduction/Fable-Chrome-Extension,
  https://help.sharefable.com/Capturing-Demos/Using-the-Extension
- Captured HTML is editable after the fact (on-screen edits) —
  https://help.sharefable.com/Editing-Demos/On-Screen-Edits

## Adversarial review record (pre-capture)

Reviewed 5 July 2026 against the milestone's critical-review questions.
Finding and revision:

- Step 6 originally claimed the engine "can only cite what was reviewed
  here". Citation validation enforces exact persisted passages, not reviewed
  slots specifically, so the claim overstated the mechanism. Revised to the
  provable statement that answer persistence is blocked without an activated
  reviewed mapping (`saveAnswer` requires an active manifest).
- All other guide claims trace to enforced behavior: exact-passage citation
  validation (steps 3, 5), date-resolved hierarchy from the deterministic
  engine (steps 2, 7), zero-citation abstention (step 8), and the
  human-review boundary flag persisted on the answer (step 9).
- The CTA asks for verification gaps, not endorsement; no demand-validation
  or real-usage claim appears anywhere in the copy.

A second review pass is required on the actual captured tour (pacing, hotspot
placement, obscured text) before the share link is treated as final.

Only synthetic Facility A data appears in this plan. No real agreements,
entities, deal terms, credentials, or usage claims.
