import {
  type AdvancementDefinitionIssue,
  type AdvancementReference,
  type AdvancementTrackDefinition,
  validateAdvancementTrackDefinition,
} from "./definitions.js";
import {
  type AdvancementState,
  type AdvancementStateIssue,
  validateAdvancementState,
} from "./state.js";

export type InitializeAdvancementOutcome<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
> =
  | Readonly<{
      kind: "initialized";
      state: AdvancementState<TrackReference, RankReference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "invalid-definition";
      issues: readonly AdvancementDefinitionIssue<RankReference>[];
    }>;

export type AdvanceAdvancementOutcome<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
> =
  | Readonly<{
      kind: "advanced";
      previousRank: RankReference;
      state: AdvancementState<TrackReference, RankReference>;
    }>
  | Readonly<{
      kind: "complete";
      state: AdvancementState<TrackReference, RankReference>;
    }>
  | Readonly<{
      kind: "rejected";
      reason: AdvancementStateIssue["kind"];
      state: AdvancementState<TrackReference, RankReference>;
    }>;

export function initializeAdvancement<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
>(
  definition: AdvancementTrackDefinition<TrackReference, RankReference>,
): InitializeAdvancementOutcome<TrackReference, RankReference> {
  const validation = validateAdvancementTrackDefinition(definition);
  if (validation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: validation.issues,
    };
  }

  const firstRank = definition.ranks[0];
  if (firstRank === undefined) {
    return {
      kind: "rejected",
      reason: "invalid-definition",
      issues: [{ kind: "empty-ranks" }],
    };
  }

  return {
    kind: "initialized",
    state: { track: definition.reference, rank: firstRank },
  };
}

export function advanceAdvancement<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
>(
  definition: AdvancementTrackDefinition<TrackReference, RankReference>,
  state: AdvancementState<TrackReference, RankReference>,
): AdvanceAdvancementOutcome<TrackReference, RankReference> {
  const stateValidation = validateAdvancementState(definition, state);
  if (stateValidation.kind === "invalid") {
    return {
      kind: "rejected",
      reason: stateValidation.issue.kind,
      state,
    };
  }

  const currentIndex = definition.ranks.indexOf(state.rank);
  const nextRank = definition.ranks[currentIndex + 1];

  if (nextRank === undefined) {
    return { kind: "complete", state };
  }

  return {
    kind: "advanced",
    previousRank: state.rank,
    state: { track: state.track, rank: nextRank },
  };
}
