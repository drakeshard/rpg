# Architecture Overview

## Status

Implementation-adjacent baseline for the RPG repository. Controlled RPG architecture and ownership decisions are maintained in RPG-ARCH-001 in Google Drive.

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

## Initial package boundary

`@drakeshard/rpg` starts with zero runtime dependencies and no gameplay modules. Public modules are added only through issue-backed implementation after architecture admission and consumer pressure.

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

## Admission rule

Genericity is not sufficient. New shared surfaces require a current consumer, coherent RPG ownership, standalone tests, title-independent naming, and a concrete shared-maintenance or compatibility benefit.
