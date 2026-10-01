# RPG-I08 Full Composition Pressure Test

## Status

RPG-I08 / Issue #13 pressure-tests all surviving RPG incubation candidates together.

This is pre-production architecture evidence. The Drakeshard organization does not yet contain the
first production-game repository, and Tactical remains a Drive-controlled prospective library with
no authorized repository or package. RPG-I08 therefore does not claim that a playable production
consumer has integrated these modules.

## Pressure-test shape

The test fixture composes:

- game-owned character identity;
- roles/jobs;
- advancement/mastery;
- resources;
- attributes;
- specialization;
- capability ownership;
- loadout/equipment assignment;
- game-owned mapping from character identity to a Tactical entity identity;
- game-owned Tactical facts used by action validity;
- game-owned formulas, prerequisites, rewards, equip policy, combat interpretation, and aggregate
  save composition.

The fixture imports each RPG module independently. No source module imports another RPG module to
encode title policy.

## Architecture results

All seven surviving candidates remain independently coherent in the combined scenario.

No universal `RpgCharacter` or RPG aggregate is required. The aggregate used by the test is owned by
the consuming game and exists only in test/composition code.

No RPG-internal dependency became necessary.

No Tactical dependency became necessary. The consumer maps game/RPG identity to Tactical identity
and combines RPG state with Tactical facts outside both sibling libraries.

No Foundation dependency became necessary. The scenario is deterministic from explicit inputs and
uses plain JSON-compatible data without time, random, input, renderer, browser, or storage services.

## Title policy remains outside reusable modules

The pressure test keeps these responsibilities in game composition:

- role mastery association;
- specialization prerequisites and reward mapping;
- specialization-to-capability grant policy;
- attribute-derived formulas and equipment modifiers;
- inventory possession and equip eligibility;
- Tactical range, visibility, elevation, movement, and targeting facts;
- resource spending meaning and depletion consequences;
- active ability execution;
- combat/damage/effect interpretation;
- aggregate save ownership.

No generic requirement DSL, effect DSL, event bus, command bus, property bag, metadata bag, or
universal result type is introduced.

## Candidate merge/split review

The combined fixture does not show evidence that any current candidate should be merged before
RPG-I09. Their responsibilities remain distinct and their composition seams are ordinary
game-owned policy.

The fixture also does not justify splitting a candidate further. RPG-I09 should still review each
candidate independently because successful composition is not automatic extraction approval.

## Evidence limitation

This test is stronger than isolated module tests because it exercises the complete planned RPG
composition in one deterministic scenario, but it is weaker than production integration.

Questions that require the real game remain open, including:

- whether every candidate is actually used often enough to justify shared ownership;
- whether current names and state shapes remain ergonomic under production content volume;
- whether persistence compatibility needs independent RPG versioning;
- whether measured production performance changes any representation choice;
- whether a second materially different consumer exposes hidden title assumptions.

RPG-I09 must not treat RPG-I08 alone as proof that all candidates should graduate.

## Extraction-review handoff

RPG-I08 supports proceeding to RPG-I09 with the following constraints:

- review candidates independently;
- preserve zero runtime dependencies unless new evidence justifies admission;
- do not add Tactical or Foundation dependencies merely because the first game is tactical;
- do not introduce a universal RPG aggregate;
- treat the absence of a real production-game repository as an explicit evidence limitation.
