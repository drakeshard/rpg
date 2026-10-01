# Contributing

## Workflow

1. Branch from `main`.
2. Keep one implementation issue to one focused branch and pull request by default.
3. Run `pnpm verify` before requesting review.
4. Resolve required CI failures and review comments before merge.
5. Use squash merging.

Direct implementation changes to `main` are not part of the normal workflow.

## Architecture changes

A change that expands RPG's shared surface or dependency graph must document:

- the current consumer;
- the concrete RPG-domain problem;
- alternatives considered;
- why game-local ownership is insufficient or intentionally temporary;
- deterministic/state-compatibility implications;
- dependency/runtime/maintenance cost;
- the narrowest viable contract.

RPG must remain renderer-, UI-, browser-, and Tactical-independent by default. A Foundation dependency requires explicit architecture admission rather than convenience.

## Dependencies

New dependencies must comply with `docs/policies/dependencies.md`. Runtime dependencies begin at zero.
