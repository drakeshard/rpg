# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository hosts RPG-domain incubation contracts and mechanisms that have passed the Drakeshard shared-code incubation process.
It is not a universal game engine, Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, prerequisites, rewards, active capability execution, combat, inventory/equipment policy, Tactical composition, and aggregate save ownership remain owned by consuming games unless a later controlled architecture decision explicitly moves a responsibility.

## Current status

RPG v0.1 incubation is complete through RPG-I09.

The repository contains incubation evidence for:

- advancement;
- roles/jobs;
- resources;
- attributes;
- specialization;
- capability ownership;
- loadout/equipment assignment.

No gameplay candidate has graduated to the stable package surface. `@drakeshard/rpg` remains private, the root gameplay export remains empty, and runtime dependencies remain zero.

The package does not expose a universal RPG character, generic property/metadata bag, generic `Result<T>`, skill/effect/requirement engine, event bus, command bus, inventory system, or combat system.

Repository-level incubation conventions are defined in `docs/architecture/incubation-conventions.md`. Google Drive remains authoritative for RPG architecture and admission decisions.

## Dependency boundary

Runtime dependencies remain zero. `@drakeshard/foundation`, Tactical packages, renderer/UI frameworks, and browser APIs are not admitted into RPG source by default.

Cross-library and title-policy composition belongs in the consuming game unless a later controlled architecture decision admits a narrower shared contract.

## Quality and package guards

Required local verification is:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` covers formatting/lint, architecture boundaries, package/incubation invariants, strict source and test typechecking, unit tests, build, and generated build-artifact shape validation.

The package guard protects private/incubation status, zero runtime dependencies, the absence of public package entry metadata, and the empty stable root export. Build-artifact validation ensures `dist` contains only the JavaScript/declaration output expected from `src`.

Repository licensing is intentionally unresolved while the package remains private. A license must not be selected without an explicit controlled owner decision.
