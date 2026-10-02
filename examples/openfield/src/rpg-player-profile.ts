import {
  advanceAdvancement,
  initializeAdvancement,
  type AdvancementState,
  type AdvancementTrackDefinition,
} from "../../../src/advancement/index";
import {
  adjustAttributeBase,
  initializeAttribute,
  type AttributeDefinition,
  type AttributeState,
} from "../../../src/attributes/index";
import {
  grantCapability,
  initializeCapabilityOwnership,
  type CapabilityCatalogDefinition,
  type CapabilityOwnershipState,
} from "../../../src/capabilities/index";
import {
  assignLoadoutEquipment,
  initializeLoadout,
  type LoadoutDefinition,
  type LoadoutState,
} from "../../../src/loadout/index";
import {
  activateRole,
  grantRole,
  initializeRoles,
  type RoleCatalogDefinition,
  type RolesState,
} from "../../../src/roles/index";
import {
  increaseSpecializationChoiceRank,
  initializeSpecialization,
  selectSpecializationChoice,
  type SpecializationDefinition,
  type SpecializationState,
} from "../../../src/specialization/index";

export type WardenRank = "I" | "II" | "III" | "IV" | "V" | "VI";
export type WardenAttribute = "strength" | "agility" | "vitality";
export type WardenCapability = "crescent-arc" | "aegis-burst" | "wind-step";
export type WardenSkillChoice = "blade-mastery" | "wind-discipline" | "iron-heart";
export type WardenSlot = "weapon" | "armor" | "charm";
export type EquipmentId =
  | "field-sword"
  | "thorn-blade"
  | "ruin-greatsword"
  | "warden-coat"
  | "mire-mail"
  | "ruin-plate"
  | "trail-charm"
  | "ember-seal"
  | "beacon-sigil";

const advancementDefinition: AdvancementTrackDefinition<"warden-rank", WardenRank> = {
  reference: "warden-rank",
  ranks: ["I", "II", "III", "IV", "V", "VI"],
};
const roleDefinition: RoleCatalogDefinition<"warden"> = { roles: ["warden"] };
const capabilityDefinition: CapabilityCatalogDefinition<WardenCapability> = {
  capabilities: ["crescent-arc", "aegis-burst", "wind-step"],
};
const specializationDefinition: SpecializationDefinition<"warden-discipline", WardenSkillChoice> = {
  reference: "warden-discipline",
  choices: [
    { reference: "blade-mastery", maxRank: 3 },
    { reference: "wind-discipline", maxRank: 3 },
    { reference: "iron-heart", maxRank: 3 },
  ],
};
const loadoutDefinition: LoadoutDefinition<WardenSlot> = {
  slots: ["weapon", "armor", "charm"],
};
const attributeDefinitions: Record<WardenAttribute, AttributeDefinition<WardenAttribute>> = {
  strength: { reference: "strength", initialBase: 10 },
  agility: { reference: "agility", initialBase: 10 },
  vitality: { reference: "vitality", initialBase: 10 },
};

function initialized<T>(outcome: { kind: string; state?: T }, label: string): T {
  if (outcome.kind !== "initialized" || outcome.state === undefined) {
    throw new Error(`Invalid RPG incubation definition: ${label}`);
  }
  return outcome.state;
}

export const RANK_XP = [0, 120, 310, 600, 1000, 1550] as const;

export class WardenProfile {
  advancement: AdvancementState<"warden-rank", WardenRank>;
  roles: RolesState<"warden">;
  capabilities: CapabilityOwnershipState<WardenCapability>;
  specialization: SpecializationState<"warden-discipline", WardenSkillChoice>;
  loadout: LoadoutState<WardenSlot, EquipmentId>;
  attributes: Record<WardenAttribute, AttributeState<WardenAttribute>>;
  xp = 0;
  skillPoints = 1;

