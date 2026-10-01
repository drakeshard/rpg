import type { RoleCatalogDefinition, RoleReference } from "./definitions.js";
import { validateRoleCatalogDefinition } from "./definitions.js";

export type RolesState<
  Reference extends RoleReference = RoleReference,
> = Readonly<{
  owned: readonly Reference[];
  active: Reference | null;
}>;

export type RolesStateIssue =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "duplicate-owned-role" }>
  | Readonly<{ kind: "owned-role-not-defined" }>
  | Readonly<{ kind: "active-role-not-owned" }>;

export type RolesStateValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: RolesStateIssue }>;

export function validateRolesState<Reference extends RoleReference>(
  definition: RoleCatalogDefinition<Reference>,
  state: RolesState<Reference>,
): RolesStateValidation {
  if (validateRoleCatalogDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  const owned = new Set<Reference>();
  for (const role of state.owned) {
    if (!definition.roles.includes(role)) {
      return { kind: "invalid", issue: { kind: "owned-role-not-defined" } };
    }
    if (owned.has(role)) {
      return { kind: "invalid", issue: { kind: "duplicate-owned-role" } };
    }
    owned.add(role);
  }

  if (state.active !== null && !owned.has(state.active)) {
    return { kind: "invalid", issue: { kind: "active-role-not-owned" } };
  }

  return { kind: "valid" };
}
