# Dependency Policy

## Baseline

Runtime dependencies start at zero.

## Admission criteria

A dependency addition must document:

1. the concrete problem it solves;
2. the current consumer;
3. why platform/local implementation is insufficient;
4. runtime versus development classification;
5. transitive dependencies;
6. license;
7. maintenance status;
8. runtime/bundle impact where relevant;
9. replacement cost;
10. known security considerations.

## Repository requirements

- Package manifests use exact versions.
- `pnpm-lock.yaml` is committed.
- CI installs with `--frozen-lockfile`.
- Dependencies with install scripts, binary downloads, or unusual lifecycle behavior require additional review.
- Dependencies are not added solely to replace trivial local utilities.

## Cross-library dependencies

`@drakeshard/foundation` is not automatically approved. A Foundation dependency must correspond to a Foundation-owned infrastructure contract that RPG genuinely needs directly.

Tactical dependencies are prohibited by default. RPG/Tactical composition belongs in the consuming game unless a later controlled architecture decision proves otherwise.
