# Resources Incubation

## Status

RPG-I03 / Issue #8 implements the resources candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns any later stable public-surface admission.

## Responsibility

Resources owns deterministic current/capacity state for one game-defined resource reference.

A definition contains:

- a stable resource reference;
- an initial current value;
- an initial capacity.

Runtime state contains:

- the resource reference;
- current value;
- capacity.

The invariant is:

```text
0 <= current <= capacity
```

All numeric values must be finite and capacity must be non-negative.

## Operations

- `initializeResource` creates state from a valid definition;
- `increaseResource` increases current and clamps at capacity;
- `decreaseResource` decreases current and clamps at zero;
- `setResourceCurrent` sets current and clamps into the valid range;
- `setResourceCapacity` changes capacity and clamps current downward if required.

Changed outcomes report whether clamping occurred. Zero/no-op transitions return `unchanged`.

## Deliberately absent

Resources does not define:

- HP, Mana, Focus, Momentum, or another hard-coded resource name;
- what reaching zero means;
- death, defeat, downed state, exhaustion, or cast failure;
- damage, healing, costs, spending permissions, or refund policy;
- regeneration or decay over time;
- attribute/modifier formulas for capacity;
- effects, statuses, combat, or Tactical behavior;
- persistence/storage services.

The consuming game decides when an operation should occur and what the resulting values mean.

## Pressure-test interpretation

The first-game fixtures use HP, Mana, and a job/family-specific resource as game-owned references.
The same resource contract handles all three without hard-coded semantics.

Depleting HP to zero produces only resource state. It does not produce death/defeat behavior, which
remains game/combat composition.
