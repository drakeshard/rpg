export type RoleReference = string | number;

export type RoleCatalogDefinition<
  Reference extends RoleReference = RoleReference,
> = Readonly<{
  roles: readonly Reference[];
}>;

export type RoleDefinitionIssue<
  Reference extends RoleReference = RoleReference,
> =
  | Readonly<{ kind: "empty-roles" }>
  | Readonly<{ kind: "invalid-role-reference"; role: Reference }>
  | Readonly<{ kind: "duplicate-role-reference"; role: Reference }>;

export type RoleDefinitionValidation<
  Reference extends RoleReference = RoleReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly RoleDefinitionIssue<Reference>[];
    }>;

function isJsonSafeReference(reference: RoleReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateRoleCatalogDefinition<
  Reference extends RoleReference,
>(
  definition: RoleCatalogDefinition<Reference>,
): RoleDefinitionValidation<Reference> {
  const issues: RoleDefinitionIssue<Reference>[] = [];

  if (definition.roles.length === 0) {
    issues.push({ kind: "empty-roles" });
  }

  const seen = new Set<Reference>();
  for (const role of definition.roles) {
    if (!isJsonSafeReference(role)) {
      issues.push({ kind: "invalid-role-reference", role });
      continue;
    }

    if (seen.has(role)) {
      issues.push({ kind: "duplicate-role-reference", role });
      continue;
    }

    seen.add(role);
  }

  if (issues.length > 0) {
    return { kind: "invalid", issues };
  }

  return { kind: "valid" };
}
