import { EQUIPMENT, QUESTS, type EquipmentDefinition, type QuestDefinition } from "./progression-content";
import {
  WardenProfile,
  type EquipmentId,
  type WardenCapability,
  type WardenSkillChoice,
  type WardenSlot,
} from "./rpg-player-profile";

export interface QuestUpdate {
  completed?: QuestDefinition;
  rankGained: number;
  rewardXp: number;
  rewardGold: number;
}

export interface DerivedStats {
  strikeDamage: number;
  maxHealth: number;
  maxStamina: number;
  armor: number;
  moveSpeed: number;
  dashCooldown: number;
}

export class OpenfieldProgression {
  readonly profile = new WardenProfile();
  readonly inventory = new Set<EquipmentId>(["field-sword", "warden-coat", "trail-charm"]);
  questIndex = 0;
  questProgress = 0;
  gold = 0;
  private cooldowns = new Map<WardenCapability, number>();

  reset(): void {
    this.profile.reset();
    this.inventory.clear();
    this.inventory.add("field-sword");
    this.inventory.add("warden-coat");
    this.inventory.add("trail-charm");
    this.questIndex = 0;
    this.questProgress = 0;
    this.gold = 0;
    this.cooldowns.clear();
  }

  get currentQuest(): QuestDefinition | null {
    return QUESTS[this.questIndex] ?? null;
  }

  get stats(): DerivedStats {
    const weapon = this.equipment("weapon");
    const armor = this.equipment("armor");
    const charm = this.equipment("charm");
    const strength = this.profile.attribute("strength");
    const agility = this.profile.attribute("agility");
    const vitality = this.profile.attribute("vitality");
    const bladeRank = this.profile.skillRank("blade-mastery");
    const windRank = this.profile.skillRank("wind-discipline");
    const heartRank = this.profile.skillRank("iron-heart");

    const equipmentAttack = weapon.attack + armor.attack + charm.attack;
    const equipmentArmor = weapon.armor + armor.armor + charm.armor;
    const equipmentVitality = weapon.vitality + armor.vitality + charm.vitality;
    const equipmentAgility = weapon.agility + armor.agility + charm.agility;

    return {
      strikeDamage: Math.round((25 + strength * 0.7 + equipmentAttack) * (1 + bladeRank * 0.08)),
      maxHealth: Math.round(100 + (vitality - 10) * 4 + equipmentVitality + heartRank * 8),
      maxStamina: Math.round(100 + Math.max(0, agility + equipmentAgility - 10) * 2),
      armor: Math.max(0, Math.round(equipmentArmor + vitality * 0.18)),
      moveSpeed: 230 + (agility + equipmentAgility - 10) * 3,
      dashCooldown: Math.max(0.62, 1.05 * (1 - windRank * 0.1)),
    };
  }

  equipment(slot: WardenSlot): EquipmentDefinition {
    const id = this.profile.equipped(slot);
    if (id === null) throw new Error(`Openfield loadout slot is empty: ${slot}`);
    return EQUIPMENT[id];
  }

  addXp(amount: number): number {
    const before = this.profile.rankIndex;
    const gained = this.profile.gainXp(amount);
    const difference = this.profile.rankIndex - before;
    for (let i = 0; i < difference; i++) {
      this.profile.increaseAttribute("strength", 1);
      this.profile.increaseAttribute("vitality", 1);
      if ((before + i + 1) % 2 === 0) this.profile.increaseAttribute("agility", 1);
    }
    return gained;
  }

  private completeQuest(): QuestUpdate {
    const quest = this.currentQuest;
    if (quest === null) return { rankGained: 0, rewardXp: 0, rewardGold: 0 };
    const rankGained = this.addXp(quest.rewardXp);
    this.gold += quest.rewardGold;
    this.questIndex++;
    this.questProgress = 0;
    return {
      completed: quest,
      rankGained,
      rewardXp: quest.rewardXp,
      rewardGold: quest.rewardGold,
    };
  }

  recordKill(areaId: string): QuestUpdate | null {
    const quest = this.currentQuest;
    if (quest === null) return null;
    if (quest.id === "first-blood") {
      this.questProgress++;
    } else if (quest.id === "fenwatch" && areaId === "fenwatch") {
      this.questProgress++;
    } else {
      return null;
    }
    if (this.questProgress >= quest.target) return this.completeQuest();
    return null;
  }

  recordBeacon(): QuestUpdate | null {
    const quest = this.currentQuest;
    if (quest?.id !== "beacon") return null;
    this.questProgress = 1;
    return this.completeQuest();
  }

  collectEquipment(id: EquipmentId): { equipped: boolean; item: EquipmentDefinition } {
    const item = EQUIPMENT[id];
    this.inventory.add(id);
    const current = this.equipment(item.slot);
    const equipped = item.tier > current.tier;
    if (equipped) this.profile.equip(item.slot, id);
    return { equipped, item };
  }

  equip(id: EquipmentId): boolean {
    if (!this.inventory.has(id)) return false;
    return this.profile.equip(EQUIPMENT[id].slot, id);
  }

  spendSkillPoint(choice: WardenSkillChoice): boolean {
    return this.profile.spendSkillPoint(choice);
  }

  ownsSkill(skill: WardenCapability): boolean {
    return this.profile.ownsCapability(skill);
  }

  cooldown(skill: WardenCapability): number {
    return this.cooldowns.get(skill) ?? 0;
  }

  updateCooldowns(dt: number): void {
    for (const [skill, remaining] of this.cooldowns) {
      const next = Math.max(0, remaining - dt);
      if (next <= 0) this.cooldowns.delete(skill);
      else this.cooldowns.set(skill, next);
    }
  }

  triggerSkill(skill: WardenCapability, cooldown: number): boolean {
    if (!this.ownsSkill(skill) || this.cooldown(skill) > 0) return false;
    this.cooldowns.set(skill, cooldown);
    return true;
  }
}

export function equipmentDropForArea(
  areaId: string,
  random01: () => number,
): EquipmentId | null {
  const roll = random01();
  if (areaId === "greywood") {
    if (roll < 0.08) return "thorn-blade";
    if (roll < 0.14) return "ember-seal";
    return null;
  }
  if (areaId === "fenwatch") {
    if (roll < 0.07) return "mire-mail";
    if (roll < 0.13) return "ember-seal";
    return null;
  }
  if (roll < 0.05) return "ruin-greatsword";
  if (roll < 0.1) return "ruin-plate";
  if (roll < 0.16) return "beacon-sigil";
  return null;
}
