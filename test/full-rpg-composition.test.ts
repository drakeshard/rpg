import { describe, expect, it } from "vitest";
import {
  type AdvancementTrackDefinition,
  advanceAdvancement,
  initializeAdvancement,
} from "../src/advancement/index.js";
import {
  type AttributeDefinition,
  type AttributeState,
  initializeAttribute,
} from "../src/attributes/index.js";
import {
  type CapabilityCatalogDefinition,
  grantCapability,
  initializeCapabilityOwnership,
} from "../src/capabilities/index.js";
import {
  assignLoadoutEquipment,
  initializeLoadout,
  type LoadoutDefinition,
} from "../src/loadout/index.js";
import {
  type ResourceDefinition,
  decreaseResource,
  initializeResource,
} from "../src/resources/index.js";
import {
  activateRole,
  grantRole,
  initializeRoles,
  type RoleCatalogDefinition,
} from "../src/roles/index.js";
import {
  initializeSpecialization,
  selectSpecializationChoice,
  type SpecializationDefinition,
} from "../src/specialization/index.js";

describe("full first-game RPG composition pressure test", () => {
  type CharacterId = "hero-001";
  type TacticalEntityId = "tactical-hero-001";
  type Job = "Arcanist" | "Guardian";
  type Capability = "Fireball";
  type Slot = "Weapon" | "Armor";
  type Equipment = "staff-001" | "robe-001";
  type SpecializationChoice = "ember-path";

  const jobs: RoleCatalogDefinition<Job> = {
    roles: ["Arcanist", "Guardian"],
  };
  const arcanistMastery: AdvancementTrackDefinition<"arcanist-mastery", "novice" | "adept"> = {
    reference: "arcanist-mastery",
    ranks: ["novice", "adept"],
  };
  const hp: ResourceDefinition<"hp"> = {
    reference: "hp",
    initialCurrent: 40,
    initialCapacity: 40,
  };
  const mana: ResourceDefinition<"mana"> = {
    reference: "mana",
    initialCurrent: 12,
    initialCapacity: 12,
  };
  const power: AttributeDefinition<"power"> = {
    reference: "power",
    initialBase: 5,
  };
  const specialization: SpecializationDefinition<"arcanist-specialization", SpecializationChoice> = {
    reference: "arcanist-specialization",
    choices: [{ reference: "ember-path", maxRank: 1 }],
  };
  const capabilities: CapabilityCatalogDefinition<Capability> = {
    capabilities: ["Fireball"],
  };
  const loadout: LoadoutDefinition<Slot> = {
    slots: ["Weapon", "Armor"],
  };

  function runScenario() {
    const character: CharacterId = "hero-001";
    const tacticalEntityByCharacter: Readonly<Record<CharacterId, TacticalEntityId>> = {
      "hero-001": "tactical-hero-001",
    };

    const rolesStart = initializeRoles(jobs);
    const masteryStart = initializeAdvancement(arcanistMastery);
    const hpStart = initializeResource(hp);
    const manaStart = initializeResource(mana);
    const powerStart = initializeAttribute(power);
    const specializationStart = initializeSpecialization(specialization);
    const capabilityStart = initializeCapabilityOwnership(capabilities);
    const loadoutStart = initializeLoadout<Slot, Equipment>(loadout);

    if (rolesStart.kind !== "initialized") throw new Error("roles must initialize");
    if (masteryStart.kind !== "initialized") throw new Error("mastery must initialize");
    if (hpStart.kind !== "initialized") throw new Error("hp must initialize");
    if (manaStart.kind !== "initialized") throw new Error("mana must initialize");
    if (powerStart.kind !== "initialized") throw new Error("power must initialize");
    if (specializationStart.kind !== "initialized") throw new Error("specialization must initialize");
    if (capabilityStart.kind !== "initialized") throw new Error("capabilities must initialize");
    if (loadoutStart.kind !== "initialized") throw new Error("loadout must initialize");

    const roleGranted = grantRole(jobs, rolesStart.state, "Arcanist");
    if (roleGranted.kind !== "changed") throw new Error("role grant must succeed");

    const roleActive = activateRole(jobs, roleGranted.state, "Arcanist");
    if (roleActive.kind !== "changed") throw new Error("role activation must succeed");

    const mastery = advanceAdvancement(arcanistMastery, masteryStart.state);
    if (mastery.kind !== "advanced") throw new Error("mastery advancement must succeed");

    const canChooseEmber =
      roleActive.state.active === "Arcanist" && mastery.state.rank === "adept";
    if (!canChooseEmber) throw new Error("game-owned specialization prerequisite must pass");

    const selected = selectSpecializationChoice(
      specialization,
      specializationStart.state,
      "ember-path",
    );
    if (selected.kind !== "changed") throw new Error("specialization selection must succeed");

    const rewardBySpecialization: Readonly<Record<SpecializationChoice, Capability>> = {
      "ember-path": "Fireball",
    };
    const fireballGrant = grantCapability(
      capabilities,
      capabilityStart.state,
      rewardBySpecialization["ember-path"],
    );
    if (fireballGrant.kind !== "changed") throw new Error("capability grant must succeed");

    const inventory: readonly Equipment[] = ["staff-001", "robe-001"];
    const equipmentSlot: Readonly<Record<Equipment, Slot>> = {
      "staff-001": "Weapon",
      "robe-001": "Armor",
    };
    const canEquip = (slot: Slot, equipment: Equipment) =>
      inventory.includes(equipment) && equipmentSlot[equipment] === slot;

    if (!canEquip("Weapon", "staff-001")) throw new Error("game equip policy must pass");
    const equipped = assignLoadoutEquipment(
      loadout,
      loadoutStart.state,
      "Weapon",
      "staff-001",
    );
    if (equipped.kind !== "changed") throw new Error("loadout assignment must succeed");

    const equipmentPowerBonus: Readonly<Record<Equipment, number>> = {
      "staff-001": 3,
      "robe-001": 1,
    };
    const effectivePower = (
      attribute: AttributeState<"power">,
      assigned: readonly { equipment: Equipment }[],
    ) =>
      attribute.base +
      assigned.reduce((total, assignment) => total + equipmentPowerBonus[assignment.equipment], 0);

    const tacticalFacts = {
      entity: tacticalEntityByCharacter[character],
      targetVisible: true,
      targetInRange: true,
      elevationDelta: 1,
    } as const;

    const fireballManaCost = 5;
    const canCastFireball =
      fireballGrant.state.owned.includes("Fireball") &&
      manaStart.state.current >= fireballManaCost &&
      tacticalFacts.targetVisible &&
      tacticalFacts.targetInRange;

    if (!canCastFireball) throw new Error("game-owned action policy must pass");

    const manaAfterCast = decreaseResource(mana, manaStart.state, fireballManaCost);
    if (manaAfterCast.kind !== "changed") throw new Error("mana spend must succeed");

    const damage =
      effectivePower(powerStart.state, equipped.state.assignments) +
      tacticalFacts.elevationDelta;

    const hpAfterHit = decreaseResource(hp, hpStart.state, damage);
    if (hpAfterHit.kind !== "changed") throw new Error("damage interpretation must succeed");

    return {
      character,
      rpg: {
        roles: roleActive.state,
        mastery: mastery.state,
        hp: hpAfterHit.state,
        mana: manaAfterCast.state,
        power: powerStart.state,
        specialization: selected.state,
        capabilities: fireballGrant.state,
        loadout: equipped.state,
      },
      tacticalAssociation: {
        character,
        entity: tacticalFacts.entity,
      },
      tacticalFacts,
      gameDerived: {
        effectivePower: effectivePower(powerStart.state, equipped.state.assignments),
        canCastFireball,
        damage,
        hpDepleted: hpAfterHit.state.current === 0,
      },
    };
  }

  it("composes every surviving RPG candidate with game-owned Tactical and title policy", () => {
    expect(runScenario()).toEqual({
      character: "hero-001",
      rpg: {
        roles: { owned: ["Arcanist"], active: "Arcanist" },
        mastery: { track: "arcanist-mastery", rank: "adept" },
        hp: { resource: "hp", current: 31, capacity: 40 },
        mana: { resource: "mana", current: 7, capacity: 12 },
        power: { attribute: "power", base: 5 },
        specialization: {
          specialization: "arcanist-specialization",
          selections: [{ choice: "ember-path", rank: 1 }],
        },
        capabilities: { owned: ["Fireball"] },
        loadout: {
          assignments: [{ slot: "Weapon", equipment: "staff-001" }],
        },
      },
      tacticalAssociation: {
        character: "hero-001",
        entity: "tactical-hero-001",
      },
      tacticalFacts: {
        entity: "tactical-hero-001",
        targetVisible: true,
        targetInRange: true,
        elevationDelta: 1,
      },
      gameDerived: {
        effectivePower: 8,
        canCastFireball: true,
        damage: 9,
        hpDepleted: false,
      },
    });
  });

  it("is deterministic from identical explicit inputs", () => {
    expect(runScenario()).toEqual(runScenario());
  });

  it("round-trips the aggregate game-owned save fragment through JSON", () => {
    const scenario = runScenario();
    const saveFragment = {
      character: scenario.character,
      rpg: scenario.rpg,
      tacticalAssociation: scenario.tacticalAssociation,
    };

    expect(JSON.parse(JSON.stringify(saveFragment))).toEqual(saveFragment);
  });
});
