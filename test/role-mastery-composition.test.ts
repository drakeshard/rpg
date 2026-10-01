import { describe, expect, it } from "vitest";
import {
  advanceAdvancement,
  initializeAdvancement,
  type AdvancementTrackDefinition,
} from "../src/advancement/index.js";
import {
  activateRole,
  grantRole,
  initializeRoles,
  type RoleCatalogDefinition,
} from "../src/roles/index.js";

describe("game-side role mastery composition", () => {
  it("composes roles with advancement without a roles-to-advancement source dependency", () => {
    type JobReference = "Guardian" | "Breaker";

    const jobs: RoleCatalogDefinition<JobReference> = {
      roles: ["Guardian", "Breaker"],
    };
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

    const rolesStart = initializeRoles(jobs);
    const guardianMastery = initializeAdvancement(masteryByJob.Guardian);

    if (rolesStart.kind !== "initialized") throw new Error("jobs must be valid");
    if (guardianMastery.kind !== "initialized") {
      throw new Error("mastery track must be valid");
    }

    const granted = grantRole(jobs, rolesStart.state, "Guardian");
    if (granted.kind !== "changed") throw new Error("Guardian grant must succeed");

    const active = activateRole(jobs, granted.state, "Guardian");
    if (active.kind !== "changed") throw new Error("Guardian activation must succeed");

    const mastery = advanceAdvancement(masteryByJob.Guardian, guardianMastery.state);

    expect(active.state.active).toBe("Guardian");
    expect(mastery).toEqual({
      kind: "advanced",
      previousRank: "initiated",
      state: { track: "guardian-mastery", rank: "seasoned" },
    });
  });
});
