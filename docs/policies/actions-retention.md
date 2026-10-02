# GitHub Actions Retention

## Scope

This policy applies to workflow-run history in `drakeshard/rpg`.

It mirrors the proven Web Foundation retention model, with one RPG-specific retained workflow: `Openfield Integration Sample`.

## Retention Rules

- Runs on the default branch are retained and are never deleted by repository automation.
- While a pull request is open, all of its workflow-run history is preserved for debugging.
- When a same-repository pull request closes, automation retains the newest completed `CI`, newest completed `Dependency Review`, and newest completed `Openfield Integration Sample` run for that branch.
- Older completed runs for the closed branch are deleted, including failed, cancelled, superseded, duplicate, and retired temporary-workflow runs.
- A scheduled sweep applies the same cleanup to stale non-default branches that have no open pull request.
- Fork pull-request branches are not modified by close-event cleanup.
- The retention workflow never deletes its own runs.
- Default-branch deployment/release history remains intact.

## One-Time Historical Cleanup

The retention workflow also triggers when `.github/workflows/actions-retention.yml` changes on `main`.

That push event performs a full historical sweep across completed runs from same-repository non-default branches. It skips branches with open pull requests and applies the same keep-newest policy.

This bootstrap path exists to clean the historical backlog when retention is first installed. Later workflow edits may safely repeat the sweep; the operation is idempotent because already-retained newest evidence remains protected and deleted runs no longer appear.

## Manual Operation

`Actions Retention` supports manual dispatch.

Manual runs default to dry-run mode. Use dry-run to review candidates before enabling deletion.

A manual run may specify a non-default branch for immediate cleanup. The workflow refuses to clean `main` or a branch with an open pull request.

The stale-branch age threshold defaults to seven days.

## Rationale

Pull-request iteration creates superseded success, failure, and cancelled workflow runs. They are useful while work is active but provide little long-term value after a pull request closes.

The final retained CI, Dependency Review, and Openfield Integration Sample runs preserve useful branch-level evidence. Default-branch history remains untouched.

## Permissions

The workflow uses only:

- `actions: write` to delete completed workflow runs;
- `contents: read`;
- `pull-requests: read`.

No repository-content write permission is granted.
