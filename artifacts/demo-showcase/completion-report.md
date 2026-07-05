# F-001 demo completion report

Date: 2026-07-05  
Scope: owner-directed local synthetic v0

## Outcome

The demo journey is complete for the authorized design-partner workflow. The product now presents the controlling contractual position by date, separates amendments from limited waivers, exposes exact evidence, persists determinations, abstains on missing support, and preserves legal and commercial judgment as human responsibilities.

This is not broader demand validation. The demand gate remains incomplete at 0 of 5 serious sessions.

## Product work completed

- Closed the mobile navigation after route selection.
- Made the four-date selector responsive without horizontal overflow.
- Linked recommendations and change summaries to the exact expanded evidence passage.
- Corrected the Ask contract badge to engine API v1.1.0.
- Added visible Settings save, validation, pending, and success states.
- Removed misleading disabled workspace controls and added a working decision-view action.
- Clarified local synthetic document and workspace copy.
- Preserved the previous dashboard at `/dashboard-legacy`.

Product files changed:

- `apps/web/src/components/app-navigation.tsx`
- `apps/web/src/components/contract-position-timeline.tsx`
- `apps/web/src/components/workspace-name-form.tsx`
- `apps/web/src/app/(product)/dashboard/page.tsx`
- `apps/web/src/app/(product)/ask/page.tsx`
- `apps/web/src/app/(product)/documents/page.tsx`
- `apps/web/src/app/(product)/workspaces/page.tsx`
- `apps/web/src/app/(product)/settings/actions.ts`
- `apps/web/src/app/(product)/settings/page.tsx`
- `apps/web/src/lib/decision-surface.ts`

## Demo and media outputs

- `f001-teaser.mp4` - 39.061 seconds, 1920x1080, 30 fps, H.264/AAC.
- `f001-full-walkthrough.mp4` - 95.552 seconds, 1920x1080, 30 fps, H.264/AAC.
- `story-script-storyboard.md` - story, script, shot list, and narration plan.
- `research-and-showcase-plan.md` - source-backed showcase strategy.
- `demo-readiness-audit.md` - journey audit and acceptance definition.
- `editorial/teaser/report.md` and `editorial/full/report.md` - frame-led editorial reviews.
- `remotion/` - reproducible Remotion source and pinned dependencies.

Editorial iteration: the first full render exposed competing captions during a dissolve. Caption exit timing was moved ahead of each transition, both cuts were re-rendered, and final editorial frames were refreshed from the corrected files.

## Representative behavior

- 2026-04-01: original 65.0% covenant controls.
- 2026-07-02: amendment controls at 70.0%; 72.0% is limited to the 30 June 2026 Test Date; a separate distribution condition is active.
- 2026-10-01: amendment still controls; the distribution condition has ended.
- 2027-01-02: the original 65.0% threshold resumes.
- Supported Ask result: 70.0% current threshold with 72.0% limited relief kept separate and three exact citations.
- Unsupported Ask result: `Source not found.` with zero citations.
- Judgment question: `legal review required` with supporting evidence and an explicit human boundary.
- Engine-unavailable and missing-evidence states fail closed without displaying a contractual conclusion.

## Checks run

- Web persistence tests: 6 passed, 0 failed.
- ESLint: passed.
- TypeScript `tsc --noEmit`: passed.
- Synthetic Next.js production build: passed; 10 routes compiled.
- Python unit and integration tests: 35 passed, 0 failed.
- Deterministic benchmark: 13/13 passed (100%).
- Reviewer-pack citation validation: 17/17 passed, 0 errors.
- Phase structural validation: 0 structural errors, 0 warnings, 0 broken links, 0 baseline leaks.
- Phase validator tests: 16 assertions passed.
- Remotion ESLint and TypeScript: passed.
- Remotion dependency audit: 0 vulnerabilities after updating the ESLint dev dependency.
- `ffprobe`: both final videos are valid 1920x1080 H.264 files with AAC streams.
- Browser verification: desktop 1440x900 and mobile 390x844 captures passed visual review.

The phase script exited successfully while correctly reporting `decision_review_ready: False` and `Demand gate is not ready: 0 of 5 serious sessions are present.`

## Assumptions and unresolved risks

- The videos use embedded on-screen narration and a written voiceover plan; they intentionally contain no generated spoken voice.
- The Windows Media Player first-run window could not be captured by the Computer Use helper (`SetIsBorderRequired failed: No such interface supported`). Playback integrity was instead checked through `ffprobe`, complete frame review, transition spot checks, and final browser-independent image extraction.
- The repository has no initial commit and appears entirely untracked, so no commit-relative diff can distinguish historical baseline files from this slice.
- Design-partner comprehension and trust still require real sessions; no participant response is inferred or fabricated here.

## Independent re-verification (second pass, 2026-07-05)

A follow-up session re-verified every claim above from a cold start:

- Python 35/35; benchmark 13/13; reviewer-pack citations 17/17 with 0 errors; phase validator 16 assertions; structural check 0 errors/warnings with the demand gate correctly reported not ready (0 of 5 sessions).
- Web persistence 6/6; ESLint and `tsc --noEmit` clean; synthetic production build compiled all 10 routes.
- Live journey over HTTP: all product routes returned 200; the four `?asOf=` date states resolved to 65.0% / 70.0% amendment-controls / distribution-block-ended / 65.0%-resumes; the Ask page rendered persisted supported, `source not found`, and `legal review required` answers.
- Fail-closed: with the engine process stopped, the dashboard showed `engine unavailable` with retry guidance and rendered no threshold or evidence, while persisted answers remained readable. A full stack restart restored the 70.0% controlling position with all saved answers intact.
- `ffprobe` re-confirmed both videos (39.06 s and 95.55 s, 1920x1080, 30 fps, H.264/AAC); hero and closing frames were re-reviewed for legibility, factual accuracy, and the human-review boundary.
- Gap closed: `.gitignore` now excludes `artifacts/demo-showcase/remotion/node_modules/` and `remotion/out/` so a future initial commit cannot capture video build dependencies.

## Data confirmation

Only the repository's synthetic facility, amendment, waiver, dates, thresholds, passages, and generated UI captures were used. No real agreement, entity name, deal term, credential, or non-public information was introduced.
