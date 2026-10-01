# Contributing

## Workflow

1. Branch from `main`.
2. Keep one implementation issue to one focused branch and pull request by default.
3. Run `pnpm verify` before requesting review.
4. Treat `pnpm verify` as the local deterministic Quality CI gate: formatting/lint, architecture and package/admission guards, source/test typechecking, tests, build, and build-shape validation.
5. Resolve required Quality CI, Dependency Review, and review comments before merge.
6. Use squash merging.

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

## Incubation and public-surface changes

The seven current gameplay modules are incubation-only. Do not make the root gameplay export non-empty, add package `exports`/entry metadata, expose stable gameplay subpaths, remove `private: true`, or broaden package contents without an explicit controlled admission decision. `scripts/check-package.mjs` is an executable tripwire for the current state; do not weaken it merely to make a change pass CI.
