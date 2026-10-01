import { describe, expect, it } from "vitest";
import {
  type CapabilityCatalogDefinition,
  type CapabilityOwnershipState,
  grantCapability,
  initializeCapabilityOwnership,
} from "../src/capabilities/index.js";
import {
  initializeSpecialization,
  type SpecializationDefinition,
  selectSpecializationChoice,
} from "../src/specialization/index.js";

describe("game-side specialization capability composition", () => {
  it("keeps reward mapping and grant policy outside both source modules", () => {
    type Choice = "ember-path" | "frost-path";
    type Capability = "Fireball" | "IceLance";

    const specialization: SpecializationDefinition<"arcanist", Choice> = {
      reference: "arcanist",
      choices: [
        { reference: "ember-path", maxRank: 1 },
        { reference: "frost-path", maxRank: 1 },
      ],
    };
    const capabilities: CapabilityCatalogDefinition<Capability> = {
      capabilities: ["Fireball", "IceLance"],
    };
    const rewardByChoice: Readonly<Record<Choice, Capability>> = {
      "ember-path": "Fireball",
      "frost-path": "IceLance",
    };

    const specializationStart = initializeSpecialization(specialization);
    const capabilityStart = initializeCapabilityOwnership(capabilities);
    if (specializationStart.kind !== "initialized") throw new Error("specialization must be valid");
    if (capabilityStart.kind !== "initialized") throw new Error("capabilities must be valid");

    const selected = selectSpecializationChoice(
      specialization,
      specializationStart.state,
      "ember-path",
    );
    if (selected.kind !== "changed") throw new Error("selection must succeed");

    const reward = rewardByChoice["ember-path"];
    const granted = grantCapability(capabilities, capabilityStart.state, reward);

    expect(selected.state).toEqual({
      specialization: "arcanist",
      selections: [{ choice: "ember-path", rank: 1 }],
    });
    expect(granted).toEqual({
      kind: "changed",
      state: { owned: ["Fireball"] },
    });
  });

  it("keeps execution requirements, costs, effects, and temporary availability game-owned", () => {
    type Capability = "Fireball";

    const capabilities: CapabilityCatalogDefinition<Capability> = {
      capabilities: ["Fireball"],
    };
    const start = initializeCapabilityOwnership(capabilities);
    if (start.kind !== "initialized") throw new Error("capabilities must be valid");

    const granted = grantCapability(capabilities, start.state, "Fireball");
    if (granted.kind !== "changed") throw new Error("grant must succeed");

    const canExecuteFireball = (
      context: Readonly<{
        owned: CapabilityOwnershipState<Capability>;
        mana: number;
        silenced: boolean;
        tacticalTargetInRange: boolean;
      }>,
    ) =>
      context.owned.owned.includes("Fireball") &&
      context.mana >= 5 &&
      !context.silenced &&
      context.tacticalTargetInRange;

    expect(
      canExecuteFireball({
        owned: granted.state,
        mana: 10,
        silenced: false,
        tacticalTargetInRange: true,
      }),
    ).toBe(true);
    expect(
      canExecuteFireball({
        owned: granted.state,
        mana: 2,
        silenced: false,
        tacticalTargetInRange: true,
      }),
    ).toBe(false);
  });
});
