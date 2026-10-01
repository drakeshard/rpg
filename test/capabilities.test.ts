import { describe, expect, it } from "vitest";
import {
  type CapabilityCatalogDefinition,
  type CapabilityOwnershipState,
  grantCapability,
  initializeCapabilityOwnership,
  revokeCapability,
  validateCapabilityCatalogDefinition,
  validateCapabilityOwnershipState,
} from "../src/capabilities/index.js";

describe("capability definition validation", () => {
  it("accepts title-neutral game-defined capability references", () => {
    expect(
      validateCapabilityCatalogDefinition({
        capabilities: ["observe", "interact", "craft"],
      }),
    ).toEqual({ kind: "valid" });
  });

  it("accepts numeric references without imposing an ID scheme", () => {
    expect(validateCapabilityCatalogDefinition({ capabilities: [10, 30, 900] })).toEqual({
      kind: "valid",
    });
  });

  it("rejects empty, duplicate, and non-JSON-safe references", () => {
    expect(validateCapabilityCatalogDefinition({ capabilities: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-capabilities" }],
    });

    expect(validateCapabilityCatalogDefinition({ capabilities: ["a", "a"] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "duplicate-capability-reference", capability: "a" }],
    });

    expect(validateCapabilityCatalogDefinition({ capabilities: [Number.NaN] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-capability-reference", capability: Number.NaN }],
    });
  });
});

describe("capability ownership state and transitions", () => {
  const definition = {
    capabilities: ["observe", "craft", "dash"],
  } as const satisfies CapabilityCatalogDefinition;

  it("initializes with no owned capabilities", () => {
    expect(initializeCapabilityOwnership(definition)).toEqual({
      kind: "initialized",
      state: { owned: [] },
    });
  });

  it("grants defined capabilities in explicit grant order", () => {
    const start = { owned: [] } as CapabilityOwnershipState<string>;

    const observe = grantCapability(definition, start, "observe");
    if (observe.kind !== "changed") throw new Error("observe grant must succeed");

    expect(grantCapability(definition, observe.state, "dash")).toEqual({
      kind: "changed",
      state: { owned: ["observe", "dash"] },
    });
  });

  it("revokes an owned capability while preserving remaining order", () => {
    const state = { owned: ["observe", "craft", "dash"] } as const;

    expect(revokeCapability(definition, state, "craft")).toEqual({
      kind: "changed",
      state: { owned: ["observe", "dash"] },
    });
  });

  it("rejects duplicate grants, unknown references, and unowned revocation", () => {
    const state = { owned: ["observe"] } as CapabilityOwnershipState<string>;

    expect(grantCapability(definition, state, "observe")).toEqual({
      kind: "rejected",
      reason: "capability-already-owned",
      state,
    });

    expect(
      grantCapability(definition as CapabilityCatalogDefinition<string>, state, "unknown"),
    ).toEqual({
      kind: "rejected",
      reason: "capability-not-defined",
      state,
    });

    expect(revokeCapability(definition, state, "craft")).toEqual({
      kind: "rejected",
      reason: "capability-not-owned",
      state,
    });
  });

  it("validates defined and unique owned capability state", () => {
    expect(
      validateCapabilityOwnershipState(definition as CapabilityCatalogDefinition<string>, {
        owned: ["unknown"],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "owned-capability-not-defined" },
    });

    expect(
      validateCapabilityOwnershipState(definition, {
        owned: ["observe", "observe"],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "duplicate-owned-capability" },
    });
  });

  it("rejects transitions from invalid runtime state", () => {
    const invalid = {
      owned: ["observe", "observe"],
    } as const;

    expect(grantCapability(definition, invalid, "dash")).toEqual({
      kind: "rejected",
      reason: "duplicate-owned-capability",
      state: invalid,
    });
  });

  it("rejects initialization from an invalid definition", () => {
    expect(initializeCapabilityOwnership({ capabilities: [] })).toEqual({
      kind: "rejected",
      reason: "invalid-definition",
      issues: [{ kind: "empty-capabilities" }],
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = { owned: ["observe"] } as const;

    expect(grantCapability(definition, state, "dash")).toEqual(
      grantCapability(definition, state, "dash"),
    );
    expect(state).toEqual({ owned: ["observe"] });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = { owned: ["observe", "dash"] } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
