import {
  type SpecializationChoiceDefinition,
  type SpecializationChoiceReference,
  type SpecializationDefinition,
  type SpecializationDefinitionIssue,
  type SpecializationReference,
  validateSpecializationDefinition,
} from "./definitions.js";
import {
  type SpecializationState,
  type SpecializationStateIssue,
  validateSpecializationState,
} from "./state.js";

export type InitializeSpecializationOutcome<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
> =
  | Readonly<{
      kind: "initialized";
      state: SpecializationState<Reference, ChoiceReference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly SpecializationDefinitionIssue<ChoiceReference>[];
    }>;

export type SpecializationTransitionOutcome<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
> =
  | Readonly<{
      kind: "changed";
      state: SpecializationState<Reference, ChoiceReference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason:
        | SpecializationStateIssue<ChoiceReference>["kind"]
        | "choice-not-defined"
        | "choice-already-selected"
        | "choice-not-selected"
        | "choice-at-max-rank";
      state: SpecializationState<Reference, ChoiceReference>;
    }>;

function validateTransitionState<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
  state: SpecializationState<Reference, ChoiceReference>,
): SpecializationTransitionOutcome<Reference, ChoiceReference> | null {
  const validation = validateSpecializationState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }
  return null;
}

function findChoice<ChoiceReference extends SpecializationChoiceReference>(
  choices: readonly SpecializationChoiceDefinition<ChoiceReference>[],
  choice: ChoiceReference,
): SpecializationChoiceDefinition<ChoiceReference> | undefined {
  return choices.find((candidate) => candidate.reference === choice);
}

export function initializeSpecialization<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
): InitializeSpecializationOutcome<Reference, ChoiceReference> {
  const validation = validateSpecializationDefinition(definition);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: validation.issues,
    };
  }

  return {
    kind: "initialized",
    state: {
      specialization: definition.reference,
      selections: [],
    },
  };
}

export function selectSpecializationChoice<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
  state: SpecializationState<Reference, ChoiceReference>,
  choice: ChoiceReference,
): SpecializationTransitionOutcome<Reference, ChoiceReference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (findChoice(definition.choices, choice) === undefined) {
    return { kind: "rejected", reason: "choice-not-defined", state };
  }

  if (state.selections.some((selection) => selection.choice === choice)) {
    return { kind: "rejected", reason: "choice-already-selected", state };
  }

  return {
    kind: "changed",
    state: {
      specialization: state.specialization,
      selections: [...state.selections, { choice, rank: 1 }],
    },
  };
}

export function increaseSpecializationChoiceRank<
  Reference extends SpecializationReference,
  ChoiceReference extends SpecializationChoiceReference,
>(
  definition: SpecializationDefinition<Reference, ChoiceReference>,
  state: SpecializationState<Reference, ChoiceReference>,
  choice: ChoiceReference,
): SpecializationTransitionOutcome<Reference, ChoiceReference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  const choiceDefinition = findChoice(definition.choices, choice);
  if (choiceDefinition === undefined) {
    return { kind: "rejected", reason: "choice-not-defined", state };
  }

  const selection = state.selections.find((candidate) => candidate.choice === choice);
  if (selection === undefined) {
    return { kind: "rejected", reason: "choice-not-selected", state };
  }

  if (selection.rank >= choiceDefinition.maxRank) {
    return { kind: "rejected", reason: "choice-at-max-rank", state };
  }

  return {
    kind: "changed",
    state: {
      specialization: state.specialization,
      selections: state.selections.map((candidate) =>
        candidate.choice === choice ? { ...candidate, rank: candidate.rank + 1 } : candidate,
      ),
    },
  };
}
