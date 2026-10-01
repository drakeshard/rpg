import { describe, expect, it } from "vitest";
import {
  activateRole,
  deactivateRole,
  grantRole,
  initializeRoles,
  revokeRole,
  type RoleCatalogDefinition,
  type RolesState,
  validateRoleCatalogDefinition,
  validateRolesState,
} from "../src/roles/index.js";

describe("role definition validation", () => {
  it("accepts title-neutral references without class tiers or hierarchy", () => {
    const definition = {
      roles: ["support", "frontline", "controller"],
    } as const;

    expect(validateRoleCatalogDefinition(definition)).toEqual({ kind: "valid" });
  });

  it("accepts numeric references without imposing an ID scheme", () => {
    expect(validateRoleCatalogDefinition({ roles: [10, 300, 9000] })).toEqual({
      kind: "valid",
    });
  });

  it("rejects empty, duplicate, and non-JSON-safe references", () => {
    expect(validateRoleCatalogDefinition({ roles: [] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "empty-roles" }],
    });

    expect(validateRoleCatalogDefinition({ roles: ["a", "a"] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "duplicate-role-reference", role: "a" }],
    });

    expect(validateRoleCatalogDefinition({ roles: [Number.NaN] })).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-role-reference", role: Number.NaN }],
    });
  });
});

describe("role state and transitions", () => {
  const definition = {
    roles: ["frontline", "support", "controller"],
  } as const satisfies RoleCatalogDefinition;

  it("initializes with no owned or active role", () => {
    expect(initializeRoles(definition)).toEqual({
      kind: "initialized",
      state: { owned: [], active: null },
    });
  });

  it("grants and activates game-defined roles deterministically", () => {
    const start = { owned: [], active: null } as RolesState<string>;
    const granted = grantRole(definition, start, "support");

    expect(granted).toEqual({
      kind: "changed",
      state: { owned: ["support"], active: null },
    });

    if (granted.kind !== "changed") throw new Error("expected grant");

    expect(activateRole(definition, granted.state, "support")).toEqual({
      kind: "changed",
      state: { owned: ["support"], active: "support" },
    });
  });

  it("switches active roles without implying base or advanced tiers", () => {
    const state = {
      owned: ["frontline", "controller"],
      active: "frontline",
    } as const;

    expect(activateRole(definition, state, "controller")).toEqual({
      kind: "changed",
      state: { owned: ["frontline", "controller"], active: "controller" },
    });
  });

  it("returns unchanged when activating the already-active role or deactivating none", () => {
    const active = { owned: ["support"], active: "support" } as const;
    const inactive = { owned: ["support"], active: null } as const;

    expect(activateRole(definition, active, "support")).toEqual({
      kind: "unchanged",
      state: active,
    });
    expect(deactivateRole(definition, inactive)).toEqual({
      kind: "unchanged",
      state: inactive,
    });
  });

  it("requires explicit deactivation before revoking the active role", () => {
    const active = { owned: ["frontline", "support"], active: "frontline" } as const;

    expect(revokeRole(definition, active, "frontline")).toEqual({
      kind: "rejected",
      reason: "active-role-must-be-deactivated",
      state: active,
    });

    const deactivated = deactivateRole(definition, active);
    expect(deactivated).toEqual({
      kind: "changed",
      state: { owned: ["frontline", "support"], active: null },
    });

    if (deactivated.kind !== "changed") throw new Error("expected deactivation");

    expect(revokeRole(definition, deactivated.state, "frontline")).toEqual({
      kind: "changed",
      state: { owned: ["support"], active: null },
    });
  });

  it("rejects unknown, unowned, duplicate, and invalid-state transitions", () => {
    const state = { owned: ["frontline"], active: null } as RolesState<string>;

    expect(grantRole(definition, state, "frontline")).toEqual({
      kind: "rejected",
      reason: "role-already-owned",
      state,
    });

    expect(grantRole(definition, state, "unknown")).toEqual({
      kind: "rejected",
      reason: "role-not-defined",
      state,
    });

    expect(activateRole(definition, state, "support")).toEqual({
      kind: "rejected",
      reason: "role-not-owned",
      state,
    });

    expect(revokeRole(definition, state, "support")).toEqual({
      kind: "rejected",
      reason: "role-not-owned",
      state,
    });

    const invalid = {
      owned: ["frontline"],
      active: "support",
    } as RolesState<string>;

    expect(validateRolesState(definition, invalid)).toEqual({
      kind: "invalid",
      issue: { kind: "active-role-not-owned" },
    });
    expect(grantRole(definition, invalid, "support")).toEqual({
      kind: "rejected",
      reason: "active-role-not-owned",
      state: invalid,
    });
  });

  it("rejects duplicate and unknown owned-role state", () => {
    expect(
      validateRolesState(definition, {
        owned: ["support", "support"],
        active: null,
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "duplicate-owned-role" },
    });

    expect(
      validateRolesState(definition, {
        owned: ["unknown"],
        active: null,
      } as RolesState<string>),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "owned-role-not-defined" },
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = { owned: ["frontline"], active: null } as const;

    const first = activateRole(definition, state, "frontline");
    const second = activateRole(definition, state, "frontline");

    expect(first).toEqual(second);
    expect(state).toEqual({ owned: ["frontline"], active: null });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = {
      owned: ["frontline", "support"],
      active: "support",
    } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("first-game job pressure test", () => {
  it("treats job names as game-owned role references", () => {
    type JobReference = "Guardian" | "Breaker";

    const jobs: RoleCatalogDefinition<JobReference> = {
      roles: ["Guardian", "Breaker"],
    };

    const start = initializeRoles(jobs);
    if (start.kind !== "initialized") throw new Error("jobs must be valid");

    const guardian = grantRole(jobs, start.state, "Guardian");
    if (guardian.kind !== "changed") throw new Error("Guardian grant must succeed");

    expect(activateRole(jobs, guardian.state, "Guardian")).toEqual({
      kind: "changed",
      state: { owned: ["Guardian"], active: "Guardian" },
    });
  });
});
