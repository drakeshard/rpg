export type LoadoutSlotReference = string | number;

export type LoadoutDefinition<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
> = Readonly<{
  slots: readonly SlotReference[];
}>;

export type LoadoutDefinitionIssue<SlotReference extends LoadoutSlotReference = LoadoutSlotReference> =
  | Readonly<{ kind: "empty-slots" }>
  | Readonly<{ kind: "invalid-slot-reference"; slot: SlotReference }>
  | Readonly<{ kind: "duplicate-slot-reference"; slot: SlotReference }>;

export type LoadoutDefinitionValidation<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly LoadoutDefinitionIssue<SlotReference>[];
    }>;

function isJsonSafeReference(reference: LoadoutSlotReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateLoadoutDefinition<SlotReference extends LoadoutSlotReference>(
  definition: LoadoutDefinition<SlotReference>,
): LoadoutDefinitionValidation<SlotReference> {
  const issues: LoadoutDefinitionIssue<SlotReference>[] = [];

  if (definition.slots.length === 0) {
    issues.push({ kind: "empty-slots" });
  }

  const seen = new Set<SlotReference>();
  for (const slot of definition.slots) {
    if (!isJsonSafeReference(slot)) {
      issues.push({ kind: "invalid-slot-reference", slot });
      continue;
    }

    if (seen.has(slot)) {
      issues.push({ kind: "duplicate-slot-reference", slot });
      continue;
    }

    seen.add(slot);
  }

  return issues.length === 0 ? { kind: "valid" } : { kind: "invalid", issues };
}
