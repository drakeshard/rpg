export {
  type RoleCatalogDefinition,
  type RoleDefinitionIssue,
  type RoleDefinitionValidation,
  type RoleReference,
  validateRoleCatalogDefinition,
} from "./definitions.js";
export {
  activateRole,
  deactivateRole,
  grantRole,
  type InitializeRolesOutcome,
  initializeRoles,
  revokeRole,
  type RoleTransitionOutcome,
} from "./operations.js";
export {
  type RolesState,
  type RolesStateIssue,
  type RolesStateValidation,
  validateRolesState,
} from "./state.js";
