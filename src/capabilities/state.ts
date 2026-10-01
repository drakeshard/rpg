import type { CapabilityCatalogDefinition, CapabilityReference } from "./definitions.js";
import { validateCapabilityCatalogDefinition } from "./definitions.js";

export type CapabilityOwnershipState<
  Reference extends CapabilityReference = CapabilityReference,
> = Readonly<{
  owned: readonly Reference[];
}>;

export type CapabilityOwnershipStateIssue =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "owned-capability-not-defined" }>
  | Readonly<{ kind: "duplicate-owned-capability" }>;

export type CapabilityOwnershipStateValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: CapabilityOwnershipStateIssue }>;

export function validateCapabilityOwnershipState<Reference extends CapabilityReference>(
  definition: CapabilityCatalogDefinition<Reference>,
  state: CapabilityOwnershipState<Reference>,
): CapabilityOwnershipStateValidation {
  if (validateCapabilityCatalogDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  const owned = new Set<Reference>();
  for (const capability of state.owned) {
    if (!definition.capabilities.includes(capability)) {
      return { kind: "invalid", issue: { kind: "owned-capability-not-defined" } };
    }

    if (owned.has(capability)) {
      return { kind: "invalid", issue: { kind: "duplicate-owned-capability" } };
    }

    owned.add(capability);
  }

  return { kind: "valid" };
}
