import type { LoadoutDefinition, LoadoutSlotReference } from "./definitions.js";
import { validateLoadoutDefinition } from "./definitions.js";

export type EquipmentReference = string | number;

export type LoadoutAssignment<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
  Equipment extends EquipmentReference = EquipmentReference,
> = Readonly<{
  slot: SlotReference;
  equipment: Equipment;
}>;

export type LoadoutState<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
  Equipment extends EquipmentReference = EquipmentReference,
> = Readonly<{
  assignments: readonly LoadoutAssignment<SlotReference, Equipment>[];
}>;

export type LoadoutStateIssue<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
  Equipment extends EquipmentReference = EquipmentReference,
> =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "assignment-slot-not-defined"; slot: SlotReference }>
  | Readonly<{ kind: "duplicate-slot-assignment"; slot: SlotReference }>
  | Readonly<{ kind: "invalid-equipment-reference"; equipment: Equipment }>;

export type LoadoutStateValidation<
  SlotReference extends LoadoutSlotReference = LoadoutSlotReference,
  Equipment extends EquipmentReference = EquipmentReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issue: LoadoutStateIssue<SlotReference, Equipment>;
    }>;

function isJsonSafeEquipmentReference(reference: EquipmentReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateLoadoutState<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
>(
  definition: LoadoutDefinition<SlotReference>,
  state: LoadoutState<SlotReference, Equipment>,
): LoadoutStateValidation<SlotReference, Equipment> {
  if (validateLoadoutDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  const assignedSlots = new Set<SlotReference>();
  for (const assignment of state.assignments) {
    if (!definition.slots.includes(assignment.slot)) {
      return {
        kind: "invalid",
        issue: { kind: "assignment-slot-not-defined", slot: assignment.slot },
      };
    }

    if (assignedSlots.has(assignment.slot)) {
      return {
        kind: "invalid",
        issue: { kind: "duplicate-slot-assignment", slot: assignment.slot },
      };
    }
    assignedSlots.add(assignment.slot);

    if (!isJsonSafeEquipmentReference(assignment.equipment)) {
      return {
        kind: "invalid",
        issue: { kind: "invalid-equipment-reference", equipment: assignment.equipment },
      };
    }
  }

  return { kind: "valid" };
}

export function isValidEquipmentReference(reference: EquipmentReference): boolean {
  return isJsonSafeEquipmentReference(reference);
}
