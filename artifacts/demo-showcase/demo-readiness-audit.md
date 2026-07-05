# F-001 demo readiness audit

Date: 5 July 2026  
Scope: owner-authorized local synthetic v0 only

## Demo-ready definition

The demo is ready when a first-time reviewer can follow one decision from
problem to current position, see why original terms, amendments, and a limited
waiver cannot be collapsed into one number, inspect exact evidence, ask a
follow-up question, and recognize every human-review or missing-support
boundary without needing an architecture explanation.

The product must also:

- render the four modeled date states without browser-side hierarchy logic;
- keep status, changes, implications, recommended action, timeline, and
  evidence mutually consistent;
- persist supported, abstained, and legal-review-required answers across
  refresh and process restart;
- fail closed when the deterministic engine or required mappings are absent;
- provide working desktop and mobile navigation;
- avoid dead controls and unsupported future-product claims; and
- preserve the previous dashboard at `/dashboard-legacy`.

## Journey audit and disposition

| Journey area | Audit result | Resolution |
| --- | --- | --- |
| Dashboard date states | All four states resolved correctly, but the selector overflowed at 1280 px and on mobile. | Replaced the horizontal strip with a responsive two/four-column grid. |
| Status, changes, implications, action | Copy matched the engine facts. Recommendation links landed on metadata rather than the cited passage. | Changes and recommendations now deep-link to exact evidence; the recommended passage is expanded by default. |
| Contract timeline | Original, amendment, waiver, and temporary distribution condition remained distinct on desktop and mobile. | Added a stable timeline anchor for showcase capture. |
| Evidence disclosures | Exact persisted passages were present and source-validated. | Added stable passage anchors and renamed metadata links so they do not imply access to unshown file bytes. |
| Ask: supported answer | Returned 70.0% as the current threshold, 72.0% as limited Test Date relief, and three exact citations. | Retained. |
| Ask: unsupported answer | Returned `Source not found.` with zero citations. | Retained. |
| Ask: transaction-permission question | Returned no final yes/no conclusion, required human review, and six citations. | Retained. |
| Ask contract label | UI said API v1.0 while the enforced contract is v1.1.0. | Bound the badge to `ENGINE_CONTRACT_VERSION`. |
| Workspaces | Two disabled controls suggested functionality that is outside scope. | Removed dead controls and added one working “Open decision view” action. |
| Documents | Future hosted-storage wording distracted from the local v0 and source links only exposed metadata. | Reframed the page as tracked synthetic metadata and clarified that exact passages live with determinations. |
| Provision Map | 10/10 reviewed slots, atomic activation, and append-only history matched persistence. | The added slot is the synthetic LTV formula definition. |
| Activity | Answer and workspace mutations appeared newest-first. | No change required. |
| Settings | Save worked but provided no visible completion state. | Added pending, success, and validation-error feedback. |
| Mobile navigation | Menu opened, but stayed over the destination after selecting a route. | Made the sheet controlled and close it on navigation. |
| Refresh persistence | Saved legal-review answer remained present with six citations. | Passed. |
| Backend restart persistence | Answers and workspace name survived web restart; dashboard recovered when the engine returned. | Passed. |
| Engine unavailable | No threshold or evidence was shown; explicit retry guidance appeared. | Passed. |
| Missing mapping support | No threshold or evidence was shown; five required mapping gaps were listed. | Passed using a temporary ignored synthetic workspace and database copy. |
| Previous design | `/dashboard-legacy` remained available and marked as the Dashboard route. | Preserved. |

## Important audit evidence

- Current review: amendment controls at 70.0%; 72.0% relief is limited to the
  30 June 2026 Test Date; the no-Distribution condition runs through
  30 September 2026.
- Before amendment: original 65.0% covenant controls.
- After waiver block: 70.0% amendment remains active and the separate
  distribution condition has ended.
- After amendment: temporary 70.0% amendment has expired and the original
  65.0% threshold resumes.
- Engine unavailable and missing-support states showed neither a contractual
  threshold nor evidence.

## Assumptions and unresolved risks

- Browser verification covers the modeled synthetic workflow, not arbitrary
  documents or agreement drafting styles.
- The dashboard is a decision surface for one named workflow, not evidence of
  broad market demand or production readiness.
- Original file bytes are not rendered in the Next.js document view; exact
  normalized passages are shown with each decision and saved answer.
- A polished demo cannot substitute for observed design-partner use or measured
  reduction in review burden.

No real agreements, entity names, deal terms, credentials, or non-public
information were introduced.
