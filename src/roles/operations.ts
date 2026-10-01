import {
  type RoleCatalogDefinition,
  type RoleDefinitionIssue,
  type RoleReference,
  validateRoleCatalogDefinition,
} from "./definitions.js";
import { type RolesState, type RolesStateIssue, validateRolesState } from "./state.js";

export type InitializeRolesOutcome<Reference extends RoleReference> =
  | Readonly<{
      kind: "initialized";
      state: RolesState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly RoleDefinitionIssue<Reference>[];
    }>;

export type RoleTransitionOutcome<Reference extends RoleReference> =
  | Readonly<{
      kind: "changed";
      state: RolesState<Reference>;
    }>
  | Readonly<{
      kind: "unchanged";
      state: RolesState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason:
        | RolesStateIssue["kind"]
        | "role-not-defined"
        | "role-not-owned"
        | "role-already-owned"
        | "active-role-must-be-deactivated";
      state: RolesState<Reference>;
    }>;

function validateTransitionState<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
): RoleTransitionOutcome<Reference> | null {
  const validation = validateRolesState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }
  return null;
}

export function initializeRoles<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
): InitializeRolesOutcome<Reference> {
  const validation = validateRoleCatalogDefinition(definition);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: validation.issues,
    };
  }

  return {
    kind: "initialized",
    state: { owned: [], active: null },
  };
}

export function grantRole<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
  role: Reference,
): RoleTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.roles.includes(role)) {
    return { kind: "rejected", reason: "role-not-defined", state };
  }

  if (state.owned.includes(role)) {
    return { kind: "rejected", reason: "role-already-owned", state };
  }

  return {
    kind: "changed",
    state: { owned: [...state.owned, role], active: state.active },
  };
}

export function activateRole<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
  role: Reference,
): RoleTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.roles.includes(role)) {
    return { kind: "rejected", reason: "role-not-defined", state };
  }

  if (!state.owned.includes(role)) {
    return { kind: "rejected", reason: "role-not-owned", state };
  }

  if (state.active === role) {
    return { kind: "unchanged", state };
  }

  return {
    kind: "changed",
    state: { owned: state.owned, active: role },
  };
}

export function deactivateRole<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
): RoleTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (state.active === null) {
    return { kind: "unchanged", state };
  }

  return {
    kind: "changed",
    state: { owned: state.owned, active: null },
  };
}

export function revokeRole<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
  role: Reference,
): RoleTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.roles.includes(role)) {
    return { kind: "rejected", reason: "role-not-defined", state };
  }

  if (!state.owned.includes(role)) {
    return { kind: "rejected", reason: "role-not-owned", state };
  }

  if (state.active === role) {
    return {
      kind: "rejected",
      reason: "active-role-must-be-deactivated",
      state,
    };
  }

  return {
    kind: "changed",
    state: {
      owned: state.owned.filter((ownedRole) => ownedRole !== role),
      active: state.active,
    },
  };
}
