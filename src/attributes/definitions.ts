export type AttributeReference = string | number;

export type AttributeDefinition<
  Reference extends AttributeReference = AttributeReference,
> = Readonly<{
  reference: Reference;
  initialBase: number;
}>;

export type AttributeDefinitionIssue =
  | Readonly<{ kind: "invalid-reference" }>
  | Readonly<{ kind: "invalid-initial-base" }>;

export type AttributeDefinitionValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly AttributeDefinitionIssue[];
    }>;

function isJsonSafeReference(reference: AttributeReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateAttributeDefinition<
  Reference extends AttributeReference,
>(
  definition: AttributeDefinition<Reference>,
): AttributeDefinitionValidation {
  const issues: AttributeDefinitionIssue[] = [];

  if (!isJsonSafeReference(definition.reference)) {
    issues.push({ kind: "invalid-reference" });
  }

  if (!Number.isFinite(definition.initialBase)) {
    issues.push({ kind: "invalid-initial-base" });
  }

  return issues.length === 0 ? { kind: "valid" } : { kind: "invalid", issues };
}
