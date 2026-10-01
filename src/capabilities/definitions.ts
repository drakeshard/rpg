export type CapabilityReference = string | number;

export type CapabilityCatalogDefinition<
  Reference extends CapabilityReference = CapabilityReference,
> = Readonly<{
  capabilities: readonly Reference[];
}>;

export type CapabilityDefinitionIssue<Reference extends CapabilityReference = CapabilityReference> =
  | Readonly<{ kind: "empty-capabilities" }>
  | Readonly<{ kind: "invalid-capability-reference"; capability: Reference }>
  | Readonly<{ kind: "duplicate-capability-reference"; capability: Reference }>;

export type CapabilityDefinitionValidation<
  Reference extends CapabilityReference = CapabilityReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly CapabilityDefinitionIssue<Reference>[];
    }>;

function isJsonSafeReference(reference: CapabilityReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateCapabilityCatalogDefinition<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
): CapabilityDefinitionValidation<Reference> {
  const issues: CapabilityDefinitionIssue<Reference>[] = [];

  if (definition.capabilities.length === 0) {
    issues.push({ kind: "empty-capabilities" });
  }

  const seen = new Set<Reference>();
  for (const capability of definition.capabilities) {
    if (!isJsonSafeReference(capability)) {
      issues.push({ kind: "invalid-capability-reference", capability });
      continue;
    }

    if (seen.has(capability)) {
      issues.push({ kind: "duplicate-capability-reference", capability });
      continue;
    }

    seen.add(capability);
  }

  return issues.length === 0 ? { kind: "valid" } : { kind: "invalid", issues };
}
