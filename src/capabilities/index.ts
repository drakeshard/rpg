export {
  type CapabilityCatalogDefinition,
  type CapabilityDefinitionIssue,
  type CapabilityDefinitionValidation,
  type CapabilityReference,
  validateCapabilityCatalogDefinition,
} from "./definitions.js";
export {
  type CapabilityOwnershipTransitionOutcome,
  grantCapability,
  type InitializeCapabilityOwnershipOutcome,
  initializeCapabilityOwnership,
  revokeCapability,
} from "./operations.js";
export {
  type CapabilityOwnershipState,
  type CapabilityOwnershipStateIssue,
  type CapabilityOwnershipStateValidation,
  validateCapabilityOwnershipState,
} from "./state.js";
