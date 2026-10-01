# Capability Ownership Incubation

## Status

RPG-I06 / Issue #11 implements the capability-ownership candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns any later stable public-surface admission.

## Responsibility

Capabilities owns persistent ownership of game-defined capability references.

A definition contains a catalog of stable game-owned capability references. Runtime state contains only
the ordered set of references currently owned by the subject.

The module does not define what a capability does. A capability may represent an active ability,
passive permission, recipe, stance, interaction option, or another game-defined possibility.

## Operations

- `initializeCapabilityOwnership` creates empty ownership state from a valid catalog;
- `grantCapability` adds one defined capability;
- `revokeCapability` removes one owned capability.

Duplicate grants, unknown references, revoking an unowned capability, invalid definitions, and
invalid starting state are explicit rejected outcomes.

Owned references preserve explicit grant order. Revocation preserves the relative order of the
remaining references.

## Grant-source decision

Grant-source attribution is consumer-owned for v0.1.

The ownership state does not record whether a capability came from specialization, role/job,
equipment, quest rewards, progression, or another source. Reference counting and source-specific
revocation are therefore also outside the module.

This avoids turning capability ownership into a generic entitlement system. A game that needs
multiple simultaneous grant sources may keep source accounting in composition and call the narrow
grant/revoke operations only when its policy determines aggregate ownership changes.

## Temporary and derived availability

Temporary, conditional, and derived availability remain consumer-owned.

The module does not model cooldowns, charges, resource costs, status effects, equipment conditions,
active-role gates, specialization prerequisites, map/Tactical conditions, time windows, or runtime
execution eligibility.

Persistent ownership answers only whether the subject owns a game-defined capability reference.

## Specialization composition

RPG-I05 established that specialization rewards and grants remain outside specialization. The first
game can observe a successful specialization transition and then, through game composition, grant a
capability using this module.

Neither `src/specialization` nor `src/capabilities` imports the other.

## Execution boundary

Capability ownership does not execute capabilities and does not define targeting, input, costs,
effects, combat, damage, healing, Tactical behavior, animation, presentation, or networking.

Active execution remains game-owned unless later evidence identifies a separate coherent library.

## Deliberately absent

Capabilities does not define:

- ability or skill execution;
- generic requirements or effect DSLs;
- grant sources or reference counting;
- temporary grants, cooldowns, charges, or costs;
- specialization, role/job, advancement, equipment, or inventory policy;
- capability metadata/property bags;
- Tactical, renderer, UI, browser, or storage behavior.
