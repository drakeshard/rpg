import type { AdvancementReference, AdvancementTrackDefinition } from "./definitions.js";
import { validateAdvancementTrackDefinition } from "./definitions.js";

export type AdvancementState<
  TrackReference extends AdvancementReference = AdvancementReference,
  RankReference extends AdvancementReference = AdvancementReference,
> = Readonly<{
  track: TrackReference;
  rank: RankReference;
}>;

export type AdvancementStateIssue =
  | Readonly<{ kind: "invalid-definition" }>
  | Readonly<{ kind: "track-reference-mismatch" }>
  | Readonly<{ kind: "rank-reference-not-defined" }>;

export type AdvancementStateValidation =
  | Readonly<{ kind: "valid" }>
  | Readonly<{ kind: "invalid"; issue: AdvancementStateIssue }>;

export function validateAdvancementState<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
>(
  definition: AdvancementTrackDefinition<TrackReference, RankReference>,
  state: AdvancementState<TrackReference, RankReference>,
): AdvancementStateValidation {
  if (validateAdvancementTrackDefinition(definition).kind === "invalid") {
    return { kind: "invalid", issue: { kind: "invalid-definition" } };
  }

  if (state.track !== definition.reference) {
    return { kind: "invalid", issue: { kind: "track-reference-mismatch" } };
  }

  if (!definition.ranks.includes(state.rank)) {
    return { kind: "invalid", issue: { kind: "rank-reference-not-defined" } };
  }

  return { kind: "valid" };
}
