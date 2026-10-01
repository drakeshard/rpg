# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository is intended to host reusable RPG-domain contracts and mechanisms that have passed the Drakeshard shared-code admission process.
It is not a universal game engine, Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, active ability execution, and cross-domain policy remain owned by consuming games unless a later architecture decision explicitly moves a responsibility.

## Current status

Repository engineering baseline only. No RPG gameplay module is admitted yet.

Initial domain implementation follows RPG-ARCH-001 after repository bootstrap is complete.

## Dependency boundary

Runtime dependencies start at zero. `@drakeshard/foundation`, Tactical packages, renderer/UI frameworks, and browser APIs are not admitted into RPG source by default.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```
