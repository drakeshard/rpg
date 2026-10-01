# Contributing

## Workflow

1. Branch from current `main`.
2. Keep one implementation issue to one focused branch and pull request by default; tightly coupled quality issues may be batched when the resulting change remains reviewable.
3. Run `pnpm verify` before requesting review.
4. Resolve required CI failures and review comments before merge.
5. Use squash merging.

Direct implementation changes to `main` are not part of the normal workflow.

## Verification

`pnpm verify` is the local deterministic equivalent of the required Quality CI gates. It covers:

- Biome formatting/lint validation;
- architecture boundaries;
- package/incubation invariants;
- strict source typechecking;
- strict test typechecking;
- unit tests;
- TypeScript build;
- generated `dist` package-shape validation.

Dependency Review remains a required GitHub check in addition to the local deterministic gates.

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

Gameplay incubation modules are not stable/public merely because they exist under `src`. The root export and package entry metadata remain protected by repository guards until controlled admission occurs.

## Dependencies

New dependencies must comply with `docs/policies/dependencies.md`. Runtime dependencies remain zero unless explicitly admitted.
