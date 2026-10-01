# Attributes Incubation

## Status

RPG-I04 / Issue #9 implements the attributes candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns any later stable public-surface admission.

## Responsibility

Attributes owns deterministic finite scalar base state for one game-defined attribute reference.

A definition contains:

- a stable game-owned attribute reference;
- an initial finite base value.

Runtime state contains:

- the attribute reference;
- the current finite base value.

The shared contract deliberately allows negative finite values. Minimums, maximums, floors, caps, and
other balance constraints remain game policy unless later evidence proves a reusable RPG invariant.

## Operations

- `initializeAttribute` creates state from a valid definition;
- `setAttributeBase` replaces the base value;
- `adjustAttributeBase` applies an explicit finite delta.

Identical-value and zero-delta operations return `unchanged`. Invalid definitions, states, or
non-finite operation inputs return explicit module-local rejection outcomes.

## Modifier algebra decision

Modifier algebra remains game-owned for v0.1 incubation.

The first-game pressure test consumes attribute base values and applies title-owned flat bonuses,
multipliers, floors, and formulas outside the attributes module. This demonstrates that the useful
shared responsibility is currently base attribute state, not a universal modifier engine.

The module therefore does not define:

- additive or multiplicative modifier collections;
- percentage stacking order;
- equipment/role/status modifier semantics;
- derived-stat dependency graphs;
- caps, floors, rounding, or balance formulas;
- generic effects or property bags.

If repeated consumers later demonstrate one intrinsic, title-independent modifier algebra, that
algebra may be proposed through a separate architecture admission decision.

## Deliberately absent

Attributes does not define conventional RPG stat names, combat meaning, Tactical effects, resources,
equipment, roles, specialization, capabilities, storage, or presentation behavior.

The consuming game decides what an attribute means and how it contributes to derived values and
cross-domain rules.
