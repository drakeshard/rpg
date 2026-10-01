import { describe, expect, it } from "vitest";
import {
  assignLoadoutEquipment,
  initializeLoadout,
  type LoadoutDefinition,
  type LoadoutState,
} from "../src/loadout/index.js";

describe("first-game loadout composition pressure test", () => {
  it("keeps inventory possession and item-slot eligibility game-owned", () => {
    type Slot = "Weapon" | "Armor" | "Accessory";
    type ItemInstance = "sword-001" | "plate-001" | "ring-001";

    const definition: LoadoutDefinition<Slot> = {
      slots: ["Weapon", "Armor", "Accessory"],
    };
    const itemCategory: Readonly<Record<ItemInstance, Slot>> = {
      "sword-001": "Weapon",
      "plate-001": "Armor",
      "ring-001": "Accessory",
    };
    const inventory = new Set<ItemInstance>(["sword-001", "plate-001"]);

    const canEquip = (slot: Slot, item: ItemInstance): boolean =>
      inventory.has(item) && itemCategory[item] === slot;

    const initialized = initializeLoadout<Slot, ItemInstance>(definition);
    if (initialized.kind !== "initialized") throw new Error("definition must be valid");

    expect(canEquip("Weapon", "sword-001")).toBe(true);
    expect(canEquip("Accessory", "ring-001")).toBe(false);

    const equipped = assignLoadoutEquipment(definition, initialized.state, "Weapon", "sword-001");
    expect(equipped).toEqual({
      kind: "changed",
      state: {
        assignments: [{ slot: "Weapon", equipment: "sword-001" }],
      },
    });
  });

  it("keeps cross-slot conflicts and equipment effects in game composition", () => {
    type Slot = "MainHand" | "OffHand";
    type Equipment = "greatsword" | "shield";

    const definition: LoadoutDefinition<Slot> = {
      slots: ["MainHand", "OffHand"],
    };
    const initialized = initializeLoadout<Slot, Equipment>(definition);
    if (initialized.kind !== "initialized") throw new Error("definition must be valid");

    const mainHand = assignLoadoutEquipment(
      definition,
      initialized.state,
      "MainHand",
      "greatsword",
    );
    if (mainHand.kind !== "changed") throw new Error("main hand assignment must succeed");

    const offHand = assignLoadoutEquipment(definition, mainHand.state, "OffHand", "shield");
    if (offHand.kind !== "changed") throw new Error("structural assignment remains valid");

    const isGameLegal = (state: LoadoutState<Slot, Equipment>): boolean => {
      const main = state.assignments.find((assignment) => assignment.slot === "MainHand");
      const off = state.assignments.find((assignment) => assignment.slot === "OffHand");
      return !(main?.equipment === "greatsword" && off !== undefined);
    };

    const attackBonusByEquipment: Readonly<Record<Equipment, number>> = {
      greatsword: 8,
      shield: 1,
    };
    const attackBonus = offHand.state.assignments.reduce(
      (sum, assignment) => sum + attackBonusByEquipment[assignment.equipment],
      0,
    );

    expect(isGameLegal(offHand.state)).toBe(false);
    expect(attackBonus).toBe(9);
  });
});
