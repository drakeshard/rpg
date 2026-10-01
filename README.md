# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository is intended to host reusable RPG-domain contracts and mechanisms that have passed the Drakeshard shared-code admission process.
It is not a universal game engine, Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, active ability execution, and cross-domain policy remain owned by consuming games unless a later architecture decision explicitly moves a responsibility.

## Current status

Sprint 01 incubation conventions are defined in `docs/architecture/incubation-conventions.md` and enforced where practical by repository architecture checks and tests.

RPG-I01 adds advancement incubation under `src/advancement`: ordered game-defined rank/mastery progression without XP, global levels, role ownership, or a progression curve.

RPG-I02 adds roles/jobs incubation under `src/roles`: game-defined role ownership and active-role state without class tiers, mastery, skills, or Tactical behavior. Role mastery is pressure-tested through game-side composition with advancement rather than a source dependency.

RPG-I03 adds resources incubation under `src/resources`: game-defined current/capacity state with deterministic invariant-preserving transitions and no hard-coded depletion meaning.

RPG-I04 adds attributes incubation under `src/attributes`: game-defined finite scalar base values with deterministic base-value transitions. Modifier algebra, derived formulas, caps, stacking, and balance policy remain consumer-owned.

All remain incubation surfaces pending later pressure testing and RPG-I09 extraction review.

## Dependency boundary

Runtime dependencies remain zero. `@drakeshard/foundation`, Tactical packages, renderer/UI frameworks, and browser APIs are not admitted into RPG source by default.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```
