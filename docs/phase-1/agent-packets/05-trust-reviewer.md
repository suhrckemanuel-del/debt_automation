# Packet 05 — Trust Reviewer

## Input context

- Synthetic corpus
- Reviewer pack
- Session and evidence templates
- Confidentiality and legal-boundary rules

## Exact task

Try to falsify the reviewer pack's trustworthiness and identify hallucination, citation, currentness, cross-reference, confidentiality, and legal-boundary failures.

## In scope

- Claim-to-source verification
- Amendment/waiver timeline review
- Missing-source and missing-fact checks
- Overclaim and false-certainty detection
- Reviewer-burden risks

## Out of scope

- Rewriting the product proposition
- Adding features
- Declaring legal permissibility

## Owned files

- Future output: `docs/phase-1/trust_review.md`

## Expected output and acceptance criteria

- Findings classified as material, moderate, or minor
- Each finding cites the pack claim and relevant source
- False positives and unresolved questions are labelled
- Review explicitly tests whether question 3 accidentally implies a yes/no

## Completion evidence

- Claim coverage count
- Citation match results
- Timeline check
- List of trust failures that would block participant sessions

## Stop and escalate when

- A material unsupported claim is found
- A citation does not match source text
- The current-document hierarchy is ambiguous
- Confidential information appears

## Do not

- Quietly fix findings without recording them
- Downgrade a material issue because the intended answer seems obvious
- confuse cautious extraction with legal advice
