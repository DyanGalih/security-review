---
description: 'Apply approved security follow-up items into Spec-Kit planning artifacts'
---

# Security Review - Apply Follow-Ups

## User Input

$ARGUMENTS

## Objective

Apply approved security follow-up items into the local Spec-Kit planning artifacts without changing the broader project implementation.
If `flash-mem` is available, use `flash-mem prepare-context` and the canonical memory tools (`get_project_summary`, `search_memory`, `get_relevant_context`). If `flash-mem` is not installed, fall back to the MCP tools exposed by `spec-kit-memory-hub`; do not shell out to `npx memory-hub` directly.

Use this command when you want to:

- turn security findings into concrete backlog updates
- add new security tasks to `tasks.md`
- update `plan.md` only when a security decision, acceptance criterion, or sequencing rule must change
- preserve the existing Spec-Kit flow instead of replacing it

Treat the latest security review findings or the follow-up plan as the source of truth. If the user does not provide one, look for a recent security review report, a follow-up plan, or the current backlog context.

When project memory exists, use it as design context. Compare the requested updates against the project flash-mem, architecture decisions, and any repository-native memory artifacts the team uses to preserve intent.

## Flash-Mem Security Context Retrieval

Before performing security analysis:

1. Search Flash-Mem for relevant security context before reading the approved follow-ups or backlog in depth.
2. Prefer summary-first retrieval and collect `title`, `summary`, `category`, `tags`, `confidence`, and `related files` first.
3. Prioritize retrieval in this order: project-specific security memories, recent findings, high-confidence findings, previously validated findings, repeated attack patterns, and organization-wide lessons learned.
4. Retrieve full memory content only when summaries are insufficient, a finding appears highly relevant, or detailed remediation history is required.
5. Check whether a candidate finding has previously occurred, been accepted as risk, been mitigated, or been classified as a false positive.
6. Reuse validated security knowledge whenever possible and avoid generating duplicate findings when historical evidence already exists.
7. Keep the workflow compatible with future Flash-Mem improvements and do not depend on storage internals, ranking details, or export behavior.

## Flash-Mem Security Knowledge Capture

After analysis completes, store durable security knowledge back into Flash-Mem.

Persist:

- confirmed vulnerabilities
- approved mitigations
- accepted risks
- recurring attack patterns
- authentication decisions
- authorization decisions
- secure-by-design decisions
- compliance-related decisions
- remediation lessons learned
- validated false-positive patterns

Do not persist:

- speculative findings
- temporary reasoning
- incomplete investigations
- low-confidence assumptions
- intermediate analysis artifacts

## Security Memory Quality Rules

Before storing security memory, verify that evidence exists, the finding is actionable, the memory will be reusable, the result is validated, and confidence is sufficient.
Prefer fewer high-quality security memories over many low-value memories.

## Security Retrieval Priorities

When multiple memories exist, prioritize:

1. Project-specific security memories
2. Recent security findings
3. High-confidence findings
4. Previously validated findings
5. Repeated attack patterns
6. Organization-wide lessons learned

Avoid retrieving redundant memories.

## Scope

Before applying updates, check the Spec-Kit Flash-Mem context.

### Optimizer-Aware Flow

When `.specify/extensions/memory-md/config.yml` has `optimizer.enabled: true` and the CLI is available:

1. **Prepare Context**: Execute `flash-mem prepare-context --feature specs/<feature> --query "security constraints vulnerabilities authentication authorization data-leakage"`.
2. **Read Synthesis**: Read `specs/<feature>/memory-synthesis.md` (or the search results) first.

### Markdown-Only Flow

When the optimizer is disabled or unavailable, you **MUST** read these files explicitly using your file-reading tools (absolute or relative paths). Do not rely solely on workspace search or semantic indexers, as these files are often in `.gitignore`:

- latest security review findings or follow-up plan
- `tasks.md`
- `plan.md`
- `spec.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`
- `docs/memory/INDEX.md`
- `docs/memory/`
- `specs/<feature>/memory.md`
- `specs/<feature>/memory-synthesis.md`
- `.github/copilot-instructions.md`
- Other project memory or architecture notes

## What to Check

- New security tasks are not already covered by an existing task, accepted risk, or validated false positive
- Security tasks are added in a way that preserves existing task sequencing
- High-severity issues remain prioritized for immediate remediation
- Deferred items stay clearly marked as technical debt when appropriate
- `plan.md` only changes when the security design or sequencing needs to change
- The resulting artifacts remain testable and reviewable
- The update preserves the intent of the Flash-Mem context and the current implementation

## Apply Rules

1. Prefer updating `tasks.md` over `plan.md` unless the plan itself needs a security correction.
2. Keep changes minimal and scoped to the security follow-up items.
3. Preserve existing formatting, headings, and task numbering style.
4. Add only the backlog entries that are necessary for the approved security items.
5. If the user asks for a dry run or preview, do not edit files; instead prepare the proposed changes in the response.
6. If more than one candidate task or plan artifact exists, ask the user which one to update before proceeding.

## Steps

1. Read the latest security review findings or follow-up plan provided in `$ARGUMENTS`.
2. Read `tasks.md`, `plan.md`, and related planning artifacts to understand the current backlog.
3. Compare the findings against the current task backlog and Flash-Mem context.
4. Identify which items should become new tasks, which belong in technical debt, and which are already covered.
5. Update `tasks.md` with any approved security tasks.
6. Update `plan.md` only if the security design or sequencing needs to change.
7. Summarize the files changed and the rationale for each change.
8. **Proactive Durable Memory Preservation**: If applying these follow-ups reveals new security patterns or repeatable lessons (e.g., a specific way to handle CORS in this repo), proactively use `flash-mem capture_artifact_memory`, or the corresponding `spec-kit-memory-hub` capture flow if flash-mem is unavailable.

## Output Format

Produce a structured Markdown update summary with:

- Executive summary
- Files reviewed
- Files changed
- Security items added or updated
- Deferred items left unchanged
- Confirmed secure patterns

## Task Format

When adding security tasks, keep them compatible with the existing Spec-Kit security task style:

- `TASK-SEC-[NNN]`
- severity
- category or OWASP mapping
- location or source finding
- description
- acceptance criteria
- references or related artifacts

If a finding is deferred instead of applied, record it as technical debt in the follow-up output but do not silently discard it.

Begin by reviewing the current backlog and the approved security follow-up items.
