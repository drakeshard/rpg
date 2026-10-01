# Security Policy

## Scope

This policy covers source code, build configuration, dependencies, CI, and release artifacts.

## Requirements

- Secrets must not be committed.
- External definitions, save-derived state, configuration, and other untrusted data must be treated as untrusted at system boundaries.
- Dependency versions must be exact and the lockfile committed.
- CI uses frozen installs.
- New dependencies require vulnerability, license, maintenance, and lifecycle-script review.
- GitHub Actions use least-privilege permissions.
- Security-sensitive fixes require tests where reproducible.

## Reporting

Do not report suspected vulnerabilities in public issues. Use GitHub private vulnerability reporting when enabled, or contact the repository owner privately.
