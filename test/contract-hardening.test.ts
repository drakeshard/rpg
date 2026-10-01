import { describe, expect, it } from "vitest";
import {
  advanceAdvancement,
  initializeAdvancement,
  validateAdvancementTrackDefinition,
} from "../src/advancement/index.js";
import {
  adjustAttributeBase,
  setAttributeBase,
  validateAttributeDefinition,
} from "../src/attributes/index.js";
import {
  grantCapability,
  revokeCapability,
  validateCapabilityCatalogDefinition,
} from "../src/capabilities/index.js";
import {
  assignLoadoutEquipment,
  clearLoadoutSlot,
  validateLoadoutDefinition,
  validateLoadoutState,
} from "../src/loadout/index.js";
import {
  decreaseResource,
  increaseResource,
  setResourceCapacity,
  setResourceCurrent,
  validateResourceDefinition,
} from "../src/resources/index.js";
import {
  activateRole,
  deactivateRole,
  grantRole,
  revokeRole,
  validateRoleCatalogDefinition,
} from "../src/roles/index.js";
import {
  increaseSpecializationChoiceRank,
  selectSpecializationChoice,
  validateSpecializationDefinition,
} from "../src/specialization/index.js";

describe("definition and rejection diagnostics", () => {
  it("identifies offending collection references and values without a shared result type", () => {
    expect(
      validateRoleCatalogDefinition<number>({
        roles: [1, 1, Number.NaN],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "duplicate-role-reference", role: 1 },
        { kind: "invalid-role-reference", role: Number.NaN },
      ],
    });

    expect(
      validateSpecializationDefinition<string, string>({
        reference: "discipline",
        choices: [{ reference: "precision", maxRank: 1.5 }],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-max-rank", choice: "precision", maxRank: 1.5 }],
    });

    expect(
      validateLoadoutState(
        { slots: ["weapon"] },
        { assignments: [{ slot: "weapon", equipment: Number.NaN }] },
      ),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "invalid-equipment-reference", equipment: Number.NaN },
    });
  });

  it("keeps scalar diagnostics module-local and field-specific", () => {
    expect(
      validateResourceDefinition({
        reference: "mana",
        initialCurrent: Number.NaN,
        initialCapacity: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-initial-capacity" }, { kind: "invalid-initial-current" }],
    });

    expect(
      validateAttributeDefinition({
        reference: "strength",
        initialBase: Number.NEGATIVE_INFINITY,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-initial-base" }],
    });
  });
});

