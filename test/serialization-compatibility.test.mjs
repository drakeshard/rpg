import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { validateAdvancementState } from "../src/advancement/index.js";
import { validateAttributeState } from "../src/attributes/index.js";
import { validateCapabilityOwnershipState } from "../src/capabilities/index.js";
import { validateLoadoutState } from "../src/loadout/index.js";
import { validateResourceState } from "../src/resources/index.js";
import { validateRolesState } from "../src/roles/index.js";
import { validateSpecializationState } from "../src/specialization/index.js";

function fixture(name) {
  return JSON.parse(
    fs.readFileSync(new URL(`./fixtures/persisted-state/${name}.json`, import.meta.url), "utf8"),
  );
}

describe("persisted-state compatibility fixtures", () => {
  it("keeps advancement state JSON-compatible and valid", () => {
    const state = fixture("advancement");
    expect(state).toEqual({ track: "job-mastery", rank: "rank-2" });
    expect(
      validateAdvancementState(
        { reference: "job-mastery", ranks: ["rank-1", "rank-2", "rank-3"] },
        state,
      ),
    ).toEqual({ kind: "valid" });
  });

  it("keeps roles state JSON-compatible and valid", () => {
    const state = fixture("roles");
    expect(state).toEqual({ owned: ["guardian", "arcanist"], active: "arcanist" });
    expect(validateRolesState({ roles: ["guardian", "arcanist"] }, state)).toEqual({
      kind: "valid",
    });
  });

  it("keeps resources state JSON-compatible and valid", () => {
    const state = fixture("resources");
    expect(state).toEqual({ resource: "mana", current: 35.5, capacity: 50 });
    expect(
      validateResourceState({ reference: "mana", initialCurrent: 50, initialCapacity: 50 }, state),
    ).toEqual({ kind: "valid" });
  });

  it("keeps attributes state JSON-compatible and valid", () => {
    const state = fixture("attributes");
    expect(state).toEqual({ attribute: "strength", base: 12.5 });
    expect(validateAttributeState({ reference: "strength", initialBase: 10 }, state)).toEqual({
      kind: "valid",
    });
  });

  it("keeps specialization state JSON-compatible and valid", () => {
    const state = fixture("specialization");
    expect(state).toEqual({
      specialization: "discipline",
      selections: [
        { choice: "precision", rank: 2 },
        { choice: "control", rank: 1 },
      ],
    });
    expect(
      validateSpecializationState(
        {
          reference: "discipline",
          choices: [
            { reference: "precision", maxRank: 3 },
            { reference: "control", maxRank: 2 },
          ],
        },
        state,
      ),
    ).toEqual({ kind: "valid" });
  });

  it("keeps capability ownership JSON-compatible and valid", () => {
    const state = fixture("capabilities");
    expect(state).toEqual({ owned: ["dash", "guard"] });
    expect(validateCapabilityOwnershipState({ capabilities: ["dash", "guard"] }, state)).toEqual({
      kind: "valid",
    });
  });

  it("keeps loadout state JSON-compatible and valid", () => {
    const state = fixture("loadout");
    expect(state).toEqual({
      assignments: [
        { slot: "weapon", equipment: "iron-sword" },
        { slot: "armor", equipment: "leather-coat" },
      ],
    });
    expect(validateLoadoutState({ slots: ["weapon", "armor"] }, state)).toEqual({
      kind: "valid",
    });
  });
});
