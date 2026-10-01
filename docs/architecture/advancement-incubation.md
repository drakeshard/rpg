# Advancement Incubation

## Status

RPG-I01 / Issue #6 implements the first RPG gameplay candidate for pressure testing.

This is an incubation contract, not a v0.1 public-surface graduation decision. RPG-I09 remains the
extraction/public-API review.

## Responsibility

Advancement owns deterministic movement through an ordered, game-defined sequence of advancement
ranks within one game-defined track.

A track definition contains:

- a stable track reference;
- an ordered, non-empty sequence of unique stable rank references.

Runtime state contains only:

- the track reference;
- the current rank reference.

The module does not own subject identity. The consuming game associates advancement state with its
own character/actor/hero identity.

## Deliberately absent

Advancement does not define:

- XP, mastery points, progress meters, thresholds, or curves;
- numeric levels or a 1-99 range;
- one global character level;
- jobs, classes, roles, job ownership, or active-job policy;
- rewards, abilities, stats, attributes, or effects granted by a rank;
- prerequisites or a requirements DSL;
- downgrade/respec policy;
- time, randomness, persistence services, or Tactical behavior.

The game decides when an advancement operation is allowed. For example, a game may award mastery
points locally and call `advanceAdvancement` only after its own threshold policy is satisfied.

## Operations

`initializeAdvancement` validates a track and creates state at its first rank.

`advanceAdvancement` validates the definition/state relationship and then returns exactly one of:

- `advanced` with the next rank;
- `complete` when the current rank is already final;
- `rejected` when the definition or state is invalid.

No operation reads hidden time, randomness, browser state, or another RPG module.

## Pressure-test interpretation

The first-game job/mastery fixture keeps job ownership outside advancement. The game chooses a
mastery track for a job and stores that advancement state alongside its own job state.

This proves the current contract can represent job mastery without making advancement own roles or
requiring a roles dependency. RPG-I02 will pressure-test that composition from the roles side.
