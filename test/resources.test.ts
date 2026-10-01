import { describe, expect, it } from "vitest";
import {
  decreaseResource,
  increaseResource,
  initializeResource,
  type ResourceDefinition,
  type ResourceState,
  setResourceCapacity,
  setResourceCurrent,
  validateResourceDefinition,
  validateResourceState,
} from "../src/resources/index.js";

describe("resource definition validation", () => {
  it("accepts title-neutral finite current/capacity definitions", () => {
    expect(
      validateResourceDefinition({
        reference: "resolve",
        initialCurrent: 25,
        initialCapacity: 40,
      }),
    ).toEqual({ kind: "valid" });
  });

  it("rejects invalid references, values, and current above capacity", () => {
    expect(
      validateResourceDefinition({
        reference: Number.NaN,
        initialCurrent: -1,
        initialCapacity: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "invalid-reference" },
        { kind: "invalid-initial-capacity" },
        { kind: "invalid-initial-current" },
      ],
    });

    expect(
      validateResourceDefinition({
        reference: "focus",
        initialCurrent: 11,
        initialCapacity: 10,
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "initial-current-exceeds-capacity" }],
    });
  });
});

describe("resource state and transitions", () => {
  const definition = {
    reference: "resolve",
    initialCurrent: 30,
    initialCapacity: 50,
  } as const satisfies ResourceDefinition;

  it("initializes from authored initial current and capacity", () => {
    expect(initializeResource(definition)).toEqual({
      kind: "initialized",
      state: { resource: "resolve", current: 30, capacity: 50 },
    });
  });

  it("validates resource reference and current/capacity invariants", () => {
    expect(
      validateResourceState(definition, {
        resource: "other",
        current: 10,
        capacity: 20,
      } as ResourceState<string>),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "resource-reference-mismatch" },
    });

    expect(
      validateResourceState(definition, {
        resource: "resolve",
        current: 21,
        capacity: 20,
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "current-exceeds-capacity" },
    });
  });

  it("increases and decreases deterministically with explicit clamping", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(increaseResource(definition, state, 10)).toEqual({
      kind: "changed",
      clamped: false,
      state: { resource: "resolve", current: 40, capacity: 50 },
    });

    expect(increaseResource(definition, state, 100)).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "resolve", current: 50, capacity: 50 },
    });

    expect(decreaseResource(definition, state, 10)).toEqual({
      kind: "changed",
      clamped: false,
      state: { resource: "resolve", current: 20, capacity: 50 },
    });

    expect(decreaseResource(definition, state, 100)).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "resolve", current: 0, capacity: 50 },
    });
  });

  it("sets current with bound clamping and zero-policy neutrality", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(setResourceCurrent(definition, state, 75)).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "resolve", current: 50, capacity: 50 },
    });

    expect(setResourceCurrent(definition, state, -10)).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "resolve", current: 0, capacity: 50 },
    });
  });

  it("sets capacity and clamps current only when shrinking below it", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(setResourceCapacity(definition, state, 100)).toEqual({
      kind: "changed",
      clamped: false,
      state: { resource: "resolve", current: 30, capacity: 100 },
    });

    expect(setResourceCapacity(definition, state, 20)).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "resolve", current: 20, capacity: 20 },
    });
  });

  it("returns unchanged for zero operations or already-satisfied states", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(increaseResource(definition, state, 0)).toEqual({ kind: "unchanged", state });
    expect(decreaseResource(definition, state, 0)).toEqual({ kind: "unchanged", state });
    expect(setResourceCurrent(definition, state, 30)).toEqual({ kind: "unchanged", state });
    expect(setResourceCapacity(definition, state, 50)).toEqual({ kind: "unchanged", state });
  });

  it("rejects invalid operation inputs and invalid starting state", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(increaseResource(definition, state, Number.NaN)).toEqual({
      kind: "rejected",
      reason: "invalid-amount",
      state,
    });

    expect(decreaseResource(definition, state, -1)).toEqual({
      kind: "rejected",
      reason: "invalid-amount",
      state,
    });

    expect(setResourceCapacity(definition, state, -1)).toEqual({
      kind: "rejected",
      reason: "invalid-capacity",
      state,
    });

    const invalid = {
      resource: "resolve",
      current: 60,
      capacity: 50,
    } as const;

    expect(increaseResource(definition, invalid, 1)).toEqual({
      kind: "rejected",
      reason: "current-exceeds-capacity",
      state: invalid,
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = { resource: "resolve", current: 30, capacity: 50 } as const;

    expect(increaseResource(definition, state, 7)).toEqual(
      increaseResource(definition, state, 7),
    );
    expect(state).toEqual({ resource: "resolve", current: 30, capacity: 50 });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = { resource: "resolve", current: 17, capacity: 50 } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("first-game resource pressure tests", () => {
  it("treats HP, Mana, and family resources as game-owned names", () => {
    type GameResource = "HP" | "Mana" | "BreakerMomentum";

    const definitions: Record<GameResource, ResourceDefinition<GameResource>> = {
      HP: { reference: "HP", initialCurrent: 100, initialCapacity: 100 },
      Mana: { reference: "Mana", initialCurrent: 30, initialCapacity: 30 },
      BreakerMomentum: {
        reference: "BreakerMomentum",
        initialCurrent: 0,
        initialCapacity: 5,
      },
    };

    const hp = initializeResource(definitions.HP);
    const mana = initializeResource(definitions.Mana);
    const momentum = initializeResource(definitions.BreakerMomentum);

    expect(hp.kind).toBe("initialized");
    expect(mana.kind).toBe("initialized");
    expect(momentum.kind).toBe("initialized");

    if (hp.kind !== "initialized") throw new Error("HP must initialize");

    const depleted = decreaseResource(definitions.HP, hp.state, 1000);
    expect(depleted).toEqual({
      kind: "changed",
      clamped: true,
      state: { resource: "HP", current: 0, capacity: 100 },
    });

    expect(depleted).not.toHaveProperty("dead");
    expect(depleted).not.toHaveProperty("defeated");
  });
});
