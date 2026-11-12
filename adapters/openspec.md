# OpenSpec Adapter

Use when `openspec/config.yaml` or `openspec/` marks the selected project, or the user selects OpenSpec. If the project uses an OpenSpec store, use `openspec store list --json` to identify it; when several stores could own this work, ask the user to choose. Pass the selected ID with `--store` for subsequent `list`, `status`, `instructions`, and `validate` calls. Never assume the local `openspec/` directory is the store's root.

## Active work

Prefer an explicitly named change. Otherwise use `openspec list --json` to find active changes; select it only if exactly one exists. Ask the user when several exist or none exists for an artifact-dependent command. Use `openspec status --change <name> --json` and its returned `changeRoot` and `artifactPaths` (`existingOutputPaths` where available) to resolve paths. Do not treat a capability name or an archived change as active work.

## Artifact paths

| Key | Default path under a local project |
|---|---|
| project-config | `openspec/config.yaml` |
| security-constitution | `openspec/security.md` |
| architecture-constitution | `openspec/architecture.md` |
| proposal | `openspec/changes/{change}/proposal.md` |
| spec | `openspec/changes/{change}/specs/{capability}/spec.md` |
| plan | `openspec/changes/{change}/design.md` |
| tasks | `openspec/changes/{change}/tasks.md` |
| security-constraints | `openspec/changes/{change}/security-constraints.md` |

The CLI-reported paths override these local defaults. A change may have several capability specs; read each relevant one. For repository-only reviews, a change is optional. If the CLI is unavailable, read local artifacts only after the user identifies the change and project root; do not select one by directory order. Ask for paths if an artifact is absent.

## Actions

| Action | Invocation or fallback |
|---|---|
| list changes | `openspec list --json`; if unavailable, ask for the change name |
| inspect | `openspec status --change <name> --json`; if unavailable, inspect the user-selected local change |
| validate | `openspec validate <name> --strict`; if unavailable, check the selected artifacts against their schema without claiming CLI validation |
| implement | Use the registered OpenSpec apply capability; otherwise follow the selected tasks in order |
| archive | Unsupported without the OpenSpec CLI; never move or overwrite artifacts implicitly |
