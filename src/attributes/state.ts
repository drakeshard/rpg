import type {
  AttributeDefinition,
  AttributeReference,
} from "./definitions.js";
import { validateAttributeDefinition } from "./definitions.js";

export type AttributeState<
  Reference extends AttributeReference = AttributeReference,
> = Readonly<{
  attribute: Reference;
  base: number;
}>;

export type AttributeStateIssue =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "attribute-reference-mismatch" }>
  | Readonly<{ kind: "invalid-base" }>;

export type AttributeStateValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: AttributeStateIssue }>;

export function validateAttributeState<
  Reference extends AttributeReference,
>(
  definition: AttributeDefinition<Reference>,
  state: AttributeState<Reference>,
): AttributeStateValidation {
  if (validateAttributeDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  if (state.attribute !== definition.reference) {
    return { kind: "invalid", issue: { kind: "attribute-reference-mismatch" } };
  }

  if (!Number.isFinite(state.base)) {
    return { kind: "invalid", issue: { kind: "invalid-base" } };
  }

  return { kind: "valid" };
}
