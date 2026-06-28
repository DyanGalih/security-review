---
description: 'Create remediation plans or technical-debt tasks from security review findings'
---

# Security Review — Follow-Up Planning

## User Input

$ARGUMENTS

## Objective

Turn the latest security review findings, unresolved security tasks, or a pasted finding list into an actionable follow-up plan.
If `flash-mem` is available, use `flash-mem prepare-context` and the canonical memory tools (`get_project_summary`, `search_memory`, `get_relevant_context`). If `flash-mem` is not installed, fall back to the MCP tools exposed by `spec-kit-memory-hub`; do not shell out to `npx memory-hub` directly.

Use this command when you want to:

- turn a finding into a concrete Spec-Kit task
- defer a finding as technical debt with a clear rationale
- avoid duplicating work that is already tracked in unfinished tasks
- carry unresolved findings forward into the next implementation cycle
- prepare items that can later be written into `tasks.md` or `plan.md` with `/speckit.security-review.apply`

If the user provides a review report or finding list in `$ARGUMENTS`, treat it as the source of truth for the follow-up plan. If no findings are provided, look for a pasted report, a named report file, or the current backlog context. If none is available, ask the user for the report or findings before proceeding.

When project memory exists, use it as design context. Compare the follow-up choices against the project flash-mem, architecture decisions, and any repository-native memory artifacts the team uses to preserve intent.

## Flash-Mem Security Context Retrieval

Before performing security analysis:

1. Search Flash-Mem for relevant security context before reading the findings or backlog in depth.
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

Before planning follow-ups, check the Spec-Kit Flash-Mem context.

### Optimizer-Aware Flow

When `.specify/extensions/memory-md/config.yml` has `optimizer.enabled: true` and the CLI is available:

1. **Prepare Context**: Execute `flash-mem prepare-context --feature specs/<feature> --query "security constraints vulnerabilities authentication authorization data-leakage"`.
2. **Read Synthesis**: Read `specs/<feature>/memory-synthesis.md` (or the search results) first.

### Markdown-Only Flow

When the optimizer is disabled or unavailable, you **MUST** read these files explicitly using your file-reading tools (absolute or relative paths). Do not rely solely on workspace search or semantic indexers, as these files are often in `.gitignore`:

- recent security review reports or pasted findings
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

- Findings are not already covered by an existing task, accepted risk, or validated false positive
- High-severity issues are marked for immediate remediation
- Lower-severity issues can be deferred only with an explicit technical-debt rationale
- Deferred items include a revisit trigger or milestone
- New tasks are sequenced so secure foundations come first
- Follow-up work remains testable and reviewable
- Security tasks can reference incomplete findings or partially resolved work without losing context
- The follow-up plan preserves the intent of the Flash-Mem context and the current implementation

## Resolution Choices

For each finding, choose one of these outcomes:

1. `Implement now`
2. `Track as technical debt`
3. `Already covered`

When you choose `Track as technical debt`, include:

- why the item is safe to defer
- what risk remains
- what condition should trigger re-review
- the target feature, milestone, or release if known

## Steps

1. Read the latest security review findings or the finding list provided in `$ARGUMENTS`.
2. Read `tasks.md` and any related planning artifacts to identify unfinished security work.
3. Compare the findings against the current task backlog and Flash-Mem context.
4. Group the findings into immediate remediation, technical debt, and already-covered items.
5. Generate Spec-Kit-ready follow-up tasks for the items that should be implemented now.
6. Capture any deferred findings as technical-debt entries with a revisit trigger.
7. **Durable Memory Preservation (Mandatory Check)**: If the follow-up planning identified systemic security lessons or reusable patterns, you **MUST** use `flash-mem capture_artifact_memory` after providing the plan. If `flash-mem` is unavailable, fall back to the corresponding `spec-kit-memory-hub` capture flow and wait for user approval.

## Document Header

Before writing the follow-up plan body, emit a YAML frontmatter block at the very start of the output document. Populate all values from your analysis. Copy the `field_summaries` section verbatim — it is static schema documentation that enables any LLM or indexer reading only the header to understand the full field schema without parsing the document body.

