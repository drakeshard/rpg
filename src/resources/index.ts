export {
  type ResourceDefinition,
  type ResourceDefinitionIssue,
  type ResourceDefinitionValidation,
  type ResourceReference,
  validateResourceDefinition,
} from "./definitions.js";
export {
  decreaseResource,
  type InitializeResourceOutcome,
  increaseResource,
  initializeResource,
  type ResourceTransitionOutcome,
  setResourceCapacity,
  setResourceCurrent,
} from "./operations.js";
export {
  type ResourceState,
  type ResourceStateIssue,
  type ResourceStateValidation,
  validateResourceState,
} from "./state.js";