  constructor() {
    this.advancement = initialized(
      initializeAdvancement(advancementDefinition),
      "advancement",
    );
    let roles = initialized(initializeRoles(roleDefinition), "roles");
    const granted = grantRole(roleDefinition, roles, "warden");
    if (granted.kind === "changed") roles = granted.state;
    const activated = activateRole(roleDefinition, roles, "warden");
    if (activated.kind === "changed" || activated.kind === "unchanged") roles = activated.state;
    this.roles = roles;
    this.capabilities = initialized(
      initializeCapabilityOwnership(capabilityDefinition),
      "capabilities",
    );
    this.specialization = initialized(
      initializeSpecialization(specializationDefinition),
      "specialization",
    );
    this.loadout = initialized(initializeLoadout<WardenSlot, EquipmentId>(loadoutDefinition), "loadout");
    this.attributes = {
      strength: initialized(initializeAttribute(attributeDefinitions.strength), "strength"),
      agility: initialized(initializeAttribute(attributeDefinitions.agility), "agility"),
      vitality: initialized(initializeAttribute(attributeDefinitions.vitality), "vitality"),
    };
    this.equip("weapon", "field-sword");
    this.equip("armor", "warden-coat");
    this.equip("charm", "trail-charm");
    this.unlockCapability("crescent-arc");
  }

  reset(): void {
    const fresh = new WardenProfile();
    Object.assign(this, fresh);
  }

  get rank(): WardenRank {
    return this.advancement.rank;
  }

  get rankIndex(): number {
    return advancementDefinition.ranks.indexOf(this.advancement.rank);
  }

  get nextRankXp(): number | null {
    return RANK_XP[this.rankIndex + 1] ?? null;
  }

  gainXp(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    this.xp += amount;
    let gained = 0;
    let next = this.nextRankXp;
    while (next !== null && this.xp >= next) {
      const outcome = advanceAdvancement(advancementDefinition, this.advancement);
      if (outcome.kind !== "advanced") break;
      this.advancement = outcome.state;
      this.skillPoints += 1;
      gained++;
      next = this.nextRankXp;
    }
    return gained;
  }

  attribute(reference: WardenAttribute): number {
    return this.attributes[reference].base;
  }

  increaseAttribute(reference: WardenAttribute, amount = 1): boolean {
    const outcome = adjustAttributeBase(
      attributeDefinitions[reference],
      this.attributes[reference],
      amount,
    );
    if (outcome.kind !== "changed") return false;
    this.attributes[reference] = outcome.state;
    return true;
  }

  skillRank(choice: WardenSkillChoice): number {
    return this.specialization.selections.find((entry) => entry.choice === choice)?.rank ?? 0;
  }

  spendSkillPoint(choice: WardenSkillChoice): boolean {
    if (this.skillPoints <= 0) return false;
    const current = this.skillRank(choice);
    const outcome =
      current === 0
        ? selectSpecializationChoice(specializationDefinition, this.specialization, choice)
        : increaseSpecializationChoiceRank(specializationDefinition, this.specialization, choice);
    if (outcome.kind !== "changed") return false;
    this.specialization = outcome.state;
    this.skillPoints--;
    if (choice === "blade-mastery" && this.skillRank(choice) >= 2) {
      this.unlockCapability("aegis-burst");
    }
    if (choice === "wind-discipline" && this.skillRank(choice) >= 2) {
      this.unlockCapability("wind-step");
    }
    return true;
  }

  ownsCapability(capability: WardenCapability): boolean {
    return this.capabilities.owned.includes(capability);
  }

  unlockCapability(capability: WardenCapability): boolean {
    if (this.ownsCapability(capability)) return true;
    const outcome = grantCapability(capabilityDefinition, this.capabilities, capability);
    if (outcome.kind !== "changed") return false;
    this.capabilities = outcome.state;
    return true;
  }

  equip(slot: WardenSlot, equipment: EquipmentId): boolean {
    const outcome = assignLoadoutEquipment(loadoutDefinition, this.loadout, slot, equipment);
    if (outcome.kind !== "changed") return false;
    this.loadout = outcome.state;
    return true;
  }

  equipped(slot: WardenSlot): EquipmentId | null {
    return this.loadout.assignments.find((entry) => entry.slot === slot)?.equipment ?? null;
  }
}
