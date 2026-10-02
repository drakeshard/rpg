import {
  decreaseResource,
  increaseResource,
  initializeResource,
  setResourceCapacity,
  type ResourceDefinition,
  type ResourceState,
} from "../../../src/resources/index";

const HEALTH: ResourceDefinition<"health"> = {
  reference: "health",
  initialCurrent: 100,
  initialCapacity: 100,
};
const STAMINA: ResourceDefinition<"stamina"> = {
  reference: "stamina",
  initialCurrent: 100,
  initialCapacity: 100,
};

function initialState<Reference extends "health" | "stamina">(
  definition: ResourceDefinition<Reference>,
): ResourceState<Reference> {
  const outcome = initializeResource(definition);
  if (outcome.kind !== "initialized") throw new Error(`Invalid ${definition.reference} definition`);
  return outcome.state;
}

export class PlayerResources {
  health: ResourceState<"health"> = initialState(HEALTH);
  stamina: ResourceState<"stamina"> = initialState(STAMINA);

  reset(): void {
    this.health = initialState(HEALTH);
    this.stamina = initialState(STAMINA);
  }

  damage(amount: number): number {
    const before = this.health.current;
    const outcome = decreaseResource(HEALTH, this.health, amount);
    if (outcome.kind === "rejected") return 0;
    this.health = outcome.state;
    return before - this.health.current;
  }

  heal(amount: number): number {
    const before = this.health.current;
    const outcome = increaseResource(HEALTH, this.health, amount);
    if (outcome.kind === "rejected") return 0;
    this.health = outcome.state;
    return this.health.current - before;
  }

  spendStamina(amount: number): number {
    const before = this.stamina.current;
    const outcome = decreaseResource(STAMINA, this.stamina, amount);
    if (outcome.kind === "rejected") return 0;
    this.stamina = outcome.state;
    return before - this.stamina.current;
  }

  recoverStamina(amount: number): number {
    const before = this.stamina.current;
    const outcome = increaseResource(STAMINA, this.stamina, amount);
    if (outcome.kind === "rejected") return 0;
    this.stamina = outcome.state;
    return this.stamina.current - before;
  }

  setHealthCapacity(capacity: number): void {
    const outcome = setResourceCapacity(HEALTH, this.health, capacity);
    if (outcome.kind !== "rejected") this.health = outcome.state;
  }

  setStaminaCapacity(capacity: number): void {
    const outcome = setResourceCapacity(STAMINA, this.stamina, capacity);
    if (outcome.kind !== "rejected") this.stamina = outcome.state;
  }
}
