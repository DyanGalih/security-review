# Spec-Kit Adapter

Use when `.specify/` marks the selected project or the user selects Spec-Kit.

## Active work

Prefer the feature explicitly named by the user, then `.specify/feature.json`'s `feature_directory` when present. Otherwise consider the current feature branch and the feature directories under `specs/`. Select only one unambiguous match; if several exist, ask. Check `.specify/init-options.json` before generating a new numbered feature directory. Do not assume that files under `.specify/` are the active feature's plan or tasks.

## Artifact paths

| Key | Path |
|---|---|
| project-config | `.specify/memory/constitution.md` |
| security-constitution | `.specify/memory/security_constitution.md` |
| architecture-constitution | `.specify/memory/architecture_constitution.md` |
| spec | `specs/{feature}/spec.md` |
| plan | `specs/{feature}/plan.md` |
| tasks | `specs/{feature}/tasks.md` |
| security-constraints | `specs/{feature}/security-constraints.md` |

When Spec-Kit provides a feature-path resolver, use its output. If it is unavailable, use only the selected feature directory and confirm its concrete paths before writing. Repository and diff reviews need no active feature.

## Actions

| Action | Invocation or fallback |
|---|---|
| inspect | Use the installed Spec-Kit feature-path resolver; otherwise inspect the selected `specs/{feature}/` directory |
| specify / plan / tasks | Use the corresponding registered Spec-Kit command, or update the selected artifact inline with user approval |
| implement | Use the registered Spec-Kit implement command; otherwise follow the selected tasks in order |
| validate | No universal Spec-Kit validator; check the selected spec's requirements and acceptance criteria explicitly |
| archive | Unsupported natively; retain feature artifacts and ask before moving them |
