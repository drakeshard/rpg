# Specialization Incubation

## Status

RPG-I05 / Issue #10 implements the specialization candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns any later stable public-surface admission.

## Responsibility

Specialization owns durable RPG differentiation expressed as selections of game-defined choices, with
an optional bounded positive rank intrinsic to each choice.

A definition contains:

- one stable game-owned specialization reference;
- an authored list of stable game-owned choice references;
- a positive integer `maxRank` for each choice.

Runtime state contains:

- the specialization reference;
- selected choice references and their current positive integer ranks.

The module does not assume that the choices form a tree, graph, class hierarchy, or ability list.
A flat set of permanent choices and a rankable job specialization both use the same state model.

## Operations

- `initializeSpecialization` creates empty selection state from a valid definition;
- `selectSpecializationChoice` persistently selects one defined choice at rank 1;
- `increaseSpecializationChoiceRank` increments one selected choice up to its authored
  `maxRank`.

Duplicate selection, unknown references, unselected rank changes, rank overflow, invalid
definitions, and invalid starting state are explicit rejected outcomes.

No unselect, decrement, refund, or reset operation is admitted in v0.1. Respec semantics usually
carry title-specific cost, refund, timing, and policy rules, so they remain consumer-owned until
evidence proves a narrower reusable rule.

## Prerequisites, branches, and unlocks decision

Prerequisite and unlock relationships remain game-owned for v0.1.

The first-game pressure test can express rules such as:

- requires a particular job or active role;
- requires character level or another title-owned progression value;
- requires another specialization choice/rank;
- chooses one branch and excludes another;
- grants or unlocks a capability after selection.

Those rules consume specialization state but are not part of the specialization definition or
transition engine. In particular, the module does not encode edges, prerequisite expressions,
mutual-exclusion groups, costs, rewards, or callbacks.

This keeps the reusable contract from becoming a graph framework or requirement/effect DSL. If
repeated consumers demonstrate one intrinsic structural relationship, that relationship requires a
separate architecture admission decision.

## Roles and advancement boundary

Specialization remains separate from roles/jobs and advancement.

A game may choose different specialization definitions per job, gate selection by active job, or
require a mastery rank before a choice is allowed. Those are composition rules owned by the game.
`src/specialization` imports no other RPG module.

## Capabilities and rewards boundary

Specialization records only selected choice/rank state. It does not grant capabilities, execute
abilities, apply attribute/resource effects, or emit generic rewards.

A consuming game may observe a successful specialization transition and separately update its
capability or other game-owned state. RPG-I06 will decide independently whether capability ownership
has a coherent reusable boundary.

## Ordering and determinism

Definition order and selection order have no hidden gameplay meaning in v0.1. Selection state
preserves the explicit order in which choices were selected, and rank updates preserve that order.
Identical definitions, starting state, and ordered operations therefore produce identical output.

No hidden time, randomness, browser state, renderer state, registry, or async mutation participates
in specialization transitions.

## Deliberately absent

Specialization does not define:

- a skill-tree or graph framework;
- generic prerequisites or requirement evaluation;
- branch/exclusivity policy;
- automatic unlock availability;
- respec/refund policy;
- capability grants or active ability execution;
- effects, rewards, formulas, costs, or balance;
- job/role ownership or mastery;
- Tactical behavior;
- storage or presentation behavior.
