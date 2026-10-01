# Loadout / Equipment Assignment Incubation

## Status

RPG-I07 / Issue #12 implements the loadout/equipment-assignment candidate for pressure testing.

This remains an incubation contract. RPG-I09 owns any later stable public-surface admission.

## Responsibility

Loadout owns persistent assignment of game-defined equipment references into game-defined slots.

A definition contains only stable game-owned slot references. Runtime state contains an ordered list of
slot-to-equipment-reference assignments.

The module does not define what an equipment reference identifies. A consuming game may use an item
definition ID, an inventory-instance ID, or another stable game-owned reference.

## Operations

- `initializeLoadout` creates empty assignment state from a valid slot definition;
- `assignLoadoutEquipment` assigns a reference to an empty slot or replaces the existing reference
  in that slot;
- `clearLoadoutSlot` clears an occupied slot.

Unknown slots, invalid references, invalid definitions, invalid starting state, and clearing an empty
slot are explicit rejected outcomes.

Assignment order records first assignment order. Replacing an occupied slot preserves that slot's
position. Clearing a slot preserves the relative order of remaining assignments.

## Equipment catalog decision

Equipment/item catalogs remain consumer-owned for v0.1.

The loadout module validates only that equipment references are JSON-safe stable primitives. It does
not require every equipment reference to appear in an RPG-owned item catalog.

This preserves compatibility with games that load out authored item definitions, unique inventory
instances, generated gear, or another title-owned equipment identity.

## Inventory and eligibility boundary

Inventory possession and equip eligibility remain consumer-owned.

Before calling `assignLoadoutEquipment`, a game may verify that:

- the subject owns the referenced item instance;
- a weapon-like item is allowed in a particular game-defined slot;
- a role/job or level permits the equipment;
- a two-handed item excludes another slot;
- the same item instance may or may not appear in multiple slots.

None of those policies is intrinsic to slot assignment itself.

## Cross-slot uniqueness decision

The module does not require equipment references to be unique across slots.

Some games may intentionally assign one definition reference to multiple slots, while games using
unique inventory-instance IDs may forbid that through consumer policy. Encoding uniqueness here
would incorrectly choose an item identity model for all consumers.

## Effects boundary

Loadout records configuration only. It does not apply attribute/resource modifiers, grant or revoke
capabilities, calculate set bonuses, handle durability, execute attacks, or alter Tactical rules.

A consuming game derives those consequences from loadout state through composition.

## Deliberately absent

Loadout does not define:

- inventory, stacks, quantities, loot, acquisition, or storage;
- item definitions or item metadata;
- hard-coded weapon/armor/accessory vocabulary;
- equip requirements or prerequisite evaluation;
- category/type hierarchies;
- cross-slot conflict or uniqueness policy;
- attributes/resources/capability effects;
- durability, affixes, sockets, upgrades, crafting, or economy;
- combat or Tactical behavior;
- renderer, UI, browser, or persistence infrastructure.
