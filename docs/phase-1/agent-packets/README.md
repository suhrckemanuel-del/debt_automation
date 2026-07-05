# Bounded Agent Packets

These packets define discrete work units. They are instructions, not authorization to run all work in parallel.

## Packet order

```text
Demand Research ─┐
Synthetic Docs ──┼─> Reviewer Pack ─> Trust Review ─> Phase -1 sessions
Gold Benchmark ──┘                         │
                                          └─> Contrarian Review

Phase -1 PROCEED/ADAPT decision ─> Builder
```

## Shared rules

- Use synthetic data only.
- Do not request or retain real documents, entity names, deal terms, or non-public information.
- Separate observations from inferences.
- Return completion evidence, including known weaknesses.
- Stop when a packet's stop condition is reached.
- A packet is complete only when its expected output and evidence exist.
- The Builder packet remains blocked until the signed Phase -1 decision authorizes a scope.

## Packets

1. [`01-demand-researcher.md`](01-demand-researcher.md)
2. [`02-synthetic-document-creator.md`](02-synthetic-document-creator.md)
3. [`03-gold-benchmark-owner.md`](03-gold-benchmark-owner.md)
4. [`04-reviewer-pack-designer.md`](04-reviewer-pack-designer.md)
5. [`05-trust-reviewer.md`](05-trust-reviewer.md)
6. [`06-contrarian-reviewer.md`](06-contrarian-reviewer.md)
7. [`07-builder.md`](07-builder.md)

Shared schemas and source documents must have one owner at a time. Parallel work is appropriate only when file ownership does not overlap.
