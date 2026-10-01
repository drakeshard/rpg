# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository is intended to host reusable RPG-domain contracts and mechanisms that have passed the Drakeshard shared-code admission process.
It is not a universal game engine, Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, active ability execution, and cross-domain policy remain owned by consuming games unless a later architecture decision explicitly moves a responsibility.

## Current status

Sprint 01 incubation conventions are defined in `docs/architecture/incubation-conventions.md` and enforced where practical by repository architecture checks and tests.

RPG-I01 adds an advancement incubation candidate under `src/advancement`: ordered game-defined rank/mastery progression without XP, global levels, role ownership, or a progression curve. It remains an incubation surface pending later pressure testing and RPG-I09 extraction review.

## Dependency boundary

Runtime dependencies remain zero. `@drakeshard/foundation`, Tactical packages, renderer/UI frameworks, and browser APIs are not admitted into RPG source by default.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```
