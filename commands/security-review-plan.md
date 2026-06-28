---
description: 'Security review of Spec-Kit plan artifacts and supporting design docs'
---

# Security Review — Plan Review

## User Input

$ARGUMENTS

## Objective

Review the current Spec-Kit plan artifact before implementation begins. Focus on the planning documents, not source code, and identify any design choices that would weaken security, create ambiguity, or make secure implementation harder later.
If `flash-mem` is available, use `flash-mem prepare-context` and the canonical memory tools (`get_project_summary`, `search_memory`, `get_relevant_context`). If `flash-mem` is not installed, fall back to the MCP tools exposed by `spec-kit-memory-hub`; do not shell out to `npx memory-hub` directly.

When project memory exists, use it as design context. Compare the plan against the project flash-mem, architecture decisions, and any repository-native memory artifacts the team uses to preserve intent.

## Flash-Mem Security Context Retrieval

Before performing security analysis:

1. Search Flash-Mem for relevant security context before reading the plan artifacts in depth.
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

Before reviewing the design, check the Spec-Kit Flash-Mem context.

### Optimizer-Aware Flow

When `.specify/extensions/memory-md/config.yml` has `optimizer.enabled: true` and the CLI is available:

1. **Prepare Context**: Execute `flash-mem prepare-context --feature specs/<feature> --query "security constraints vulnerabilities authentication authorization data-leakage"`.
2. **Read Synthesis**: Read `specs/<feature>/memory-synthesis.md` (or the search results) first.

### Markdown-Only Flow

When the optimizer is disabled or unavailable, you **MUST** read these files explicitly using your file-reading tools (absolute or relative paths). Do not rely solely on workspace search or semantic indexers, as these files are often in `.gitignore`:

- `plan.md`
- `spec.md`
- `research.md`
- `data-model.md`
- `docs/memory/INDEX.md`
- `docs/memory/`
- `.specify/memory/security_constitution.md`
- `contracts/`
- `quickstart.md`
- `specs/<feature>/memory.md`
- `specs/<feature>/memory-synthesis.md`
- `specs/<feature>/security-constraints.md`
- `.github/copilot-instructions.md`
- Other project memory or architecture notes

## What to Check

- Security requirements are reflected in the plan
- Trust boundaries and threat assumptions are documented
- Authentication, authorization, and session decisions are safe
- Data flow, privacy, and minimization concerns are addressed
- Dependency and platform choices do not create avoidable risk
   - Validation, logging, and error handling expectations are explicit
   - Secrets handling and deployment hardening are considered
   - Advanced Framework Alignment: Map designs against ASVS requirements, explicitly check for SANS/CWE Top 25 deep architectural flaws, and model specific MITRE ATT&CK techniques.
   - Ecosystem Rules: Ensure the plan acknowledges language-specific pitfalls (e.g. memory safety in C/C++, prototype pollution in JS).
   - The plan can be implemented without introducing ambiguous security decisions later
   - Historical security context is respected, and issues already accepted, mitigated, or marked as false positives are treated as already covered rather than new gaps

## Steps

1. Locate the active Spec-Kit feature directory for the current work.
2. If more than one candidate plan artifact exists, ask the user which one to review before proceeding.
3. Read `plan.md` and any related design artifacts.
4. Compare the plan against the project Flash-Mem context.
5. Report secure-by-design gaps, unsafe assumptions, and any follow-up changes needed before implementation.

## Document Header

Before writing the report body, emit a YAML frontmatter block at the very start of the output document. Populate all values from your analysis. Copy the `field_summaries` section verbatim — it is static schema documentation that enables any LLM or indexer reading only the header to understand the full field schema without parsing the report body.

````yaml
---
document_type: security-review
review_type: plan
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
asvs_requirements: [<V2.1.1>, ...]
mitre_techniques: [<T1190>, ...]
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
  asvs_requirements: "ASVS v4.0 requirements mapped to findings."
  mitre_techniques: "MITRE ATT&CK techniques applicable to findings."
  finding_id: "Unique finding identifier (SEC-NNN) for cross-referencing and task linkage."
  location: "File path and line number of the vulnerable code (path/to/file.ext:line)."
  owasp_category: "OWASP Top 10 2025 category for this finding (AXX:2025-Name)."
  cwe: "Common Weakness Enumeration identifier with short name (CWE-NNN: Name)."
  cvss_score: "CVSS v3.1 base score (0.0-10.0). 9.0+=Critical, 7.0-8.9=High, 4.0-6.9=Medium, 0.1-3.9=Low."
  spec_kit_task: "Spec-Kit task ID for backlog tracking and remediation follow-up (TASK-SEC-NNN)."
---
````

Then follow with the report body.

## Output Format

Produce a structured Markdown security review report with:

- Executive summary
- Plan artifacts reviewed
- Vulnerability findings
- Confirmed secure patterns

## Action Plan & Next Steps

After providing the report, finalize with:

1.  **Durable Memory Preservation (Mandatory Check)**: If systemic vulnerabilities or reusable security patterns were identified (e.g. a new auth boundary decision), you **MUST** use `flash-mem capture_artifact_memory` after providing the report. If `flash-mem` is unavailable, fall back to the corresponding `spec-kit-memory-hub` capture flow and wait for user approval.
2.  **Remediation Planning**: If critical or high findings were found, recommend executing `/speckit.security-review.followup` to create remediation tasks.

---

## flash-mem INDEX.md Row

If you successfully captured the report using `flash-mem capture_artifact_memory` or `spec-kit-memory-hub` tools, you **MUST SKIP** printing this routing row to save output tokens (the data is already stored in the cache). Otherwise, after the report, output the following proposed routing row for the user to paste into their `docs/memory/INDEX.md`. This enables LLM-based filtering without loading the full document.

```text
| <relative path where this doc is saved> | plan | <assessment_date> | <overall_risk> | C:<critical_count> H:<high_count> M:<medium_count> L:<low_count> | <owasp_categories comma-separated> |
```

Example:

```text
| docs/security-reviews/2026-05-07-auth-plan.md | plan | 2026-05-07 | HIGH | C:1 H:2 M:3 L:1 | A01,A06 |
```

See `docs/field-registry.md` in the security-review-extension for the full INDEX.md table format and SQLite Phase 1 column mapping.
