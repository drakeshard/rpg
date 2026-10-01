import type {
  SpecializationChoiceReference,
  SpecializationDefinition,
  SpecializationReference,
} from "./definitions.js";
import { validateSpecializationDefinition } from "./definitions.js";

export type SpecializationSelection<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> = Readonly<{
  choice: ChoiceReference;
  rank: number;
}>;

export type SpecializationState<
  Reference extends SpecializationReference = SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> = Readonly<{
  specialization: Reference;
  selections: readonly SpecializationSelection<ChoiceReference>[];
}>;

export type SpecializationStateIssue<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "specialization-reference-mismatch" }>
  | Readonly<{ kind: "selection-not-defined"; choice: ChoiceReference }>
  | Readonly<{ kind: "duplicate-selection"; choice: ChoiceReference }>
  | Readonly<{ kind: "invalid-selection-rank"; choice: ChoiceReference; rank: number }>;

export type SpecializationStateValidation<
  ChoiceReference extends SpecializationChoiceReference = SpecializationChoiceReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: SpecializationStateIssue<ChoiceReference> }>;

export function validateSpecializationState<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
  state: SpecializationState<Reference, ChoiceReference>,
): SpecializationStateValidation<ChoiceReference> {
  if (validateSpecializationDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  if (state.specialization !== definition.reference) {
    return { kind: "invalid", issue: { kind: "specialization-reference-mismatch" } };
  }

  const seen = new Set<ChoiceReference>();
  for (const selection of state.selections) {
    const choice = definition.choices.find((candidate) => candidate.reference === selection.choice);
    if (choice === undefined) {
      return {
        kind: "invalid",
        issue: { kind: "selection-not-defined", choice: selection.choice },
      };
    }

    if (seen.has(selection.choice)) {
      return {
        kind: "invalid",
        issue: { kind: "duplicate-selection", choice: selection.choice },
      };
    }
    seen.add(selection.choice);

    if (
      !Number.isInteger(selection.rank) ||
      selection.rank < 1 ||
      selection.rank > choice.maxRank
    ) {
      return {
        kind: "invalid",
        issue: {
          kind: "invalid-selection-rank",
          choice: selection.choice,
          rank: selection.rank,
        },
      };
    }
  }

  return { kind: "valid" };
}
