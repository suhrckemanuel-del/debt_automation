# F-001 Fable demo record

## Status: NOT YET CREATED

The Fable interactive demo has not been created. This session had no
interactive Chrome/Computer-Use capability, so the external capture step is
paused per the milestone's authentication-handling rule. Everything local is
ready:

- Application slice complete and verified (see repository PR).
- Deterministic state: `npm run demo:reset` restores the exact capture state.
- Narrative, guide copy, hotspots, capture/editing/publication checklists:
  `artifacts/fable/fable-tour-plan.md`.

## What the user needs to do (or a follow-up session with Chrome control)

1. Install/log in to the Fable Chrome extension (do not paste credentials
   into any chat).
2. Follow "Application state before capture" and "Capture sequence" in
   `fable-tour-plan.md`.
3. Edit guides to the exact copy in the plan; publish unlisted.
4. Fill in the record below and take the screenshots listed in the
   publication checklist.

## Record (fill in after publication)

- Share URL: _pending_
- Tour title: `F-001 Agreement Intelligence — synthetic walkthrough`
- Description: `Which covenant number controls today? A source-backed answer
  over a synthetic agreement set. Local v0; legal judgment stays human.`
- Created: _pending_
- Fable workspace/project: _pending (omit if it exposes account details)_
- App state used: production `npm run start:synthetic` after
  `npm run demo:reset`; engine API v1.2.0; manifest v1; 5 documents,
  15 passages, 3 saved answers (supported ×1, source_not_found ×1,
  legal_review_required ×1).
- Screenshots: _pending_
- Known limitations: _pending review after capture_

## Manual update instructions

To refresh the demo after product changes: re-run the reset, recapture the
7-screen sequence, and re-apply the guide copy — do not hand-edit captured
HTML to show states the product cannot produce.

No authentication tokens, cookies, or private Fable account information may
be stored in this file.