````yaml
---
document_type: security-review
review_type: followup
assessment_date: <YYYY-MM-DD>
codebase_analyzed: <project name or path>
total_files_analyzed: <integer>
total_findings: <integer>
overall_risk: <CRITICAL|HIGH|MODERATE|LOW|INFORMATIONAL>
critical_count: <integer>
high_count: <integer>
medium_count: <integer>
low_count: <integer>
informational_count: <integer>
owasp_categories: [<A01>, <A05>, ...]
cwe_ids: [<CWE-89>, ...]
field_summaries:
  document_type: "Always 'security-review'. Allows indexers to skip non-review documents."
  review_type: "Which command generated this document: audit, branch, staged, plan, tasks, or followup."
  assessment_date: "ISO 8601 date the review was performed (YYYY-MM-DD)."
  overall_risk: "Highest severity tier with active findings (CRITICAL, HIGH, MODERATE, LOW, INFORMATIONAL)."
  critical_count: "Number of Critical findings (CVSS 9.0-10.0)."
  high_count: "Number of High findings (CVSS 7.0-8.9)."
  medium_count: "Number of Medium findings (CVSS 4.0-6.9)."
  low_count: "Number of Low findings (CVSS 0.1-3.9)."
  informational_count: "Number of Informational findings."
  owasp_categories: "OWASP Top 10 2025 categories (A01-A10) that have at least one finding."
  cwe_ids: "CWE identifiers referenced in this document."
  finding_id: "Unique finding identifier (SEC-NNN) for cross-referencing and task linkage."
  location: "File path and line number of the vulnerable code (path/to/file.ext:line)."
  owasp_category: "OWASP Top 10 2025 category for this finding (AXX:2025-Name)."
  cwe: "Common Weakness Enumeration identifier with short name (CWE-NNN: Name)."
  cvss_score: "CVSS v3.1 base score (0.0-10.0). 9.0+=Critical, 7.0-8.9=High, 4.0-6.9=Medium, 0.1-3.9=Low."
  spec_kit_task: "Spec-Kit task ID for backlog tracking and remediation follow-up (TASK-SEC-NNN)."
---
````

Then follow with the follow-up plan body.

## Output Format

Produce a structured Markdown follow-up plan with:

- Executive summary
- Inputs reviewed
- Resolution decisions
- Immediate remediation tasks
- Technical debt backlog
- Already covered items
- Confirmed secure patterns

## Backlog-Ready Task Format

Use this format for every item that should become a task or backlog entry:

| Task ID | Title | Severity | Type | Source Finding | Depends On | Acceptance Criteria |
| ------- | ----- | -------- | ---- | -------------- | ---------- | ------------------- |
| TASK-SEC-001 | Example remediation task | High | Implement | SEC-001 | TASK-SEC-000 | Fix verified by test and review |

For technical debt items, use `Type = Technical Debt` and include a revisit trigger in the description.
For already covered items, include the existing task or PR reference so the backlog stays deduplicated.

If the user provided multiple findings, group them into:

- immediate remediation tasks
- technical debt items
- already covered items

Each new task should stay compatible with the Spec-Kit task style used by the review commands:

- `TASK-SEC-[NNN]`
- severity
- category or OWASP mapping
- location or source finding
- description
- acceptance criteria
- references or related artifacts

---

## flash-mem INDEX.md Row

If you successfully captured the report using `flash-mem capture_artifact_memory` or `spec-kit-memory-hub` tools, you **MUST SKIP** printing this routing row to save output tokens (the data is already stored in the cache). Otherwise, after the follow-up plan, output the following proposed routing row for the user to paste into their `docs/memory/INDEX.md`. This enables LLM-based filtering without loading the full document.

```text
| <relative path where this doc is saved> | followup | <assessment_date> | <overall_risk> | C:<critical_count> H:<high_count> M:<medium_count> L:<low_count> | <owasp_categories comma-separated> |
```

Example:

```text
| docs/security-reviews/2026-05-07-auth-followup.md | followup | 2026-05-07 | HIGH | C:2 H:4 M:6 L:4 | A01,A05,A07 |
```

See `docs/field-registry.md` in the security-review-extension for the full INDEX.md table format and SQLite Phase 1 column mapping.
