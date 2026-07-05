# Session Records

Store one completed, de-identified evidence record per serious session in this folder:

```text
session-P01.md
session-P02.md
session-P03.md
session-P04.md
session-P05.md
```

Create each record from `../session_evidence_template.md`.

## Privacy rules

- Use participant IDs only.
- Do not store names, employers, email addresses, transaction names, borrower/lender names, or real document terms.
- Paraphrase examples at a generic workflow level.
- If sensitive information is accidentally captured, remove it immediately.
- Scheduling and contact details belong outside this repository.
- Populated `session-P*.md` files are ignored by Git by default.

## Evidence rules

- Observation and inference must be separate.
- A session that fails the serious-session checklist must be labelled and excluded from the five-session count.
- Negative evidence must be retained.
- Do not edit prior session records to make aggregate results look cleaner.
