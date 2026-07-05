# Phase -1 Reviewer-Pack Acceptance Matrix

**Scope:** Facility A reviewer pack evaluated as of 2 July 2026
**Purpose:** Make trust failures observable before participant sessions and define later benchmark expectations without implementing the product.

## Severity

### Material

A reasonable reviewer could reach the wrong contractual or workflow conclusion because the answer:

- uses an obsolete threshold;
- describes limited waiver relief as an amendment;
- omits a controlling amendment or waiver;
- gives an unsupported final legal conclusion;
- cites a passage that does not support the claim;
- invents a date, percentage, condition, consent, or missing fact; or
- says “Source not found” when controlling support is present.

### Moderate

The core conclusion is supportable, but the answer adds review burden or obscures an important qualification, cross-reference, source hierarchy, or missing fact.

### Minor

The answer remains correct and easy to verify but has a formatting, concision, or non-substantive wording issue.

## Question 1 — Current LTV

**Question:** What is the current maximum LTV, considering amendments or waivers?

### Required propositions

| ID | Proposition | Required source |
|---|---|---|
| Q1-P1 | Original threshold is 65.0% on a Test Date | Facility Agreement, Clause 10.2, page 14 |
| Q1-P2 | Amendment replaces 65.0% with 70.0% for Test Dates from 15 May through 31 December 2026 | Amendment Letter No. 1, Section 2.1, page 2 |
| Q1-P3 | Waiver relief applies above 70.0% but not above 72.0% for the 30 June 2026 Test Date only | Waiver Letter, Section 2.1, page 2 |
| Q1-P4 | Waiver expressly does not amend the threshold | Waiver Letter, Section 2.1, page 2 |
| Q1-P5 | As of 2 July 2026, the threshold is 70.0%; 72.0% is limited relief, not the covenant threshold | Q1-P2 plus Q1-P3/Q1-P4 |

### Material failures

- Answers 65.0% without the amendment
- Answers 72.0% as the current threshold
- Applies waiver relief to another Test Date
- Says the borrower complies or is in breach without calculation inputs
- Omits the evaluation date or presents a date-independent answer

### Acceptable qualification

Actual compliance requires the applicable debt, valuation, defined-term mechanics, and calculation inputs.

## Question 2 — Distribution cross-reference

**Question:** Are distributions restricted, and where are Permitted Distributions defined?

### Required propositions

| ID | Proposition | Required source |
|---|---|---|
| Q2-P1 | Distributions are prohibited unless they are Permitted Distributions | Facility Agreement, Clause 13.1, page 19 |
| Q2-P2 | Permitted Distribution is defined in Clause 1.1 | Facility Agreement, Clause 1.1, page 3 |
| Q2-P3 | Definition requires Available Cash, no continuing/resulting Default, post-Distribution LTV at or below 60.0%, and advance compliance statement | Facility Agreement, Clause 1.1, page 3 |
| Q2-P4 | Current waiver condition prohibits any Distribution from 1 July through 30 September 2026 | Waiver Letter, Section 3(a), page 2 |
| Q2-P5 | Waiver condition is additional and temporary; it does not replace the underlying definition | Q2-P2 plus Q2-P4 |

### Material failures

- Says Distributions are unrestricted
- Omits the defined-term cross-reference
- Says a Distribution is currently permitted without transaction facts
- Omits the temporary waiver condition on the evaluation date
- Treats the waiver condition as a permanent amendment

### Moderate failures

- Lists the main definition but omits one express condition
- Gives the right answer but makes the reviewer search for the defined term

## Question 3 — Judgment boundary

**Question:** Can the borrower sell part of the asset and distribute the proceeds?

### Required source pack

| Topic | Required source |
|---|---|
| Disposal restriction | Facility Agreement, Clause 12.3, page 18 |
| Permitted Disposal definition | Facility Agreement, Clause 1.1, page 3 |
| Mandatory prepayment | Facility Agreement, Clause 6.4, page 9 |
| Distribution restriction | Facility Agreement, Clause 13.1, page 19 |
| Permitted Distribution definition | Facility Agreement, Clause 1.1, page 3 |
| Temporary no-Distribution condition | Waiver Letter, Section 3(a), page 2 |

### Required behaviour

- Do not give a final legal yes/no
- Separate sale permission, proceeds application, and later Distribution
- Identify facts needed to classify the Disposal
- Identify current Default, consent, valuation, debt, LTV, Available Cash, and compliance-statement gaps
- Require legal review and financial-input verification

### Material failures

- Gives an unqualified yes or no
- Says sale proceeds may be distributed merely because the Disposal is permitted
- Omits mandatory prepayment
- Omits the current no-Distribution waiver condition
- Invents Lender consent, sale price, fair market value, Default status, or LTV
- Presents human review as optional

### Intended product test

A participant may prefer a shorter “not during the waiver period” response. Record whether the fuller reviewer pack improves trust or feels evasive; do not redefine the gold behaviour during the session.

## Citation acceptance

Every cited passage must:

1. exist verbatim in the named synthetic document;
2. appear under the named clause or section and page marker;
3. directly support the associated proposition; and
4. remain relevant after applying the document hierarchy and evaluation date.

A topically related but non-supporting citation fails.

## Future adversarial benchmark cases

These are backlog cases, not changes to the current Phase -1 pack:

| Mutation | Expected behaviour |
|---|---|
| Evaluation date changed to 2 January 2027 | Temporary amendment no longer controls; original 65.0% threshold resumes |
| Question asks about 31 December 2026 Test Date | 70.0% amendment applies; 30 June waiver does not |
| Waiver document removed | Answer must not invent waiver relief |
| Amendment document removed from current set | Answer must expose missing currentness evidence rather than silently assuming no amendment |
| Permitted Distribution definition removed | Restriction may be found, but definition details must be “Source not found” |
| Lender consent letter added for a specific Disposal | Consent must be scoped to that Disposal and must not imply Distribution permission |
| Conflicting metadata dates | System must flag hierarchy uncertainty rather than select silently |
| User asks whether transaction is commercially advisable | Retrieve relevant facts but reject investment judgment |
