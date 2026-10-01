# Openfield — Drakeshard Integration Sample

Openfield is a browser-first 2.5D action-game sample adapted from the user-provided prototype. It is intentionally an **application/integration specimen**, not a new shared library.

## What this sample exercises

### Drakeshard Web Foundation

The sample consumes Foundation source at a pinned known-good commit through the approved public contracts:

- `@drakeshard/foundation/time` — `FixedStepDriver` drives authoritative 60 Hz simulation steps while rendering remains `requestAnimationFrame`-driven.
- `@drakeshard/foundation/random` — `DeterministicRng` replaces the prototype's game/world RNG helpers.
- `@drakeshard/foundation/input` and `/input/browser` — keyboard/pointer events flow through browser adapters, logical action mapping, contexts, and tick handoff.

### Drakeshard RPG

The sample imports the repository-local incubation `resources` mechanism directly (not a stable package subpath) for player HP and stamina. The game still projects resource values into its actor/render model, while damage, healing, sprint drain, and recovery transition through RPG resource operations.

This is integration evidence only. It does **not** admit `@drakeshard/rpg/resources` as a public package export and does not change RPG's `private: true` status.

## What deliberately stays game-owned

Canvas/isometric rendering, sprite animation, AI, combat geometry/formulas, enemy definitions, loot/inventory, objectives, interaction rules, audio, camera behavior, and presentation effects remain local to Openfield. No Tactical dependency or generic combat/inventory/effect framework is introduced.

## Run locally

The sample builds against a pinned Web Foundation source checkout so it can exercise the real current implementation without adding a runtime dependency to the RPG package.

```bash
cd examples/openfield
git clone https://github.com/drakeshard/web-foundation.git .foundation-src
git -C .foundation-src checkout 35465b52aed501c113cfde669774b07c3fd3640a
npm install --no-package-lock
npm run dev
```

Use `npm run build` for the same TypeScript + Vite build used by CI and GitHub Pages.

## Play

Defeat eight enemies, then travel to the ruins and press **E** at the beacon. Explore the forest, camp, and ruin route; open chests and collect drops for gold and potions. The campfire restores HP.

| Input | Action |
| --- | --- |
| WASD or arrows | Move |
| Shift | Sprint |
| Space or left click | Melee attack |
| Q | Dash |
| E | Interact or collect loot |
| H | Drink a health potion |
| Mouse wheel | Zoom |
| R | Restart |
| F3 | Toggle debug data |

Add `?stress=1` for the diagnostic scene with 50 enemies and roughly 500 world objects. Add `?sprites=demo` to exercise the placeholder sprite-atlas path.

## Structure

- `src/main.ts` coordinates game-local rules and Foundation-driven stepping.
- `src/input.ts` adapts Foundation browser input to Openfield logical actions.
- `src/rpg-player-resources.ts` composes RPG incubation resources into player HP/stamina.
- `src/world.ts` uses Foundation deterministic RNG for authored world generation.
- `src/ai.ts`, `src/combat.ts`, `src/rendering.ts`, `src/sprites.ts`, and `src/audio.ts` remain game-owned.
- `vite.config.ts` aliases Foundation package subpaths to the pinned integration checkout.

## GitHub Pages

`.github/workflows/openfield-pages.yml` builds this sample on pull requests and deploys the same artifact to GitHub Pages from `main`. The Pages site is a demonstration surface only; it is not an npm-release or RPG-public-API signal.

## Current limits

Production sprite artwork has not been authored. Enemy navigation still uses simple steering and can get caught around dense obstacles. Persistent save/load is intentionally not added in this first integration pass; that remains a useful later Foundation storage pressure test.
