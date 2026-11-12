# Generic Adapter

Use for repository and diff reviews when no SDD adapter is selected or detected. Those reviews require no SDD artifacts and must not assume a Spec-Kit or OpenSpec layout.

For plan, task, apply, verification, or constitution operations, ask the user for the concrete input and output paths before reading or writing an artifact. A suggested layout, when the user asks for one, is `changes/{change}/{spec,plan,tasks,security-constraints}.md`; this is not a discovered project convention. If multiple plausible artifact sets exist, ask the user to choose one. Reuse that selection throughout the operation.

No SDD CLI or extension is required; validation and task-to-implementation checks use the selected files directly. If a file is missing or a target is ambiguous, stop artifact-dependent work and request the missing path.

## Actions

| Action | Invocation or fallback |
|---|---|
| specify / plan / tasks | Create or update only the user-selected artifact paths after approval |
| implement | Follow unchecked tasks from the selected task artifact in order |
| validate | Check the selected spec and tasks inline; no native validator is available |
| archive | Unsupported without an explicit destination and approval |
