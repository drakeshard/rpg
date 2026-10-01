# RPG Implementation and Incubation Conventions

## Status and authority

These are the repository-level implementation conventions established by RPG-I00 / Issue #5.
They operationalize RPG-ARCH-001 without replacing it. Google Drive remains authoritative for RPG
architecture and ownership decisions; this document is the code-adjacent contract later RPG issues
must follow.

No gameplay module or public API is admitted by this document.

## Host-owned subject association

RPG modules describe state for a role-bearing subject, but the subject identity belongs to the
consuming game by default.

- Do not create a universal `RpgCharacter`, `RpgEntity`, or package-wide subject identifier.
- A game may associate module state with its own `CharacterId`, `ActorId`, `HeroId`, entity handle,
  or another stable identity outside the RPG module.
- An RPG module should accept or store a subject reference only when that module's own semantics
  require one. Do not add subject identity merely to make unrelated modules look uniform.
- Cross-module aggregation of a subject's RPG state belongs to the consuming game until repeated
  evidence proves a coherent RPG-owned aggregate.

## Definitions, references, and runtime state

Game-authored definitions and runtime state are separate responsibilities.

Definitions:

- represent authored content/configuration;
- are treated as immutable inputs by authoritative operations;
- use stable game-owned references for game-owned content;
- may use RPG-owned identifiers only for concepts the module itself owns.

Runtime state:

- contains only the minimum mutable/replaceable data needed by the module;
- refers to authored content by stable reference rather than embedding the full definition graph;
- does not contain renderer objects, DOM objects, functions, services, registries, or other hidden
  mutable infrastructure;
- is plain data and JSON-compatible where practical.

The package does not impose UUIDs, database identifiers, opaque-ID helpers, or one global content-ID
shape.

## Operations and outcomes

Each module defines the operation and outcome types natural to its responsibility. Do not create a
package-wide `RpgResult<T>`, command bus, event bus, generic mutation envelope, or metadata bag to
standardize unrelated modules.

The required conceptual shape is:

```text
current state + operation + relevant definitions/policy inputs
  -> explicit module-local outcome + next state
```

An operation may reject an invalid transition, return the unchanged state, or produce a changed
state as appropriate to that module. The behavior must be explicit and covered by tests. The
package does not prescribe one universal error/result convention.

## Determinism

Authoritative RPG transitions must be repeatable when given the same definitions, starting state,
ordered operations, and explicit external inputs.

Authoritative source must not read or schedule hidden nondeterministic state such as:

- `Math.random()`, random UUID generation, or other implicit randomness;
- `Date.now()`, zero-argument `new Date()`, `performance.now()`, or another hidden wall clock;
- timers or implicit scheduling used to mutate authoritative state;
- renderer, DOM, browser, input-device, or service-locator state;
- global registries or hidden mutable singletons.

If a future operation genuinely needs time, randomness, or another external value, the caller must
provide the relevant deterministic value or policy explicitly. A Foundation dependency is not
implied; it requires a separate architecture admission decision.

Ordering that affects results must be explicit. Do not depend on unspecified iteration or callback
ordering for authoritative outcomes.

## Serialization boundary

Admitted RPG runtime state should survive JSON serialization without semantic loss where practical.
Prefer JSON primitives, arrays, and records for persisted state.

Do not put the following in admitted persisted state:

- functions or closures;
- `Date`, DOM, renderer, service, or class instances whose behavior is not plain data;
- `Map`, `Set`, `BigInt`, `undefined`, `NaN`, or infinities without an explicit module-owned encoded
  representation;
- uncontrolled timestamps or random values generated inside an authoritative transition.

The RPG module owns the compatibility of its admitted state shape. The consuming game owns the
aggregate save payload and content-recovery policy. Storage backends, save slots, migrations
infrastructure, and browser persistence are not RPG responsibilities.

## Import boundaries

RPG source remains renderer-, UI-, browser-, consuming-game-, and Tactical-independent by default.

- No bare/external source import is allowed before explicit architecture admission.
- Relative imports must not cross into Tactical, presentation, UI, or browser layers.
- `@drakeshard/foundation` is not automatically admitted.
- Initial incubation modules should not import each other merely to encode title policy. Prefer game
  composition until a relationship proves intrinsic and reusable.

`scripts/check-architecture.mjs` enforces the subset of these rules that can be checked reliably by
repository static analysis and is regression-tested against both allowed imports and prohibited
external, sibling-domain, hidden-randomness/time, scheduling, and browser cases.

`scripts/check-package.mjs` separately protects current incubation/package invariants: private
status, zero runtime dependencies, dist-only package contents, absence of public package entry/export
metadata, and an empty stable root gameplay export. These checks are admission tripwires, not a
substitute for the controlled architecture decision required to change those boundaries.

## Testing convention

Every admitted RPG mechanism must have isolated tests covering the parts that apply to it:

1. valid definitions and representative invalid definitions;
2. valid transitions;
3. invalid/rejected transitions and invariants;
4. deterministic repeatability from identical ordered inputs;
5. ordering semantics when order affects the result;
6. JSON serialization round-trip and representative persisted-state compatibility fixtures;
7. immutability of input definitions/state and preservation of unaffected order/values;
8. applicable numeric/reference boundary matrices without inventing title policy;
9. title-neutral fixtures first;
10. current-consumer pressure-test fixtures after the title-neutral contract is proven.

Cross-module title policy and RPG/Tactical composition are tested in the consuming game rather than
by adding sibling-library dependencies to RPG.

## Explicit non-goals

RPG-I00 does not introduce:

- a universal character/entity object;
- gameplay modules such as advancement, roles, resources, or attributes;
- a package-wide result/error abstraction;
- a generic requirement/effect DSL;
- an event bus, command bus, service locator, or global registry;
- a Foundation or Tactical dependency;
- renderer, UI, browser, or storage integration.

RPG-I01 and later issues must use these conventions without treating them as permission to expand
scope beyond their own issue.
