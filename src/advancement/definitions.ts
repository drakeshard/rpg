export type AdvancementReference = string | number;

export type AdvancementTrackDefinition<
  TrackReference extends AdvancementReference = AdvancementReference,
  RankReference extends AdvancementReference = AdvancementReference,
> = Readonly<{
  reference: TrackReference;
  ranks: readonly RankReference[];
}>;

export type AdvancementDefinitionIssue<
  RankReference extends AdvancementReference = AdvancementReference,
> =
  | Readonly<{ kind: "invalid-track-reference" }>
  | Readonly<{ kind: "empty-ranks" }>
  | Readonly<{ kind: "invalid-rank-reference"; rank: RankReference }>
  | Readonly<{ kind: "duplicate-rank-reference"; rank: RankReference }>;

export type AdvancementDefinitionValidation<
  RankReference extends AdvancementReference = AdvancementReference,
> =
  | Readonly<{ kind: "valid" }>
  | Readonly<{
      kind: "invalid";
      issues: readonly AdvancementDefinitionIssue<RankReference>[];
    }>;

function isJsonSafeReference(reference: AdvancementReference): boolean {
  return typeof reference === "string" || Number.isFinite(reference);
}

export function validateAdvancementTrackDefinition<
  TrackReference extends AdvancementReference,
  RankReference extends AdvancementReference,
>(
  definition: AdvancementTrackDefinition<TrackReference, RankReference>,
): AdvancementDefinitionValidation<RankReference> {
  const issues: AdvancementDefinitionIssue<RankReference>[] = [];

  if (!isJsonSafeReference(definition.reference)) {
    issues.push({ kind: "invalid-track-reference" });
  }

  if (definition.ranks.length === 0) {
    issues.push({ kind: "empty-ranks" });
  }

  const seenRanks = new Set<RankReference>();
  for (const rank of definition.ranks) {
    if (!isJsonSafeReference(rank)) {
      issues.push({ kind: "invalid-rank-reference", rank });
      continue;
    }
    if (seenRanks.has(rank)) {
      issues.push({ kind: "duplicate-rank-reference", rank });
      continue;
    }
    seenRanks.add(rank);
  }

  if (issues.length > 0) {
    return { kind: "invalid", issues };
  }

  return { kind: "valid" };
}
