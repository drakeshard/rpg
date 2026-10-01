import {
  type AttributeDefinition,
  type AttributeDefinitionIssue,
  type AttributeReference,
  validateAttributeDefinition,
} from "./definitions.js";
import { type AttributeState, type AttributeStateIssue, validateAttributeState } from "./state.js";

export type InitializeAttributeOutcome<Reference extends AttributeReference> =
  | Readonly<{
      kind: "initialized";
      state: AttributeState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly AttributeDefinitionIssue[];
    }>;

export type AttributeTransitionOutcome<Reference extends AttributeReference> =
  | Readonly<{
      kind: "changed";
      state: AttributeState<Reference>;
    }>
  | Readonly<{
      kind: "unchanged";
      state: AttributeState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: AttributeStateIssue["kind"] | "invalid-base" | "invalid-delta";
      state: AttributeState<Reference>;
    }>;

function validateTransitionState<Reference extends AttributeReference>(
  definition: AttributeDefinition<Reference>,
  state: AttributeState<Reference>,
): AttributeTransitionOutcome<Reference> | null {
  const validation = validateAttributeState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }

  return null;
}

export function initializeAttribute<Reference extends AttributeReference>(
  definition: AttributeDefinition<Reference>,
): InitializeAttributeOutcome<Reference> {
  const validation = validateAttributeDefinition(definition);
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
      attribute: definition.reference,
      base: definition.initialBase,
    },
  };
}

export function setAttributeBase<Reference extends AttributeReference>(
  definition: AttributeDefinition<Reference>,
  state: AttributeState<Reference>,
  base: number,
): AttributeTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!Number.isFinite(base)) {
    return { kind: "rejected", reason: "invalid-base", state };
  }

  if (base === state.base) {
    return { kind: "unchanged", state };
  }

  return {
    kind: "changed",
    state: { ...state, base },
  };
}

export function adjustAttributeBase<Reference extends AttributeReference>(
  definition: AttributeDefinition<Reference>,
  state: AttributeState<Reference>,
  delta: number,
): AttributeTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!Number.isFinite(delta)) {
    return { kind: "rejected", reason: "invalid-delta", state };
  }

  if (delta === 0) {
    return { kind: "unchanged", state };
  }

  const base = state.base + delta;
  if (!Number.isFinite(base)) {
    return { kind: "rejected", reason: "invalid-base", state };
  }

  return {
    kind: "changed",
    state: { ...state, base },
  };
}
