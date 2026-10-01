export {
  type AttributeDefinition,
  type AttributeDefinitionIssue,
  type AttributeDefinitionValidation,
  type AttributeReference,
  validateAttributeDefinition,
} from "./definitions.js";
export {
  type AttributeTransitionOutcome,
  adjustAttributeBase,
  type InitializeAttributeOutcome,
  initializeAttribute,
  setAttributeBase,
} from "./operations.js";
export {
  type AttributeState,
  type AttributeStateIssue,
  type AttributeStateValidation,
  validateAttributeState,
} from "./state.js";
