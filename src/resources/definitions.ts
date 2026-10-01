export type ResourceReference = string | number;

export type ResourceDefinition<Reference extends ResourceReference = ResourceReference> = Readonly<{
  reference: Reference;
  initialCurrent: number;
  initialCapacity: number;
}>;

export type ResourceDefinitionIssue =
  | Readonly<{ kind: "invalid-reference" }>
  | Readonly<{ kind: "invalid-initial-current" }>
  | Readonly<{ kind: "invalid-initial-capacity" }>
  | Readonly<{ kind: "initial-current-exceeds-capacity" }>;

export type ResourceDefinitionValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly ResourceDefinitionIssue[];
    }>;

function isJsonSafeReference(reference: ResourceReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateResourceDefinition<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
): ResourceDefinitionValidation {
  const issues: ResourceDefinitionIssue[] = [];

  if (!isJsonSafeReference(definition.reference)) {
    issues.push({ kind: "invalid-reference" });
  }

  if (!Number.isFinite(definition.initialCapacity) || definition.initialCapacity < 0) {
    issues.push({ kind: "invalid-initial-capacity" });
  }

  if (!Number.isFinite(definition.initialCurrent) || definition.initialCurrent < 0) {
    issues.push({ kind: "invalid-initial-current" });
  }

  if (
    Number.isFinite(definition.initialCapacity) &&
    Number.isFinite(definition.initialCurrent) &&
    definition.initialCurrent > definition.initialCapacity
  ) {
    issues.push({ kind: "initial-current-exceeds-capacity" });
  }

  return issues.length === 0 ? { kind: "valid" } : { kind: "invalid", issues };
}
