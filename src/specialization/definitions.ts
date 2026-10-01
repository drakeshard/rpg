export type SpecializationReference = string | number;
export type SpecializationChoiceReference = string | number;

export type SpecializationChoiceDefinition<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> = Readonly<{
  reference: ChoiceReference;
  maxRank: number;
}>;

export type SpecializationDefinition<
  Reference extends SpecializationReference = SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> = Readonly<{
  reference: Reference;
  choices: readonly SpecializationChoiceDefinition<ChoiceReference>[];
}>;

export type SpecializationDefinitionIssue<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> =
  | Readonly<{ kind: "invalid-specialization-reference" }>
  | Readonly<{ kind: "empty-choices" }>
  | Readonly<{ kind: "invalid-choice-reference"; choice: ChoiceReference }>
  | Readonly<{ kind: "duplicate-choice-reference"; choice: ChoiceReference }>
  | Readonly<{ kind: "invalid-max-rank"; choice: ChoiceReference; maxRank: number }>;

export type SpecializationDefinitionValidation<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly SpecializationDefinitionIssue<ChoiceReference>[];
    }>;

function isJsonSafeReference(reference: SpecializationReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateSpecializationDefinition<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
): SpecializationDefinitionValidation<ChoiceReference> {
  const issues: SpecializationDefinitionIssue<ChoiceReference>[] = [];

  if (!isJsonSafeReference(definition.reference)) {
    issues.push({ kind: "invalid-specialization-reference" });
  }

  if (definition.choices.length === 0) {
    issues.push({ kind: "empty-choices" });
  }

  const seen = new Set<ChoiceReference>();
  for (const choice of definition.choices) {
    if (!isJsonSafeReference(choice.reference)) {
      issues.push({ kind: "invalid-choice-reference", choice: choice.reference });
    } else if (seen.has(choice.reference)) {
      issues.push({ kind: "duplicate-choice-reference", choice: choice.reference });
    } else {
      seen.add(choice.reference);
    }

    if (!Number.isInteger(choice.maxRank) || choice.maxRank < 1) {
      issues.push({
        kind: "invalid-max-rank",
        choice: choice.reference,
        maxRank: choice.maxRank,
      });
    }
  }

  return issues.length === 0 ? { kind: "valid" } : { kind: "invalid", issues };
}