describe("definition edge-case validation", () => {
  it("rejects empty, duplicate, and non-finite advancement references", () => {
    expect(
      validateAdvancementTrackDefinition<number, number>({
        reference: Number.POSITIVE_INFINITY,
        ranks: [1, 1, Number.NaN],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "invalid-track-reference" },
        { kind: "duplicate-rank-reference", rank: 1 },
        { kind: "invalid-rank-reference", rank: Number.NaN },
      ],
    });
    expect(validateAdvancementTrackDefinition({ reference: "empty", ranks: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-ranks" }],
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite role references: %s",
    (role) => {
      expect(validateRoleCatalogDefinition<number>({ roles: [role] })).toEqual({
        kind: "invalid",
        issues: [{ kind: "invalid-role-reference", role }],
      });
    },
  );

  it("accepts finite fractional resource values but rejects negative or non-finite boundaries", () => {
    expect(
      validateResourceDefinition({
        reference: "energy",
        initialCurrent: 0.5,
        initialCapacity: 1.5,
      }),
    ).toEqual({ kind: "valid" });

    expect(
      validateResourceDefinition({
        reference: "energy",
        initialCurrent: -1,
        initialCapacity: 0,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-initial-current" }],
    });

    expect(
      validateResourceDefinition({
        reference: "energy",
        initialCurrent: 2,
        initialCapacity: 1,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "initial-current-exceeds-capacity" }],
    });
  });

  it("accepts all finite attribute bases and rejects non-finite bases", () => {
    for (const base of [-2.5, 0, 3.25]) {
      expect(validateAttributeDefinition({ reference: "attribute", initialBase: base })).toEqual({
        kind: "valid",
      });
    }

    for (const base of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(validateAttributeDefinition({ reference: "attribute", initialBase: base })).toEqual({
        kind: "invalid",
        issues: [{ kind: "invalid-initial-base" }],
      });
    }
  });

  it("requires positive integer specialization ranks and unique JSON-safe choices", () => {
    for (const maxRank of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validateSpecializationDefinition({
          reference: "discipline",
          choices: [{ reference: "choice", maxRank }],
        }),
      ).toEqual({
        kind: "invalid",
        issues: [{ kind: "invalid-max-rank", choice: "choice", maxRank }],
      });
    }

    expect(
      validateSpecializationDefinition({
        reference: "discipline",
        choices: [
          { reference: "choice", maxRank: 1 },
          { reference: "choice", maxRank: 2 },
        ],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "duplicate-choice-reference", choice: "choice" }],
    });
  });

  it("rejects empty, duplicate, and non-finite capability references", () => {
    expect(validateCapabilityCatalogDefinition({ capabilities: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-capabilities" }],
    });
    expect(
      validateCapabilityCatalogDefinition<number>({
        capabilities: [7, 7, Number.NEGATIVE_INFINITY],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "duplicate-capability-reference", capability: 7 },
        { kind: "invalid-capability-reference", capability: Number.NEGATIVE_INFINITY },
      ],
    });
  });

  it("rejects empty, duplicate, and non-finite loadout slots", () => {
    expect(validateLoadoutDefinition({ slots: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-slots" }],
    });
    expect(
      validateLoadoutDefinition<number>({
        slots: [1, 1, Number.POSITIVE_INFINITY],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "duplicate-slot-reference", slot: 1 },
        { kind: "invalid-slot-reference", slot: Number.POSITIVE_INFINITY },
      ],
    });
  });
});

describe("transition immutability and invariant preservation", () => {
  it("keeps advancement definitions/state immutable through deterministic completion", () => {
    const definition = { reference: "mastery", ranks: ["novice", "adept", "master"] } as const;
    const definitionSnapshot = structuredClone(definition);
    const initialized = initializeAdvancement(definition);
    if (initialized.kind !== "initialized") throw new Error("valid definition must initialize");
    const initialState = initialized.state;
    const initialSnapshot = structuredClone(initialState);

    const adept = advanceAdvancement(definition, initialState);
    if (adept.kind !== "advanced") throw new Error("first advance must succeed");
    const master = advanceAdvancement(definition, adept.state);
    if (master.kind !== "advanced") throw new Error("second advance must succeed");
    const complete = advanceAdvancement(definition, master.state);

    expect(complete).toEqual({ kind: "complete", state: master.state });
    expect(definition).toEqual(definitionSnapshot);
    expect(initialState).toEqual(initialSnapshot);
  });

  it("preserves role order and rejected-state identity through a longer sequence", () => {
    const definition = { roles: ["guardian", "arcanist", "ranger"] } as const;
    const start = { owned: [] as readonly string[], active: null as string | null };

    const guardian = grantRole(definition, start, "guardian");
    if (guardian.kind !== "changed") throw new Error("guardian grant must succeed");
    const arcanist = grantRole(definition, guardian.state, "arcanist");
    if (arcanist.kind !== "changed") throw new Error("arcanist grant must succeed");
    const active = activateRole(definition, arcanist.state, "arcanist");
    if (active.kind !== "changed") throw new Error("activation must succeed");

    const rejected = revokeRole(definition, active.state, "arcanist");
    expect(rejected).toEqual({
      kind: "rejected",
      reason: "active-role-must-be-deactivated",
      state: active.state,
    });
    if (rejected.kind !== "rejected") throw new Error("active revoke must reject");
    expect(rejected.state).toBe(active.state);

    const inactive = deactivateRole(definition, active.state);
    if (inactive.kind !== "changed") throw new Error("deactivation must succeed");
    const revoked = revokeRole(definition, inactive.state, "guardian");
    if (revoked.kind !== "changed") throw new Error("guardian revoke must succeed");
    expect(revoked.state.owned).toEqual(["arcanist"]);
    expect(start).toEqual({ owned: [], active: null });
  });

  it("keeps resource invariants and input state unchanged across clamping/rejection", () => {
    const definition = { reference: "mana", initialCurrent: 5, initialCapacity: 10 } as const;
    const start = { resource: "mana", current: 5, capacity: 10 } as const;
    const snapshot = structuredClone(start);

    const increased = increaseResource(definition, start, 20);
    expect(increased).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "mana", current: 10, capacity: 10 },
    });
    const decreased =
      increased.kind === "changed" ? decreaseResource(definition, increased.state, 3.5) : increased;
    expect(decreased).toEqual({
      kind: "changed",
      clamped: false,
      state: { resource: "mana", current: 6.5, capacity: 10 },
    });
    const resized =
      decreased.kind === "changed"
        ? setResourceCapacity(definition, decreased.state, 4)
        : decreased;
    expect(resized).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "mana", current: 4, capacity: 4 },
    });

    const rejected = setResourceCurrent(definition, start, Number.NaN);
    expect(rejected).toEqual({ kind: "rejected", reason: "invalid-amount", state: start });
    if (rejected.kind !== "rejected") throw new Error("NaN current must reject");
    expect(rejected.state).toBe(start);
    expect(start).toEqual(snapshot);
  });

  it("keeps attribute input state immutable and rejects overflow without mutation", () => {
    const definition = { reference: "strength", initialBase: 10 } as const;
    const start = { attribute: "strength", base: Number.MAX_VALUE } as const;
    const rejected = adjustAttributeBase(definition, start, Number.MAX_VALUE);
    expect(rejected).toEqual({ kind: "rejected", reason: "invalid-base", state: start });
    if (rejected.kind !== "rejected") throw new Error("overflow must reject");
    expect(rejected.state).toBe(start);

    const normal = setAttributeBase(definition, { attribute: "strength", base: 10 }, 12.5);
    expect(normal).toEqual({ kind: "changed", state: { attribute: "strength", base: 12.5 } });
  });

  it("preserves specialization selection order and unaffected values", () => {
    const definition = {
      reference: "discipline",
      choices: [
        { reference: "precision", maxRank: 3 },
        { reference: "control", maxRank: 2 },
      ],
    } as const;
    const start = { specialization: "discipline", selections: [] } as const;
    const precision = selectSpecializationChoice(definition, start, "precision");
    if (precision.kind !== "changed") throw new Error("precision selection must succeed");
    const control = selectSpecializationChoice(definition, precision.state, "control");
    if (control.kind !== "changed") throw new Error("control selection must succeed");
    const ranked = increaseSpecializationChoiceRank(definition, control.state, "precision");
    expect(ranked).toEqual({
      kind: "changed",
      state: {
        specialization: "discipline",
        selections: [
          { choice: "precision", rank: 2 },
          { choice: "control", rank: 1 },
        ],
      },
    });
    expect(start.selections).toEqual([]);
  });

  it("preserves capability ownership order and rejected-state identity", () => {
    const definition = { capabilities: ["dash", "guard", "heal"] } as const;
    const start = { owned: ["dash", "guard"] } as const;
    const granted = grantCapability(definition, start, "heal");
    expect(granted).toEqual({ kind: "changed", state: { owned: ["dash", "guard", "heal"] } });
    const duplicate = grantCapability(definition, start, "dash");
    expect(duplicate).toEqual({
      kind: "rejected",
      reason: "capability-already-owned",
      state: start,
    });
    if (duplicate.kind !== "rejected") throw new Error("duplicate grant must reject");
    expect(duplicate.state).toBe(start);
    const revoked = revokeCapability(definition, start, "dash");
    expect(revoked).toEqual({ kind: "changed", state: { owned: ["guard"] } });
  });

  it("preserves loadout assignment order on replacement and unaffected assignments", () => {
    const definition = { slots: ["weapon", "armor", "accessory"] } as const;
    const start = {
      assignments: [
        { slot: "weapon", equipment: "iron-sword" },
        { slot: "armor", equipment: "leather-coat" },
      ],
    } as const;
    const replaced = assignLoadoutEquipment(definition, start, "weapon", "steel-sword");
    expect(replaced).toEqual({
      kind: "changed",
      state: {
        assignments: [
          { slot: "weapon", equipment: "steel-sword" },
          { slot: "armor", equipment: "leather-coat" },
        ],
      },
    });
    const cleared = clearLoadoutSlot(definition, start, "armor");
    expect(cleared).toEqual({
      kind: "changed",
      state: { assignments: [{ slot: "weapon", equipment: "iron-sword" }] },
    });
    expect(start.assignments).toEqual([
      { slot: "weapon", equipment: "iron-sword" },
      { slot: "armor", equipment: "leather-coat" },
    ]);
  });
});
