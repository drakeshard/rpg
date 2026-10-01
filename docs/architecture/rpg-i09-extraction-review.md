# RPG-I09 Extraction and Public API Review

## Status

RPG-I09 / Issue #14 is the v0.1 extraction/public-surface decision gate.

The review covers every surviving incubation candidate after RPG-I08 full composition pressure testing.
No candidate is admitted to the stable public package surface in this review.

The decision is **defer**, not reject. The candidates remain available as incubation evidence for the
first production game.

## Admission rule applied

A candidate may graduate only when it has:

- a real current consumer;
- coherent RPG-domain ownership;
- stable title-independent terminology;
- renderer/UI independence;
- Tactical independence;
- deterministic semantics;
- meaningful standalone tests;
- stable definition/state separation;
- a workable persistence boundary;
- a concrete maintenance/compatibility benefit from shared ownership.

RPG-I01 through RPG-I08 provide substantial architecture and deterministic-test evidence, but there is
still no first production-game repository. RPG-I08 is therefore pre-production composition evidence,
not real consumer adoption.

That missing evidence is sufficient to block stable public admission without weakening the approved
shared-code admission rule.

## Candidate decisions

### Advancement

**Surviving responsibility:** ordered game-defined development/rank/mastery progression without XP,
global levels, curves, roles, rewards, or prerequisite semantics.

**Evidence for coherent ownership:** deterministic ordered progression is independently testable,
title-neutral, renderer-independent, Tactical-independent, and JSON-compatible. Job/mastery pressure
tests compose cleanly outside the module.

**Evidence gap:** no production game currently demonstrates that this exact abstraction is used,
ergonomic at real content scale, or independently valuable enough to maintain as shared API.

**Decision:** defer unchanged.

No merge, split, or rename is justified before production usage.

### Roles / jobs

**Surviving responsibility:** ownership and active selection of game-defined role/job references.

**Evidence for coherent ownership:** the module cleanly separates role state from mastery,
specialization, capability, and Tactical behavior. It remains independently deterministic and
serializable.

**Evidence gap:** no real consumer has demonstrated actual role lifecycle, switching frequency,
save-compatibility needs, or whether active-role semantics are sufficient for production content.

**Decision:** defer unchanged.

Role mastery remains consumer composition with advancement.

### Resources

**Surviving responsibility:** finite game-defined current/capacity state with deterministic
invariant-preserving transitions.

**Evidence for coherent ownership:** HP/Mana/job-resource pressure tests fit the same narrow contract
while depletion meaning remains game-owned.

**Evidence gap:** the current shape is intentionally thin and may prove either highly reusable or too
generic once real gameplay semantics, persistence, regeneration, temporary capacity changes, and
content volume are exercised.

**Decision:** defer unchanged.

Do not broaden the module to manufacture RPG specificity before consumer evidence exists.

### Attributes

**Surviving responsibility:** finite scalar game-defined base values with deterministic base-value
transitions.

**Evidence for coherent ownership:** title formulas and modifier algebra stay outside the module and
the base-state contract is deterministic and serializable.

**Evidence gap:** of all candidates, attributes has the strongest unresolved ownership question. The
current contract may be too thin to justify an RPG-specific shared package surface, while adding
modifier/formula algebra without production evidence would embed title policy prematurely.

**Decision:** defer unchanged.

RPG-I09 does not admit, merge, or broaden attributes. Real production formulas and persistence usage
must determine whether this remains RPG-owned, grows narrowly, or stays game-local.

### Specialization

**Surviving responsibility:** persistent game-defined selections with bounded positive ranks.

**Evidence for coherent ownership:** the module survived first-game pressure tests without becoming a
skill-tree engine, graph framework, prerequisite DSL, reward engine, or role/advancement owner.

**Evidence gap:** no production specialization content currently proves whether the selected-choice
rank model remains ergonomic across real branch structures, respec flows, save compatibility, and
large authored data sets.

**Decision:** defer unchanged.

Prerequisites, exclusivity, respec/refund, and rewards remain game-owned.

### Capability ownership

**Surviving responsibility:** persistent ownership of game-defined capability references.

**Evidence for coherent ownership:** ownership remains separate from active execution, requirements,
costs, temporary availability, grant-source accounting, specialization, and Tactical conditions.

**Evidence gap:** no production consumer demonstrates the real frequency and lifecycle of grants,
revocations, temporary sources, save restoration, or whether permanent ownership alone earns a
shared-library boundary.

**Decision:** defer unchanged.

Do not merge capability ownership into specialization or a generic skill engine.

### Loadout / equipment assignment

**Surviving responsibility:** persistent assignment of game-defined equipment references to
game-defined slots.

**Evidence for coherent ownership:** inventory, item catalogs, eligibility, cross-slot conflicts,
effects, combat, and Tactical behavior remain outside the module. The reference model does not force
definition-vs-instance identity.

**Evidence gap:** no production inventory/equipment implementation validates slot ergonomics,
instance identity, persistence behavior, cross-slot policy pressure, or independent maintenance
benefit.

**Decision:** defer unchanged.

Do not add item catalogs or inventory merely to make the module appear more complete.

## Cross-cutting decisions

### Stable public surface

No gameplay candidate graduates in RPG-I09.

The package root remains empty. No stable gameplay subpath is admitted by this review.

### Package status

`@drakeshard/rpg` remains private.

A repository, implementation, and passing CI do not by themselves establish a releasable public API.

### Candidate structure

No candidate should currently be merged, split, or renamed.

RPG-I08 demonstrated that ordinary game-owned composition is sufficient and did not expose a
relationship intrinsic enough to justify new RPG-internal dependencies.

### Universal RPG aggregate

No `RpgCharacter`, universal RPG aggregate, generic property bag, or metadata bag is admitted.

The consuming game remains responsible for associating the RPG state it actually uses with its own
subject identity.

### Dependencies

Runtime dependencies remain zero.

No Tactical dependency is required. RPG and Tactical remain sibling domains composed by the game.

No Foundation dependency is required. Time, input, storage, and random infrastructure remain
application/game composition concerns unless a concrete lower-level need later passes admission.

### Title policy

Formulas, balance, prerequisites, rewards, capability execution, combat, inventory, equipment
eligibility/effects, Tactical interactions, and aggregate save ownership remain consumer-owned.

## Reopening admission

A later stable-surface proposal must start from concrete production-game evidence rather than simply
reopening all seven candidates.

For the candidate under consideration, record:

1. the real current consumer and exact production use;
2. which current incubation API is actually used;
3. any ergonomic or semantic changes discovered in production;
4. persistence/save compatibility requirements;
5. why game-local ownership is now less safe or more costly than shared ownership;
6. whether the candidate remains renderer/UI/Tactical independent;
7. dependency and bundle/runtime cost;
8. the narrowest public contract worth supporting;
9. whether another consumer or independent compatibility boundary strengthens the case.

Only then should a new issue propose public admission.

## v0.1 incubation conclusion

RPG v0.1 incubation successfully produced and pressure-tested seven coherent candidate boundaries.
It did **not** produce enough real-consumer evidence to admit a stable gameplay API.

That is a successful incubation outcome: boundaries are available for production use and further
evidence without prematurely committing Drakeshard to public contracts.

Future RPG work is production-consumer-driven.
