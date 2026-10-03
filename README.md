# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository hosts reusable RPG-domain state mechanisms. It is not a universal game engine,
Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, active ability execution, combat, quests, inventory
possession, AI, presentation, and cross-domain policy remain owned by consuming games.

## v0.1 selected public API

The pre-1.0 API selected for `@drakeshard/rpg@0.1.0` is:

- `@drakeshard/rpg/advancement`
- `@drakeshard/rpg/attributes`
- `@drakeshard/rpg/capabilities`
- `@drakeshard/rpg/loadout`
- `@drakeshard/rpg/resources`
- `@drakeshard/rpg/roles`
- `@drakeshard/rpg/specialization`

There is intentionally no root gameplay import from `@drakeshard/rpg` in v0.1. Consumers compose
only the mechanisms they need.

The package remains `private: true` until the separate npm release task. This repository state
selects and verifies the API; it does not publish it.

## Boundaries

Runtime dependencies remain zero. RPG does not depend on Tactical or Foundation. The application
owns relationships between RPG subjects and entities from other domains.

The selected modules remain deliberately narrow:

- advancement owns ordered game-defined rank/mastery state;
- attributes own game-defined finite scalar base values;
- resources own current/capacity state;
- roles own role ownership and active-role state;
- specialization owns persistent game-defined selection/rank state;
- capabilities own persistent game-defined capability ownership;
- loadout owns persistent slot-to-reference assignment.

No universal `RpgCharacter`, requirement/effect DSL, skill execution engine, inventory framework,
combat system, event bus, or command bus is part of v0.1.

## Evidence

The Openfield integration sample composes all seven selected RPG mechanisms in one running game
while keeping title policy game-owned. The package release-candidate gate additionally packs the
exact artifact, installs it into a clean temporary consumer, typechecks every selected subpath,
runtime-imports every selected subpath by package name, verifies the root import stays unsupported,
and checks that source/tests/examples/scripts do not leak into the installed package.

The selected API record is in `docs/review/public-api-selection.json`.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` covers formatting/lint, architecture boundaries, selected-package invariants,
strict source/test typechecking, unit tests, build shape, public-API readiness, and the packed
external-consumer gate.

## License

Apache-2.0 under the Drakeshard public shared-library default.
