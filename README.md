# Drakeshard RPG

Renderer-neutral RPG-domain mechanisms for Drakeshard games.

## Scope

This repository is intended to host reusable RPG-domain contracts and mechanisms that have passed the Drakeshard shared-code admission process.
It is not a universal game engine, Tactical library, combat engine, renderer integration, UI framework, or generic utility collection.

Game-specific content, formulas, balance, active ability execution, and cross-domain policy remain owned by consuming games unless a later architecture decision explicitly moves a responsibility.

## Current status

RPG v0.1 incubation is complete through RPG-I09. The seven gameplay candidates remain incubation-only evidence: none is admitted to the stable/root public gameplay surface. Incubation conventions are defined in `docs/architecture/incubation-conventions.md` and enforced by repository architecture, package/admission, typechecking, contract, serialization, and build-shape checks.

RPG-I01 adds advancement incubation under `src/advancement`: ordered game-defined rank/mastery progression without XP, global levels, role ownership, or a progression curve.

RPG-I02 adds roles/jobs incubation under `src/roles`: game-defined role ownership and active-role state without class tiers, mastery, skills, or Tactical behavior. Role mastery is pressure-tested through game-side composition with advancement rather than a source dependency.

RPG-I03 adds resources incubation under `src/resources`: game-defined current/capacity state with deterministic invariant-preserving transitions and no hard-coded depletion meaning.

RPG-I04 adds attributes incubation under `src/attributes`: game-defined finite scalar base values with deterministic base-value transitions. Modifier algebra, derived formulas, caps, stacking, and balance policy remain consumer-owned.

RPG-I05 adds specialization incubation under `src/specialization`: persistent game-defined selections with bounded positive ranks, without a graph, prerequisite DSL, branch/exclusivity engine, respec policy, or automatic rewards/capability grants.

RPG-I06 adds capability-ownership incubation under `src/capabilities`: persistent ownership of game-defined capability references with deterministic grant/revoke transitions. Execution, requirements, temporary availability, grant-source tracking, and cross-module grant policy remain consumer-owned.

RPG-I07 adds loadout/equipment-assignment incubation under `src/loadout`: persistent game-defined slot-to-equipment-reference assignment with deterministic assign/replace/clear transitions. Inventory, item catalogs, equip eligibility, cross-slot policy, and equipment effects remain consumer-owned.

RPG-I08 pressure-tests every surviving RPG candidate together in a headless first-game composition fixture. The fixture preserves game-owned identity mapping, formulas, prerequisites, Tactical facts, combat/effect interpretation, and aggregate save ownership without adding RPG-internal, Tactical, Foundation, or runtime dependencies. This remains pre-production evidence because the first game repository does not yet exist.

RPG-I09 extraction review defers stable admission for every gameplay candidate because no real production-game consumer exists yet. The candidate boundaries remain incubation evidence for production use; `@drakeshard/rpg` stays private, runtime dependencies remain zero, and the root/stable gameplay surface remains empty.

## Dependency boundary

Runtime dependencies remain zero and are protected by an executable package invariant guard. `@drakeshard/foundation`, Tactical packages, renderer/UI frameworks, and browser APIs are not admitted into RPG source by default.

The package remains private. Package exports, stable gameplay subpaths, and a non-empty root gameplay export require a controlled admission decision; the current root/stable gameplay surface is intentionally empty.

This repository uses the shared Drakeshard public-library default license: Apache License 2.0 (`Apache-2.0`). The repository includes a `LICENSE` file and `package.json` records the SPDX identifier. Package privacy and gameplay-surface admission remain separate decisions: `private: true` still prevents package publication until a later controlled distribution decision.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` is the local deterministic equivalent of Quality CI: formatting/lint, architecture boundaries, package/incubation invariants, source and test typechecking, unit tests, build, and build-artifact shape validation. Dependency Review remains a GitHub PR gate.
