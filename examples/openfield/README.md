# Openfield — Drakeshard Integration Sample

Openfield is a browser-first 2.5D action-game sample adapted from the user-provided prototype. It is intentionally an **application/integration specimen**, not a new shared library.

## What this sample exercises

### Drakeshard Web Foundation

The sample consumes the exact published `@drakeshard/foundation@0.1.2` npm artifact through the approved public contracts:

- `@drakeshard/foundation/time` — `FixedStepDriver` drives authoritative 60 Hz simulation steps while rendering remains `requestAnimationFrame`-driven.
- `@drakeshard/foundation/random` — `DeterministicRng` replaces the prototype's game/world RNG helpers.
- `@drakeshard/foundation/input` and `/input/browser` — keyboard/pointer events flow through browser adapters, logical action mapping, contexts, and tick handoff.

### Drakeshard RPG

The sample imports the repository-local incubation `resources` mechanism directly (not a stable package subpath) for player HP and stamina. The game still projects resource values into its actor/render model, while damage, healing, sprint drain, and recovery transition through RPG resource operations.

This is integration evidence only. It does **not** admit `@drakeshard/rpg/resources` as a public package export and does not change RPG's `private: true` status.

## What deliberately stays game-owned

Canvas/isometric rendering, sprite animation, AI, combat geometry/formulas, enemy definitions, loot/inventory, objectives, interaction rules, audio, camera behavior, and presentation effects remain local to Openfield. No Tactical dependency or generic combat/inventory/effect framework is introduced.

## Run locally

The sample consumes the exact published `@drakeshard/foundation@0.1.2` npm package. That exercises Foundation through its real external-consumer path while keeping the dependency isolated to this sample rather than the RPG package.

```bash
cd examples/openfield
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
- `package.json` pins the published Foundation package at exactly `0.1.2`.

## GitHub Pages

`.github/workflows/openfield-pages.yml` builds this sample on pull requests and deploys the same artifact to GitHub Pages from `main`. The Pages site is a demonstration surface only; it is not an npm-release or RPG-public-API signal.

## Presentation

The primary unit presentation now uses hand-drawn isometric character sprites by Jana Ochse / 2D!PIXX under CC BY 3.0, with procedural rigs retained only as a runtime fallback when remote art cannot load. The sprite sets provide 128×160 frames, four directions, and idle/walk/attack animation states. See `ART-CREDITS.md` for attribution and source links.

The surrounding sample uses a procedural dark-fantasy presentation layer: a compact quest HUD, Warden resource/identity panel, action slots, framed field radar, cinematic start/result screens, richer environment props, and distinct procedural player/grunt/fast/heavy silhouettes. These visuals remain application-owned and intentionally require no renderer framework or shared-library UI surface.

## Current limits

Production sprite artwork has not been authored. Enemy navigation still uses simple steering and can get caught around dense obstacles. Persistent save/load is intentionally not added in this first integration pass; that remains a useful later Foundation storage pressure test.


## Progression pressure test

Openfield now exercises the RPG incubation modules together in one running game:

- `advancement` tracks Warden rank while Openfield owns XP thresholds and rewards;
- `attributes` tracks strength, agility, and vitality bases while Openfield owns derived combat formulas;
- `roles` tracks the active Warden role;
- `specialization` tracks ranked Blade Mastery, Wind Discipline, and Iron Heart choices;
- `capabilities` tracks ownership of Crescent Arc, Aegis Burst, and Wind Step while Openfield owns their execution/effects;
- `loadout` tracks weapon/armor/charm references while Openfield owns the item catalog and stats;
- `resources` tracks health/stamina, including capacity changes from progression/equipment.

The sample intentionally keeps quests, XP curves, skill prerequisites/effects, item definitions, drop policy, combat formulas, spawning, AI, and balancing game-owned. Their presence is evidence for evaluating RPG boundaries; it is not automatic justification for new shared APIs.

## World and lifetime bounds

The map now spans Greywood Outskirts, Fenwatch Mire, and the Broken Beacon Ruins. A deterministic spawn director maintains local populations around the current area.

Long-session entity growth is explicitly bounded:

- at most 26 allocated enemies;
- target live population starts at 12 and scales modestly with Warden rank;
- dead enemies are removed after their death presentation finishes;
- at most 48 world loot entries;
- uncollected loot expires after 45 seconds;
- particle creation remains capped at 280;
- damage-number history is capped at 64;
- dash afterimages remain capped by the existing 8-entry limit.

These are title-owned runtime policies rather than RPG-library behavior.
