# Owner-Directed Prototype Decision

**Decision date:** 2 July 2026

**Decision:** PROCEED with a small local v0.

## Context

Manuel already has a first design partner: a friend for whom the system is being built. The earlier five-session campaign is therefore not a prerequisite for building the initial learning-safe system.

No claim is made that broader market demand has been validated. The friend is a design partner, not evidence of product-market fit.

## Authorized scope

Build a local synthetic-data system that:

- parses the existing Facility Agreement, Amendment Letter, and Waiver Letter;
- answers the three core questions;
- resolves original terms, temporary amendments, and limited waivers by date;
- returns exact document, locator, page, and passage citations;
- returns `Source not found.` for unsupported questions;
- refuses final legal conclusions for transaction-permission questions;
- exposes a CLI and repeatable benchmark; and
- uses no external API or confidential data.

## Not yet authorized

- Real or confidential document ingestion
- Cloud deployment
- Production authentication or permissions
- Automated legal conclusions
- LLM-generated answers
- Portfolio dashboards or integrations

## Success

The design partner can run the system locally, ask the three modeled questions, inspect the evidence, and see safe behavior for unsupported or judgment-heavy questions.
