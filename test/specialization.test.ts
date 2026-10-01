import { describe, expect, it } from "vitest";
import {
  increaseSpecializationChoiceRank,
  initializeSpecialization,
  type SpecializationDefinition,
  type SpecializationState,
  selectSpecializationChoice,
  validateSpecializationDefinition,
  validateSpecializationState,
} from "../src/specialization/index.js";

describe("specialization definition validation", () => {
  it("accepts a flat title-neutral choice set", () => {
    expect(
      validateSpecializationDefinition({
        reference: "field-doctrine",
        choices: [
          { reference: "mobility", maxRank: 1 },
          { reference: "fortification", maxRank: 1 },
        ],
      }),
    ).toEqual({ kind: "valid" });
  });

  it("accepts rankable choices without requiring a tree or graph", () => {
    expect(
      validateSpecializationDefinition({
        reference: "craft-discipline",
        choices: [
          { reference: "precision", maxRank: 3 },
          { reference: "efficiency", maxRank: 2 },
        ],
      }),
    ).toEqual({ kind: "valid" });
  });

  it("accepts numeric references without imposing an ID scheme", () => {
    expect(
      validateSpecializationDefinition({
        reference: 10,
        choices: [
          { reference: 100, maxRank: 1 },
          { reference: 200, maxRank: 4 },
        ],
      }),
    ).toEqual({ kind: "valid" });
  });

  it("rejects invalid references, empty choices, duplicates, and invalid max ranks", () => {
    expect(
      validateSpecializationDefinition({
        reference: Number.NaN,
        choices: [],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-specialization-reference" }, { kind: "empty-choices" }],
    });

    expect(
      validateSpecializationDefinition({
        reference: "invalid-choices",
        choices: [
          { reference: Number.NaN, maxRank: 0 },
          { reference: "repeat", maxRank: 1 },
          { reference: "repeat", maxRank: 2 },
          { reference: "fractional", maxRank: 1.5 },
        ],
      } satisfies SpecializationDefinition),
    ).toEqual({
      kind: "invalid",
      issues: [
        { kind: "invalid-choice-reference", choice: Number.NaN },
        { kind: "invalid-max-rank", choice: Number.NaN, maxRank: 0 },
        { kind: "duplicate-choice-reference", choice: "repeat" },
        { kind: "invalid-max-rank", choice: "fractional", maxRank: 1.5 },
      ],
    });
  });
});

describe("specialization state and transitions", () => {
  const definition = {
    reference: "discipline",
    choices: [
      { reference: "mobility", maxRank: 1 },
      { reference: "precision", maxRank: 3 },
      { reference: "control", maxRank: 2 },
    ],
  } as const satisfies SpecializationDefinition;

  it("initializes with no selected choices", () => {
    expect(initializeSpecialization(definition)).toEqual({
      kind: "initialized",
      state: {
        specialization: "discipline",
        selections: [],
      },
    });
  });

  it("selects a defined choice at rank 1", () => {
    const state = {
      specialization: "discipline",
      selections: [],
    } as const;

    expect(selectSpecializationChoice(definition, state, "precision")).toEqual({
      kind: "changed",
      state: {
        specialization: "discipline",
        selections: [{ choice: "precision", rank: 1 }],
      },
    });
  });

  it("increases a selected choice rank without changing selection order", () => {
    const state = {
      specialization: "discipline",
      selections: [
        { choice: "precision", rank: 1 },
        { choice: "mobility", rank: 1 },
      ],
    } as const;

    expect(increaseSpecializationChoiceRank(definition, state, "precision")).toEqual({
      kind: "changed",
      state: {
        specialization: "discipline",
        selections: [
          { choice: "precision", rank: 2 },
          { choice: "mobility", rank: 1 },
        ],
      },
    });
  });

  it("rejects duplicate, unknown, unselected, and max-rank operations", () => {
    const state = {
      specialization: "discipline",
      selections: [
        { choice: "mobility", rank: 1 },
        { choice: "precision", rank: 3 },
      ],
    } as const;

    expect(selectSpecializationChoice(definition, state, "mobility")).toEqual({
      kind: "rejected",
      reason: "choice-already-selected",
      state,
    });

    expect(
      selectSpecializationChoice(
        definition as SpecializationDefinition<string, string>,
        state as SpecializationState<string, string>,
        "unknown",
      ),
    ).toEqual({
      kind: "rejected",
      reason: "choice-not-defined",
      state,
    });

    expect(increaseSpecializationChoiceRank(definition, state, "control")).toEqual({
      kind: "rejected",
      reason: "choice-not-selected",
      state,
    });

    expect(increaseSpecializationChoiceRank(definition, state, "precision")).toEqual({
      kind: "rejected",
      reason: "choice-at-max-rank",
      state,
    });
  });

  it("validates specialization association, defined unique choices, and bounded integer ranks", () => {
    expect(
      validateSpecializationState(definition as SpecializationDefinition<string, string>, {
        specialization: "other",
        selections: [],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "specialization-reference-mismatch" },
    });

    expect(
      validateSpecializationState(definition as SpecializationDefinition<string, string>, {
        specialization: "discipline",
        selections: [{ choice: "unknown", rank: 1 }],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "selection-not-defined", choice: "unknown" },
    });

    expect(
      validateSpecializationState(definition, {
        specialization: "discipline",
        selections: [
          { choice: "mobility", rank: 1 },
          { choice: "mobility", rank: 1 },
        ],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "duplicate-selection", choice: "mobility" },
    });

    expect(
      validateSpecializationState(definition, {
        specialization: "discipline",
        selections: [{ choice: "control", rank: 3 }],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "invalid-selection-rank", choice: "control", rank: 3 },
    });

    expect(
      validateSpecializationState(definition, {
        specialization: "discipline",
        selections: [{ choice: "precision", rank: 1.5 }],
      }),
    ).toEqual({
      kind: "invalid",
      issue: { kind: "invalid-selection-rank", choice: "precision", rank: 1.5 },
    });
  });

  it("rejects transitions from invalid runtime state", () => {
    const invalid = {
      specialization: "discipline",
      selections: [{ choice: "precision", rank: 9 }],
    } as const;

    expect(selectSpecializationChoice(definition, invalid, "control")).toEqual({
      kind: "rejected",
      reason: "invalid-selection-rank",
      state: invalid,
    });
  });

  it("rejects initialization from an invalid definition", () => {
    const invalid = {
      reference: "empty",
      choices: [],
    } as const;

    expect(initializeSpecialization(invalid)).toEqual({
      kind: "rejected",
      reason: "invalid-definition",
      issues: [{ kind: "empty-choices" }],
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const start = {
      specialization: "discipline",
      selections: [{ choice: "precision", rank: 1 }],
    } as const;

    const first = increaseSpecializationChoiceRank(definition, start, "precision");
    const second = increaseSpecializationChoiceRank(definition, start, "precision");

    expect(first).toEqual(second);
    expect(start).toEqual({
      specialization: "discipline",
      selections: [{ choice: "precision", rank: 1 }],
    });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = {
      specialization: "discipline",
      selections: [
        { choice: "precision", rank: 2 },
        { choice: "control", rank: 1 },
      ],
    } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("first-game specialization pressure test", () => {
  it("keeps job gates, prerequisites, exclusivity, and capability rewards in game composition", () => {
    type Choice = "ember-path" | "frost-path" | "pyre-mastery";

    const definition: SpecializationDefinition<"arcanist-specialization", Choice> = {
      reference: "arcanist-specialization",
      choices: [
        { reference: "ember-path", maxRank: 1 },
        { reference: "frost-path", maxRank: 1 },
        { reference: "pyre-mastery", maxRank: 2 },
      ],
    };

    const initialized = initializeSpecialization(definition);
    if (initialized.kind !== "initialized") throw new Error("definition must be valid");

    type GameContext = Readonly<{
      activeJob: "Arcanist" | "Guardian";
      level: number;
      specialization: SpecializationState<"arcanist-specialization", Choice>;
    }>;

    const hasChoiceRank = (
      state: SpecializationState<"arcanist-specialization", Choice>,
      choice: Choice,
      rank: number,
    ) =>
      state.selections.some((selection) => selection.choice === choice && selection.rank >= rank);

    const canSelect = (choice: Choice, context: GameContext): boolean => {
      if (context.activeJob !== "Arcanist") return false;

      if (choice === "frost-path" && hasChoiceRank(context.specialization, "ember-path", 1)) {
        return false;
      }

      if (choice === "ember-path" && hasChoiceRank(context.specialization, "frost-path", 1)) {
        return false;
      }

      if (choice === "pyre-mastery") {
        return context.level >= 10 && hasChoiceRank(context.specialization, "ember-path", 1);
      }

      return true;
    };

    const rewards: Readonly<Record<Choice, readonly string[]>> = {
      "ember-path": ["Fireball"],
      "frost-path": ["IceLance"],
      "pyre-mastery": ["Inferno"],
    };

    const wrongJob: GameContext = {
      activeJob: "Guardian",
      level: 20,
      specialization: initialized.state,
    };
    expect(canSelect("ember-path", wrongJob)).toBe(false);

    const arcanist: GameContext = {
      activeJob: "Arcanist",
      level: 12,
      specialization: initialized.state,
    };
    expect(canSelect("ember-path", arcanist)).toBe(true);

    const ember = selectSpecializationChoice(definition, initialized.state, "ember-path");
    if (ember.kind !== "changed") throw new Error("ember path must be selectable");

    const afterEmber: GameContext = { ...arcanist, specialization: ember.state };
    expect(canSelect("frost-path", afterEmber)).toBe(false);
    expect(canSelect("pyre-mastery", afterEmber)).toBe(true);

    const pyre = selectSpecializationChoice(definition, ember.state, "pyre-mastery");
    if (pyre.kind !== "changed") throw new Error("pyre mastery must be selectable");

    const ownedCapabilities = [...rewards["ember-path"], ...rewards["pyre-mastery"]];

    expect(pyre.state).toEqual({
      specialization: "arcanist-specialization",
      selections: [
        { choice: "ember-path", rank: 1 },
        { choice: "pyre-mastery", rank: 1 },
      ],
    });
    expect(ownedCapabilities).toEqual(["Fireball", "Inferno"]);
  });
});
