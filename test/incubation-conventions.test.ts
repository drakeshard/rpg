import { describe, expect, it } from "vitest";

type FixtureDefinition = Readonly<{
  reference: string;
  maximum: number;
}>;

type FixtureState = Readonly<{
  definitionReference: string;
  value: number;
}>;

type FixtureOperation = Readonly<{
  kind: "increase";
  amount: number;
}>;

type FixtureOutcome =
  | Readonly<{ kind: "applied"; state: FixtureState }>
  | Readonly<{
      kind: "rejected";
      reason: "definition-mismatch" | "invalid-amount" | "maximum-exceeded";
      state: FixtureState;
    }>;

function applyFixtureOperation(
  definition: FixtureDefinition,
  state: FixtureState,
  operation: FixtureOperation,
): FixtureOutcome {
  if (state.definitionReference !== definition.reference) {
    return { kind: "rejected", reason: "definition-mismatch", state };
  }
  if (!Number.isFinite(operation.amount) || operation.amount <= 0) {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  const nextValue = state.value + operation.amount;
  if (nextValue > definition.maximum) {
    return { kind: "rejected", reason: "maximum-exceeded", state };
  }

  return {
    kind: "applied",
    state: { definitionReference: state.definitionReference, value: nextValue },
  };
}

describe("RPG-I00 incubation conventions", () => {
  it("keeps host subject identity outside module runtime state", () => {
    const hostSubjectId = "host-subject-7";
    const state: FixtureState = { definitionReference: "fixture-track", value: 2 };
    const association = new Map([[hostSubjectId, state]]);

    expect(association.get(hostSubjectId)).toEqual(state);
    expect(state).not.toHaveProperty("subjectId");
  });

  it("produces identical outcomes from identical explicit inputs without mutating them", () => {
    const definition: FixtureDefinition = { reference: "fixture-track", maximum: 10 };
    const state: FixtureState = { definitionReference: definition.reference, value: 2 };
    const operation: FixtureOperation = { kind: "increase", amount: 3 };
    const definitionBefore = structuredClone(definition);
    const stateBefore = structuredClone(state);
    const operationBefore = structuredClone(operation);

    const first = applyFixtureOperation(definition, state, operation);
    const second = applyFixtureOperation(definition, state, operation);

    expect(first).toEqual(second);
    expect(definition).toEqual(definitionBefore);
    expect(state).toEqual(stateBefore);
    expect(operation).toEqual(operationBefore);
  });

  it("uses module-local rejected outcomes for invalid transitions", () => {
    const definition: FixtureDefinition = { reference: "fixture-track", maximum: 4 };
    const state: FixtureState = { definitionReference: definition.reference, value: 3 };

    expect(applyFixtureOperation(definition, state, { kind: "increase", amount: 2 })).toEqual({
      kind: "rejected",
      reason: "maximum-exceeded",
      state,
    });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state: FixtureState = { definitionReference: "fixture-track", value: 2 };

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
