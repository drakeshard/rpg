import { describe, expect, it } from "vitest";
import {
  assignLoadoutEquipment,
  clearLoadoutSlot,
  initializeLoadout,
  type LoadoutDefinition,
  type LoadoutState,
  validateLoadoutDefinition,
  validateLoadoutState,
} from "../src/loadout/index.js";

describe("loadout definition validation", () => {
  it("accepts title-neutral game-defined slot references", () => {
    expect(
      validateLoadoutDefinition({
        slots: ["primary", "secondary", "utility"],
      }),
    ).toEqual({ kind: "valid" });
  });

  it("accepts numeric slot references without imposing an ID scheme", () => {
    expect(validateLoadoutDefinition({ slots: [1, 2, 9] })).toEqual({ kind: "valid" });
  });

  it("rejects empty, duplicate, and non-JSON-safe slot references", () => {
    expect(validateLoadoutDefinition({ slots: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-slots" }],
    });

    expect(validateLoadoutDefinition({ slots: ["primary", "primary"] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "duplicate-slot-reference", slot: "primary" }],
    });

    expect(validateLoadoutDefinition({ slots: [Number.NaN] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-slot-reference", slot: Number.NaN }],
    });
  });
});

describe("loadout state and transitions", () => {
  const definition = {
    slots: ["primary", "secondary", "utility"],
  } as const satisfies LoadoutDefinition;

  it("initializes with no assignments", () => {
    expect(initializeLoadout(definition)).toEqual({
      kind: "initialized",
      state: { assignments: [] },
    });
  });

  it("assigns an equipment reference to an empty slot", () => {
    const state = { assignments: [] } as LoadoutState<string, string>;

    expect(assignLoadoutEquipment(definition, state, "primary", "item-a")).toEqual({
      kind: "changed",
      state: {
        assignments: [{ slot: "primary", equipment: "item-a" }],
      },
    });
  });

  it("replaces an occupied slot while preserving assignment position", () => {
    const state = {
      assignments: [
        { slot: "primary", equipment: "item-a" },
        { slot: "utility", equipment: "item-b" },
      ],
    } as const;

    expect(assignLoadoutEquipment(definition, state, "primary", "item-c")).toEqual({
      kind: "changed",
      state: {
        assignments: [
          { slot: "primary", equipment: "item-c" },
          { slot: "utility", equipment: "item-b" },
        ],
      },
    });
  });

  it("clears an occupied slot while preserving remaining order", () => {
    const state = {
      assignments: [
        { slot: "primary", equipment: "item-a" },
        { slot: "secondary", equipment: "item-b" },
        { slot: "utility", equipment: "item-c" },
      ],
    } as const;

    expect(clearLoadoutSlot(definition, state, "secondary")).toEqual({
      kind: "changed",
      state: {
        assignments: [
          { slot: "primary", equipment: "item-a" },
          { slot: "utility", equipment: "item-c" },
        ],
      },
    });
  });

  it("allows the same equipment reference in multiple slots", () => {
    const state = {
      assignments: [{ slot: "primary", equipment: "shared-definition" }],
    } as const;

    expect(assignLoadoutEquipment(definition, state, "secondary", "shared-definition")).toEqual({
      kind: "changed",
      state: {
        assignments: [
          { slot: "primary", equipment: "shared-definition" },
          { slot: "secondary", equipment: "shared-definition" },
        ],
      },
    });
  });

  it("rejects unknown slots, invalid equipment references, and clearing empty slots", () => {
    const state = { assignments: [] } as LoadoutState<string, number>;

    expect(
      assignLoadoutEquipment(definition as LoadoutDefinition<string>, state, "unknown", 1),
    ).toEqual({
      kind: "rejected",
      reason: "slot-not-defined",
      state,
    });

    expect(assignLoadoutEquipment(definition, state, "primary", Number.NaN)).toEqual({
      kind: "rejected",
      reason: "invalid-equipment-reference",
      state,
    });

    expect(clearLoadoutSlot(definition, state, "primary")).toEqual({
      kind: "rejected",
      reason: "slot-empty",
      state,
    });
  });

  it("validates defined unique slots and JSON-safe equipment references", () => {
    expect(
      validateLoadoutState(definition as LoadoutDefinition<string>, {
        assignments: [{ slot: "unknown", equipment: "item-a" }],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "assignment-slot-not-defined", slot: "unknown" },
    });

    expect(
      validateLoadoutState(definition, {
        assignments: [
          { slot: "primary", equipment: "item-a" },
          { slot: "primary", equipment: "item-b" },
        ],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "duplicate-slot-assignment", slot: "primary" },
    });

    expect(
      validateLoadoutState(definition, {
        assignments: [{ slot: "primary", equipment: Number.NaN }],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "invalid-equipment-reference", equipment: Number.NaN },
    });
  });

  it("rejects transitions from invalid runtime state", () => {
    const invalid = {
      assignments: [
        { slot: "primary", equipment: "item-a" },
        { slot: "primary", equipment: "item-b" },
      ],
    } as const;

    expect(assignLoadoutEquipment(definition, invalid, "secondary", "item-c")).toEqual({
      kind: "rejected",
      reason: "duplicate-slot-assignment",
      state: invalid,
    });
  });

  it("rejects initialization from an invalid definition", () => {
    expect(initializeLoadout({ slots: [] })).toEqual({
      kind: "rejected",
      reason: "invalid-definition",
      issues: [{ kind: "empty-slots" }],
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = {
      assignments: [{ slot: "primary", equipment: "item-a" }],
    } as const;

    expect(assignLoadoutEquipment(definition, state, "utility", "item-b")).toEqual(
      assignLoadoutEquipment(definition, state, "utility", "item-b"),
    );
    expect(state).toEqual({
      assignments: [{ slot: "primary", equipment: "item-a" }],
    });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = {
      assignments: [
        { slot: "primary", equipment: "item-a" },
        { slot: "utility", equipment: 42 },
      ],
    } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
