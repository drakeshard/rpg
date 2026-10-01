import {
  type LoadoutDefinition,
  type LoadoutDefinitionIssue,
  type LoadoutSlotReference,
  validateLoadoutDefinition,
} from "./definitions.js";
import {
  type EquipmentReference,
  isValidEquipmentReference,
  type LoadoutState,
  type LoadoutStateIssue,
  validateLoadoutState,
} from "./state.js";

export type InitializeLoadoutOutcome<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
> =
  | Readonly<{
      kind: "initialized";
      state: LoadoutState<SlotReference, Equipment>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly LoadoutDefinitionIssue<SlotReference>[];
    }>;

export type LoadoutTransitionOutcome<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
> =
  | Readonly<{
      kind: "changed";
      state: LoadoutState<SlotReference, Equipment>;
    }>
  | Readonly<{
      kind: "rejected";
      reason:
        | LoadoutStateIssue<SlotReference, Equipment>["kind"]
        | "slot-not-defined"
        | "invalid-equipment-reference"
        | "slot-empty";
      state: LoadoutState<SlotReference, Equipment>;
    }>;

function validateTransitionState<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
>(
  definition: LoadoutDefinition<SlotReference>,
  state: LoadoutState<SlotReference, Equipment>,
): LoadoutTransitionOutcome<SlotReference, Equipment> | null {
  const validation = validateLoadoutState(definition, state);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: validation.issue.kind,
      state,
    };
  }

  return null;
}

export function initializeLoadout<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference = EquipmentReference,
>(
  definition: LoadoutDefinition<SlotReference>,
): InitializeLoadoutOutcome<SlotReference, Equipment> {
  const validation = validateLoadoutDefinition(definition);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: validation.issues,
    };
  }

  return {
    kind: "initialized",
    state: { assignments: [] },
  };
}

export function assignLoadoutEquipment<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
>(
  definition: LoadoutDefinition<SlotReference>,
  state: LoadoutState<SlotReference, Equipment>,
  slot: SlotReference,
  equipment: Equipment,
): LoadoutTransitionOutcome<SlotReference, Equipment> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.slots.includes(slot)) {
    return { kind: "rejected", reason: "slot-not-defined", state };
  }

  if (!isValidEquipmentReference(equipment)) {
    return { kind: "rejected", reason: "invalid-equipment-reference", state };
  }

  const existingIndex = state.assignments.findIndex((assignment) => assignment.slot === slot);
  if (existingIndex < 0) {
    return {
      kind: "changed",
      state: {
        assignments: [...state.assignments, { slot, equipment }],
      },
    };
  }

  return {
    kind: "changed",
    state: {
      assignments: state.assignments.map((assignment, index) =>
        index === existingIndex ? { slot, equipment } : assignment,
      ),
    },
  };
}

export function clearLoadoutSlot<
  SlotReference extends LoadoutSlotReference,
  Equipment extends EquipmentReference,
>(
  definition: LoadoutDefinition<SlotReference>,
  state: LoadoutState<SlotReference, Equipment>,
  slot: SlotReference,
): LoadoutTransitionOutcome<SlotReference, Equipment> {
  const invalidState = validateTransitionState(definition, state);
  if (invalidState !== null) return invalidState;

  if (!definition.slots.includes(slot)) {
    return { kind: "rejected", reason: "slot-not-defined", state };
  }

  if (!state.assignments.some((assignment) => assignment.slot === slot)) {
    return { kind: "rejected", reason: "slot-empty", state };
  }

  return {
    kind: "changed",
    state: {
      assignments: state.assignments.filter((assignment) => assignment.slot !== slot),
    },
  };
}
