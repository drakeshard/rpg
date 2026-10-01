import {
  type ResourceDefinition,
  type ResourceDefinitionIssue,
  type ResourceReference,
  validateResourceDefinition,
} from "./definitions.js";
import {
  type ResourceState,
  type ResourceStateIssue,
  validateResourceState,
} from "./state.js";

export type InitializeResourceOutcome<Reference extends ResourceReference> =
  | Readonly<{
      kind: "initialized";
      state: ResourceState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly ResourceDefinitionIssue[];
    }>;

export type ResourceTransitionOutcome<Reference extends ResourceReference> =
  | Readonly<{
      kind: "changed";
      clamped: boolean;
      state: ResourceState<Reference>;
    }>
  | Readonly<{
      kind: "unchanged";
      state: ResourceState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: ResourceStateIssue["kind"] | "invalid-amount" | "invalid-capacity";
      state: ResourceState<Reference>;
    }>;

function validateTransitionState<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
): ResourceTransitionOutcome<Reference> | null {
  const validation = validateResourceState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }

  return null;
}

function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 0;
}

export function initializeResource<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
): InitializeResourceOutcome<Reference> {
  const validation = validateResourceDefinition(definition);
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
      resource: definition.reference,
      current: definition.initialCurrent,
      capacity: definition.initialCapacity,
    },
  };
}

export function increaseResource<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
  amount: number,
): ResourceTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!isValidAmount(amount)) {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  if (amount === 0 || state.current === state.capacity) {
    return { kind: "unchanged", state };
  }

  const rawCurrent = state.current + amount;
  const current = Math.min(rawCurrent, state.capacity);

  return {
    kind: "changed",
    clamped: current !== rawCurrent,
    state: { ...state, current },
  };
}

export function decreaseResource<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
  amount: number,
): ResourceTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!isValidAmount(amount)) {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  if (amount === 0 || state.current === 0) {
    return { kind: "unchanged", state };
  }

  const rawCurrent = state.current - amount;
  const current = Math.max(rawCurrent, 0);

  return {
    kind: "changed",
    clamped: current !== rawCurrent,
    state: { ...state, current },
  };
}

export function setResourceCurrent<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
  current: number,
): ResourceTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!Number.isFinite(current)) {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  const nextCurrent = Math.min(Math.max(current, 0), state.capacity);
  if (nextCurrent === state.current) {
    return { kind: "unchanged", state };
  }

  return {
    kind: "changed",
    clamped: nextCurrent !== current,
    state: { ...state, current: nextCurrent },
  };
}

export function setResourceCapacity<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
  capacity: number,
): ResourceTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!Number.isFinite(capacity) || capacity < 0) {
    return { kind: "rejected", reason: "invalid-capacity", state };
  }

  if (capacity === state.capacity) {
    return { kind: "unchanged", state };
  }

  const current = Math.min(state.current, capacity);

  return {
    kind: "changed",
    clamped: current !== state.current,
    state: {
      ...state,
      current,
      capacity,
    },
  };
}
