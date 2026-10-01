import {
  type CapabilityCatalogDefinition,
  type CapabilityDefinitionIssue,
  type CapabilityReference,
  validateCapabilityCatalogDefinition,
} from "./definitions.js";
import {
  type CapabilityOwnershipState,
  type CapabilityOwnershipStateIssue,
  validateCapabilityOwnershipState,
} from "./state.js";

export type InitializeCapabilityOwnershipOutcome<Reference extends CapabilityReference> =
  | Readonly<{
      kind: "initialized";
      state: CapabilityOwnershipState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly CapabilityDefinitionIssue<Reference>[];
    }>;

export type CapabilityOwnershipTransitionOutcome<Reference extends CapabilityReference> =
  | Readonly<{
      kind: "changed";
      state: CapabilityOwnershipState<Reference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason:
        | CapabilityOwnershipStateIssue["kind"]
        | "capability-not-defined"
        | "capability-already-owned"
        | "capability-not-owned";
      state: CapabilityOwnershipState<Reference>;
    }>;

function validateTransitionState<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
  state: CapabilityOwnershipState<Reference>,
): CapabilityOwnershipTransitionOutcome<Reference> | null {
  const validation = validateCapabilityOwnershipState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }
  return null;
}

export function initializeCapabilityOwnership<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
): InitializeCapabilityOwnershipOutcome<Reference> {
  const validation = validateCapabilityCatalogDefinition(definition);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: validation.issues,
    };
  }

  return {
    kind: "initialized",
    state: { owned: [] },
  };
}

export function grantCapability<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
  state: CapabilityOwnershipState<Reference>,
  capability: Reference,
): CapabilityOwnershipTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.capabilities.includes(capability)) {
    return { kind: "rejected", reason: "capability-not-defined", state };
  }

  if (state.owned.includes(capability)) {
    return { kind: "rejected", reason: "capability-already-owned", state };
  }

  return {
    kind: "changed",
    state: { owned: [...state.owned, capability] },
  };
}

export function revokeCapability<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
  state: CapabilityOwnershipState<Reference>,
  capability: Reference,
): CapabilityOwnershipTransitionOutcome<Reference> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.capabilities.includes(capability)) {
    return { kind: "rejected", reason: "capability-not-defined", state };
  }

  if (!state.owned.includes(capability)) {
    return { kind: "rejected", reason: "capability-not-owned", state };
  }

  return {
    kind: "changed",
    state: { owned: state.owned.filter((ownedCapability) => ownedCapability !== capability) },
  };
}
