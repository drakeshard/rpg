# Architecture Overview

## Status

Implementation-adjacent baseline for the RPG repository. Controlled RPG architecture and ownership decisions are maintained in RPG-ARCH-001 in Google Drive.

Repository implementation conventions are defined in `incubation-conventions.md`. They operationalize RPG-ARCH-001 for issue-backed implementation without admitting gameplay modules by themselves.

## Layering

```text
Application / UI / Presentation
            |
Game domain composition
       /           \
     RPG          Tactical
      |
optional lower-level infrastructure only when explicitly admitted
```

RPG and Tactical are sibling domains. Consuming games compose them.

## Current package boundary

RPG v0.1 incubation produced advancement, roles/jobs, resources, attributes, specialization, capability ownership, and loadout/equipment candidates under source subdirectories. They remain incubation-only: `@drakeshard/rpg` is private, runtime dependencies remain zero, package public-entry/export metadata is absent, and the stable/root gameplay export remains empty.

Public gameplay surfaces are added only through issue-backed controlled admission after real consumer pressure. Repository package and build-shape guards make accidental admission or distributable-shape drift fail CI.

## Required boundaries

RPG source must not depend on:

- Phaser, PlayCanvas, Preact, or renderer/UI objects;
- browser/DOM APIs;
- Tactical packages;
- consuming-game packages;
- Web Foundation unless a specific Foundation-owned infrastructure dependency is admitted.

## Domain ownership

RPG may own reusable role-state, advancement, resource, attribute, specialization, capability ownership, and loadout mechanisms when each survives pressure testing. The game owns concrete content, formulas, balance, active ability execution, combat, narrative systems, and cross-domain rules.

## Determinism

Authoritative RPG state transitions must make ordering and external inputs explicit. Do not use uncontrolled wall-clock time, `Math.random()`, renderer state, or hidden global mutation in deterministic paths.

The architecture check also rejects common hidden randomness, wall-clock, timer, async-scheduling, DOM/browser, and renderer-timing sources from `src/` before they can become authoritative implementation dependencies. Its regression suite proves both allowed ordinary RPG-relative imports and the prohibited cases.

## Admission rule

Genericity is not sufficient. New shared surfaces require a current consumer, coherent RPG ownership, standalone tests, title-independent naming, and a concrete shared-maintenance or compatibility benefit.
