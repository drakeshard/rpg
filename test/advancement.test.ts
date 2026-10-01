import { describe, expect, it } from "vitest";
import {
  advanceAdvancement,
  initializeAdvancement,
  type AdvancementState,
  type AdvancementTrackDefinition,
  validateAdvancementState,
  validateAdvancementTrackDefinition,
} from "../src/advancement/index.js";

describe("advancement definition validation", () => {
  it("accepts title-neutral string rank references without XP or numeric levels", () => {
    const definition = {
      reference: "discipline",
      ranks: ["novice", "adept", "mastered"],
    } as const;

    expect(validateAdvancementTrackDefinition(definition)).toEqual({ kind: "valid" });
  });

  it("accepts sparse numeric rank references without assuming a 1-99 range", () => {
    const definition = {
      reference: 9001,
      ranks: [0, 100, 1000],
    } as const;

    expect(validateAdvancementTrackDefinition(definition)).toEqual({ kind: "valid" });
  });

  it("rejects empty, duplicate, and non-JSON-safe references", () => {
    expect(
      validateAdvancementTrackDefinition({
        reference: Number.POSITIVE_INFINITY,
        ranks: [],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-track-reference" }, { kind: "empty-ranks" }],
    });

    expect(
      validateAdvancementTrackDefinition({
        reference: "track",
        ranks: ["novice", "novice"],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "duplicate-rank-reference", rank: "novice" }],
    });

    expect(
      validateAdvancementTrackDefinition({
        reference: "track",
        ranks: [Number.NaN],
      }),
    ).toEqual({
      kind: "invalid",
      issues: [{ kind: "invalid-rank-reference", rank: Number.NaN }],
    });
  });
});

describe("advancement operations", () => {
  const definition = {
    reference: "weapon-mastery",
    ranks: ["untrained", "trained", "expert", "mastered"],
  } as const satisfies AdvancementTrackDefinition;

  it("initializes at the first game-defined rank reference", () => {
    expect(initializeAdvancement(definition)).toEqual({
      kind: "initialized",
      state: { track: "weapon-mastery", rank: "untrained" },
    });
  });

  it("advances exactly one rank without consulting XP, time, or randomness", () => {
    const state = { track: "weapon-mastery", rank: "trained" } as const;

    expect(advanceAdvancement(definition, state)).toEqual({
      kind: "advanced",
      previousRank: "trained",
      state: { track: "weapon-mastery", rank: "expert" },
    });
  });

  it("returns complete without mutating state at the final rank", () => {
    const state = { track: "weapon-mastery", rank: "mastered" } as const;
    const outcome = advanceAdvancement(definition, state);

    expect(outcome).toEqual({ kind: "complete", state });
    expect(outcome.state).toBe(state);
  });

  it("rejects mismatched tracks and ranks not present in the definition", () => {
    const mismatched = {
      track: "other-track",
      rank: "trained",
    } as AdvancementState<string, string>;
    const unknownRank = {
      track: "weapon-mastery",
      rank: "legendary",
    } as AdvancementState<string, string>;

    expect(validateAdvancementState(definition, mismatched)).toEqual({
      kind: "invalid",
      issue: { kind: "track-reference-mismatch" },
    });
    expect(advanceAdvancement(definition, mismatched)).toEqual({
      kind: "rejected",
      reason: "track-reference-mismatch",
      state: mismatched,
    });

    expect(validateAdvancementState(definition, unknownRank)).toEqual({
      kind: "invalid",
      issue: { kind: "rank-reference-not-defined" },
    });
    expect(advanceAdvancement(definition, unknownRank)).toEqual({
      kind: "rejected",
      reason: "rank-reference-not-defined",
      state: unknownRank,
    });
  });

  it("produces repeatable outcomes from identical explicit inputs", () => {
    const state = { track: "weapon-mastery", rank: "untrained" } as const;

    const first = advanceAdvancement(definition, state);
    const second = advanceAdvancement(definition, state);

    expect(first).toEqual(second);
    expect(state).toEqual({ track: "weapon-mastery", rank: "untrained" });
  });

  it("round-trips representative runtime state through JSON", () => {
    const state = { track: "weapon-mastery", rank: "expert" } as const;

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("first-game job mastery pressure test", () => {
  it("keeps job ownership outside advancement while tracking mastery per job", () => {
    type JobReference = "Guardian" | "Breaker";

    const masteryByJob: Record<
      JobReference,
      AdvancementTrackDefinition<string, string>
    > = {
      Guardian: {
        reference: "guardian-mastery",
        ranks: ["initiated", "seasoned", "mastered"],
      },
      Breaker: {
        reference: "breaker-mastery",
        ranks: ["initiated", "mastered"],
      },
    };

    const ownedJobs: readonly JobReference[] = ["Guardian"];
    const guardianMastery = initializeAdvancement(masteryByJob.Guardian);

    expect(ownedJobs).toEqual(["Guardian"]);
    expect(guardianMastery).toEqual({
      kind: "initialized",
      state: { track: "guardian-mastery", rank: "initiated" },
    });

    if (guardianMastery.kind !== "initialized") {
      throw new Error("pressure-test definition must be valid");
    }

    expect(advanceAdvancement(masteryByJob.Guardian, guardianMastery.state)).toEqual({
      kind: "advanced",
      previousRank: "initiated",
      state: { track: "guardian-mastery", rank: "seasoned" },
    });
  });
});
