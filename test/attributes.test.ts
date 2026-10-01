import { describe, expect, it } from "vitest";
import {
  type AttributeDefinition,
  type AttributeState,
  adjustAttributeBase,
  initializeAttribute,
  setAttributeBase,
  validateAttributeDefinition,
  validateAttributeState,
} from "../src/attributes/index.js";

describe("attribute definition validation", () => {
  it("accepts title-neutral finite scalar values", () => {
    expect(
      validateAttributeDefinition({
        reference: "aptitude",
        initialBase: 12.5,
      }),
    ).toEqual({ kind: "valid" });
  });

  it("allows negative finite base values without imposing a balance invariant", () => {
    expect(
      validateAttributeDefinition({
        reference: "standing",
        initialBase: -3,
      }),
    ).toEqual({ kind: "valid" });
  });

  it("rejects non-JSON-safe references and non-finite values", () => {
    expect(
      validateAttributeDefinition({
        reference: Number.NaN,
        initialBase: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-reference" }, { kind: "invalid-initial-base" }],
    });
  });
});

describe("attribute state and transitions", () => {
  const definition = {
    reference: "aptitude",
    initialBase: 10,
  } as const satisfies AttributeDefinition;

  it("initializes from the authored base value", () => {
    expect(initializeAttribute(definition)).toEqual({
      kind: "initialized",
      state: { attribute: "aptitude", base: 10 },
    });
  });

  it("validates definition/state association and finite base values", () => {
    expect(
      validateAttributeState(definition, {
        attribute: "other",
        base: 10,
      } as AttributeState<string>),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "attribute-reference-mismatch" },
    });

    expect(
      validateAttributeState(definition, {
        attribute: "aptitude",
        base: Number.NaN,
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "invalid-base" },
    });
  });

  it("sets base deterministically and returns unchanged for an identical value", () => {
    const state = { attribute: "aptitude", base: 10 } as const;

    expect(setAttributeBase(definition, state, 14)).toEqual({
      kind: "changed",
      state: { attribute: "aptitude", base: 14 },
    });

    expect(setAttributeBase(definition, state, 10)).toEqual({
      kind: "unchanged",
      state,
    });
  });

  it("adjusts base with positive and negative deltas without implicit clamps", () => {
    const state = { attribute: "aptitude", base: 10 } as const;

    expect(adjustAttributeBase(definition, state, 3)).toEqual({
      kind: "changed",
      state: { attribute: "aptitude", base: 13 },
    });

    expect(adjustAttributeBase(definition, state, -15)).toEqual({
      kind: "changed",
      state: { attribute: "aptitude", base: -5 },
    });
  });

  it("returns unchanged for zero delta", () => {
    const state = { attribute: "aptitude", base: 10 } as const;

    expect(adjustAttributeBase(definition, state, 0)).toEqual({
      kind: "unchanged",
      state,
    });
  });

  it("rejects invalid operation values and invalid starting state", () => {
    const state = { attribute: "aptitude", base: 10 } as const;

    expect(setAttributeBase(definition, state, Number.NaN)).toEqual({
      kind: "rejected",
      reason: "invalid-base",
      state,
    });

    expect(adjustAttributeBase(definition, state, Number.POSITIVE_INFINITY)).toEqual({
      kind: "rejected",
      reason: "invalid-delta",
      state,
    });

    const invalid = {
      attribute: "aptitude",
      base: Number.NaN,
    } as const;

    expect(adjustAttributeBase(definition, invalid, 1)).toEqual({
      kind: "rejected",
      reason: "invalid-base",
      state: invalid,
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = { attribute: "aptitude", base: 10 } as const;

    expect(adjustAttributeBase(definition, state, 2.5)).toEqual(
      adjustAttributeBase(definition, state, 2.5),
    );
    expect(state).toEqual({ attribute: "aptitude", base: 10 });
  });

  it("round-trips representative state through JSON", () => {
    const state = { attribute: "aptitude", base: -2.25 } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("first-game formula pressure test", () => {
  it("keeps derived formulas and modifier algebra in the consuming game", () => {
    type GameAttribute = "Power" | "Guard";

    const powerDefinition: AttributeDefinition<GameAttribute> = {
      reference: "Power",
      initialBase: 18,
    };
    const guardDefinition: AttributeDefinition<GameAttribute> = {
      reference: "Guard",
      initialBase: 7,
    };

    const power = initializeAttribute(powerDefinition);
    const guard = initializeAttribute(guardDefinition);

    if (power.kind !== "initialized" || guard.kind !== "initialized") {
      throw new Error("pressure-test definitions must be valid");
    }

    const equipmentFlatBonus = 4;
    const roleMultiplier = 1.25;

    const attackRating = (power.state.base + equipmentFlatBonus) * roleMultiplier;
    const mitigationScore = Math.max(0, guard.state.base * 2 - 3);

    expect(attackRating).toBe(27.5);
    expect(mitigationScore).toBe(11);

    expect(power.state).toEqual({ attribute: "Power", base: 18 });
    expect(guard.state).toEqual({ attribute: "Guard", base: 7 });
  });
});
