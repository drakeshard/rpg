import type { ResourceDefinition, ResourceReference } from "./definitions.js";
import { validateResourceDefinition } from "./definitions.js";

export type ResourceState<Reference extends ResourceReference = ResourceReference> = Readonly<{
  resource: Reference;
  current: number;
  capacity: number;
}>;

export type ResourceStateIssue =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "resource-reference-mismatch" }>
  | Readonly<{ kind: "invalid-current" }>
  | Readonly<{ kind: "invalid-capacity" }>
  | Readonly<{ kind: "current-exceeds-capacity" }>;

export type ResourceStateValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: ResourceStateIssue }>;

export function validateResourceState<Reference extends ResourceReference>(
  definition: ResourceDefinition<Reference>,
  state: ResourceState<Reference>,
): ResourceStateValidation {
  if (validateResourceDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  if (state.resource !== definition.reference) {
    return { kind: "invalid", issue: { kind: "resource-reference-mismatch" } };
  }

  if (!Number.isFinite(state.capacity) || state.capacity < 0) {
    return { kind: "invalid", issue: { kind: "invalid-capacity" } };
  }

  if (!Number.isFinite(state.current) || state.current < 0) {
    return { kind: "invalid", issue: { kind: "invalid-current" } };
  }

  if (state.current > state.capacity) {
    return { kind: "invalid", issue: { kind: "current-exceeds-capacity" } };
  }

  return { kind: "valid" };
}
