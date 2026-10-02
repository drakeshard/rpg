import type { EquipmentId, WardenSkillChoice, WardenSlot } from "./rpg-player-profile";

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  slot: WardenSlot;
  tier: number;
  attack: number;
  armor: number;
  vitality: number;
  agility: number;
  description: string;
}

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  "field-sword": {
    id: "field-sword", name: "Field Sword", slot: "weapon", tier: 1,
    attack: 4, armor: 0, vitality: 0, agility: 0,
    description: "Balanced Warden issue blade.",
  },
  "thorn-blade": {
    id: "thorn-blade", name: "Thorn Blade", slot: "weapon", tier: 2,
    attack: 9, armor: 0, vitality: 0, agility: 2,
    description: "Fast Greywood steel with a hooked edge.",
  },
  "ruin-greatsword": {
    id: "ruin-greatsword", name: "Ruin Greatsword", slot: "weapon", tier: 3,
    attack: 16, armor: 0, vitality: 3, agility: -1,
    description: "Heavy beacon-forged relic blade.",
  },
  "warden-coat": {
    id: "warden-coat", name: "Warden Coat", slot: "armor", tier: 1,
    attack: 0, armor: 3, vitality: 4, agility: 0,
    description: "Layered field leathers.",
  },
  "mire-mail": {
    id: "mire-mail", name: "Mire Mail", slot: "armor", tier: 2,
    attack: 0, armor: 7, vitality: 8, agility: -1,
    description: "Corrosion-resistant mail from Fenwatch.",
  },
  "ruin-plate": {
    id: "ruin-plate", name: "Beacon Plate", slot: "armor", tier: 3,
    attack: 0, armor: 12, vitality: 14, agility: -2,
    description: "Ancient plate restored with beacon light.",
  },
  "trail-charm": {
    id: "trail-charm", name: "Trail Charm", slot: "charm", tier: 1,
    attack: 0, armor: 0, vitality: 0, agility: 2,
    description: "Simple wayfarer's knot.",
  },
  "ember-seal": {
    id: "ember-seal", name: "Ember Seal", slot: "charm", tier: 2,
    attack: 4, armor: 1, vitality: 0, agility: 3,
    description: "Warm seal carried by Fenwatch hunters.",
  },
  "beacon-sigil": {
    id: "beacon-sigil", name: "Beacon Sigil", slot: "charm", tier: 3,
    attack: 6, armor: 3, vitality: 6, agility: 4,
    description: "A living fragment of the Greywood beacon.",
  },
};

export interface SkillNode {
  choice: WardenSkillChoice;
  name: string;
  description: string;
  rankText: readonly string[];
}
export const SKILL_TREE: readonly SkillNode[] = [
  {
    choice: "blade-mastery",
    name: "Blade Mastery",
    description: "Raises strike damage. Rank II unlocks Aegis Burst.",
    rankText: ["+8% strike damage", "+16% and Aegis Burst", "+25% strike damage"],
  },
  {
    choice: "wind-discipline",
    name: "Wind Discipline",
    description: "Improves mobility. Rank II unlocks Wind Step.",
    rankText: ["-10% dash cooldown", "-20% and Wind Step", "-30% dash cooldown"],
  },
  {
    choice: "iron-heart",
    name: "Iron Heart",
    description: "Improves survivability and campfire recovery.",
    rankText: ["+8 max HP", "+16 max HP", "+26 max HP"],
  },
];

export type QuestId = "first-blood" | "fenwatch" | "beacon";
export interface QuestDefinition {
  id: QuestId;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  rewardGold: number;
}
export const QUESTS: readonly QuestDefinition[] = [
  {
    id: "first-blood",
    title: "Break the Greywood Patrol",
    description: "Defeat corrupted sentries in Greywood.",
    target: 6,
    rewardXp: 90,
    rewardGold: 20,
  },
  {
    id: "fenwatch",
    title: "Thin the Fenwatch Horde",
    description: "Push south-east and defeat Fenwatch creatures.",
    target: 10,
    rewardXp: 160,
    rewardGold: 35,
  },
  {
    id: "beacon",
    title: "Awaken the Broken Beacon",
    description: "Reach the eastern ruins and activate the beacon.",
    target: 1,
    rewardXp: 260,
    rewardGold: 60,
  },
];
