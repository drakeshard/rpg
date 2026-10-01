# Roles / Jobs Incubation

## Status

RPG-I02 / Issue #7 implements the roles/jobs candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns later stable public-surface admission.

## Responsibility

Roles owns RPG role ownership and active-role state for game-defined role references.

A catalog definition contains a non-empty set of unique stable role references. Runtime state stores:

- the ordered set of roles currently owned by the subject;
- zero or one active role reference.

The consuming game owns subject identity and associates this state with its character/actor/hero.

## Operations

- `initializeRoles` creates empty ownership and no active role;
- `grantRole` grants one defined, not-yet-owned role;
- `activateRole` selects one owned role as active;
- `deactivateRole` clears the active role;
- `revokeRole` removes an owned role only when it is not active.

Revoking an active role is rejected. The consuming game must explicitly deactivate first, so the
library never hides a role-switch decision inside a revoke operation.

## Deliberately absent

Roles does not define:

- base/advanced class tiers or inheritance;
- job trees or specialization graphs;
- advancement/mastery state or curves;
- requirements, unlock conditions, or rewards;
- skills/capabilities or active ability execution;
- combat/Tactical effects;
- roster/deployment policy;
- title-specific role names or balance.

## Advancement composition

Role mastery remains game composition. The roles module does not import advancement.

The first-game pressure test maps each game-owned job reference to a game-owned advancement track.
The game then owns role state and advancement state side-by-side and decides when mastery advances.

This preserves the Sprint 01 module-dependency rule: roles and advancement are independently useful
and cross-module title policy remains outside either module.
