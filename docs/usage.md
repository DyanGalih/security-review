# Usage Guide

This extension is used as a Spec-Kit slash command set. Install it with the `specify` CLI, then choose the command that matches the scope you want:

- `/speckit.security-review.audit` for the full project
- `/speckit.security-review.staged` for staged changes only
- `/speckit.security-review.branch` for a branch, pull request, or merge request diff
- `/speckit.security-review.plan` for the implementation plan and design artifacts
- `/speckit.security-review.tasks` for the generated task list and sequencing
- `/speckit.security-review.followup` for remediation planning or technical-debt capture
- `/speckit.security-review.apply` for applying approved follow-up items to the backlog

## Basic Usage

From your Spec-Kit project, open your agent and run:

```text
/speckit.security-review.audit
```

That triggers a full review of the current project context and produces a security report with findings, remediation guidance, and follow-up tasks.

Use this when you want the whole repository reviewed rather than only a staged diff or branch diff.
It is the best fit for secure-by-design re-reviews when you want the implementation checked against flash-mem, design notes, and Copilot instructions.
If the project also uses [spec-kit-memory-hub](https://github.com/DyanGalih/spec-kit-memory-hub), the command can use those repo-native memory artifacts as extra context.
Use it after `/speckit.plan` and `/speckit.tasks` when you want a code-level re-review of the implemented design.

## Scoping the Review

The command accepts free-form user input through `$ARGUMENTS`. Use plain language to steer the review rather than CLI flags.

Examples:

```text
/speckit.security-review.audit focus on authentication and authorization flows
/speckit.security-review.audit review only the api, worker, and infra directories
/speckit.security-review.audit prioritize OWASP Top 10, secrets exposure, and dependency risk
/speckit.security-review.audit use the settings from speckit-security.yml as the team review brief
```

## What the Report Contains

The generated report is structured for engineering follow-up. Typical sections include:

1. Executive summary and overall risk posture
2. Finding-by-finding vulnerability details
3. Architecture and trust-boundary risks
4. Missing security controls
5. Dependency and supply-chain concerns
6. Secrets exposure findings
7. DevSecOps configuration issues
8. Spec-Kit-ready remediation tasks
9. STRIDE-oriented threat summary

See [../examples/example-output.md](../examples/example-output.md) for a representative report.

## Working with Findings

The report is intended to feed back into your normal Spec-Kit workflow.

- Use `/speckit.plan` to organize remediation work.
- Use `/speckit.implement` to apply fixes.
- Use `/speckit.security-review.followup` to convert findings into tasks or technical debt.
- Re-run `/speckit.security-review.audit` after changes to confirm the risk was reduced.

## Workflow Integration

```text
┌─────────────────────────────────────────────────────────────┐
│  1. /speckit.requirements         → Define requirements      │
│  2. /speckit.plan                 → Plan implementation       │
│  3. /speckit.security-review.plan → Plan review               │
│  4. /speckit.tasks                → Generate tasks            │
│  5. /speckit.security-review.tasks → Task review               │
│  6. /speckit.analyze              → Cross-artifact analysis    │
│  7. /speckit.implement            → Implement changes          │
│  8. /speckit.security-review.audit → Security review          │
│  9. /speckit.security-review.followup → Follow-up planning    │
│ 10. /speckit.security-review.apply    → Follow-up apply       │
└─────────────────────────────────────────────────────────────┘
```

The official Spec-Kit lifecycle ends at `/speckit.implement`; this extension adds security review and follow-up steps around that flow rather than introducing `test` or `deploy` commands.

## Recommended Review Patterns

### Baseline Review

```text
/speckit.security-review.audit establish a baseline for the whole repository
```

### Area-Specific Review

```text
/speckit.security-review.audit inspect the authentication, session, and admin flows
```

### Release Readiness Review

```text
/speckit.security-review.audit check release readiness with emphasis on exposed secrets, dependency risk, and missing controls
```

## Targeted Reviews

Use these commands when you want to review only changes, not the entire codebase.

### Staged Changes Review

Review only the files you have staged with `git add`, before you commit.

```text
/speckit.security-review.staged
```

With additional focus:

```text
/speckit.security-review.staged focus on secrets and injection risks
```

If nothing is staged, the command will tell you and stop. This is the fastest way to catch issues before a commit.

Use this when you want the review to stay limited to the staged diff.

### Branch / PR Review

Review only the changes introduced on a branch compared to a base branch.

```text
/speckit.security-review.branch feature/payment-gateway
```

Specify a custom base branch (defaults to `main` if omitted):

```text
/speckit.security-review.branch feature/payment-gateway develop
```

With additional focus:

```text
/speckit.security-review.branch feature/auth main focus on authentication and session handling
```

This is ideal for pre-merge security checks in code review or CI workflows.

Use this when you want the review to focus on differences between two branches instead of the full project.
It also fits a branch, pull request, or merge request diff.

### Plan Review

Review the implementation plan and related design artifacts before implementation begins.

```text
/speckit.security-review.plan
```

Use this right after `/speckit.plan` to verify secure-by-design coverage before implementation starts.
After `/speckit.tasks` has generated the task list, run `/speckit.security-review.tasks` to verify security coverage, task ordering, and implementation checkpoints.
After a review, run `/speckit.security-review.followup` to turn the findings into remediation tasks or technical-debt items.

### Task Review

Review the generated task list and sequencing before implementation begins.

```text
/speckit.security-review.tasks
```

Use this right after `/speckit.tasks` to verify security coverage, task ordering, and implementation checkpoints.
This command is for sequencing and coverage only; it does not rewrite the backlog.

### Follow-Up Planning

Turn findings into concrete remediation tasks or technical debt.

```text
/speckit.security-review.followup
```

Use this after a review command when you want the findings converted into follow-up tasks or deferred technical-debt items.
It can also check whether an incomplete security finding is already represented in the existing backlog.
The output is backlog-ready, with source finding references so unfinished work can be tracked across implementation cycles.

### Apply Follow-Ups

Apply approved security follow-up items to the local Spec-Kit planning artifacts.

```text
/speckit.security-review.apply
```

Use this when you want the backlog updated in-place after a follow-up review, but still want to keep the Spec-Kit workflow centered on `plan.md`, `tasks.md`, and review artifacts rather than introducing a custom implementation path.

### Formal Report Export

Synthesizes findings into a professional **Whitebox Security Assessment Report** (Pentest Style).

```text
/speckit.security-review.export
```

Use this when you need to provide a formal report to stakeholders, clients, or compliance auditors. It produces:
- **Executive Summary**: High-level risk assessment and business impact for stakeholders.
- **Detailed Technical Findings**: Full exploit scenarios, CVSS scoring, and code-level remediation.
- **Methodology**: Transparency on the whitebox approach and tools used.
- **Strategic Roadmap**: Long-term hardening advice based on project memory and architecture.

## Memory Optimization with SQLite

Security Review supports an **Optimizer-Aware Flow** for projects using `flash-mem` as the primary memory layer. This significantly reduces token usage and improves review accuracy by targeting only relevant security context.

### Enabling the Optimizer

If you have `flash-mem` installed, you can enable the optimized flow by setting:

```yaml
# .specify/extensions/memory-md/config.yml
optimizer:
  enabled: true
```

### How it Works

When the optimizer is enabled, the security commands follow this automated retrieval sequence:

1. **`prepare-context`**: Builds the current feature context for the review.
2. **`search_memory`**: Performs a keyword search for security domains (vulnerabilities, authentication, etc.).
3. **`get_relevant_context`**: Pulls the most useful durable-memory snippets for the review.
4. **Targeted Read**: The agent reads only the synthesis and relevant search results.

This replaces the "Markdown-Only Flow" which requires reading the entire `docs/memory/` directory.

If `flash-mem` is unavailable, the extension falls back to the `spec-kit-memory-hub` compatibility surface and keeps the same review workflow.

## Troubleshooting

### Command Not Found

Verify the extension is installed and registered:

```bash
specify extension list
ls .claude/commands/speckit.security-review.*
cat .specify/extensions/.registry
```

If needed, reinstall from your Spec-Kit project:

```bash
specify extension add security-review
```

### Review Is Too Noisy

Provide narrower instructions in the slash command input.

```text
/speckit.security-review.audit review only externally reachable APIs
```

### Review Missed Important Context

Point the command at the relevant area explicitly.

```text
/speckit.security-review.audit include the background worker, terraform, and deployment manifests
```

## Related Docs

- [installation.md](installation.md)
- [design.md](design.md)
- [field-registry.md](field-registry.md)
- [../README.md](../README.md)

## Understanding Security Review Documents

Every generated report starts with a YAML frontmatter block before the `# SECURITY REVIEW REPORT` heading. This block contains structured metadata that allows indexers, pipelines, and LLMs to make routing decisions from the header alone — without reading the full document.

### Frontmatter Fields

| Field | Purpose |
|---|---|
| `document_type` | Always `security-review`. Lets indexers skip non-review files. |
| `review_type` | Which command produced this doc (`audit`, `branch`, `staged`, `plan`, `tasks`, `followup`). |
| `assessment_date` | ISO 8601 date. Supports time-based filtering. |
| `overall_risk` | Highest active severity tier. Primary routing signal. |
| `critical_count` … `low_count` | Per-severity finding counts. Enables precise SQL queries. |
| `owasp_categories` | OWASP Top 10 2025 codes with at least one finding. Topic-based filtering. |
| `cwe_ids` | CWE identifiers in the document. |
| `field_summaries` | Static schema dictionary — copied verbatim into every document so any reader understands all field definitions without consulting external docs. |

Full field definitions, types, ranges, and examples are in [field-registry.md](field-registry.md).

### Connecting to flash-mem / memory INDEX.md

After generating a report, each prompt also outputs a proposed **INDEX.md routing row**. Paste this row into your `docs/memory/INDEX.md` Security Reviews table, or use the equivalent memory-hub review buffer when running through the compatibility path:

```markdown
## Security Reviews

| Document | Type | Date | Risk | Findings | OWASP |
|---|---|---|---|---|---|
| docs/security-reviews/2026-05-07-auth.md | audit | 2026-05-07 | HIGH | C:2 H:4 M:6 L:4 | A01,A05,A07 |
| docs/security-reviews/2026-04-15-api.md | branch | 2026-04-15 | MODERATE | C:0 H:1 M:3 L:2 | A02,A09 |
```

With this table in place, the LLM reads only `INDEX.md` during planning and loads only the documents whose risk/type/category matches the current task. This is the primary token reduction mechanism — no SQLite required.

### Batch-updating existing documents

To add frontmatter to older review documents that predate this change:

```bash
./scripts/update-document-headers.sh docs/security-reviews/*.md
# Use --force to overwrite existing frontmatter
./scripts/update-document-headers.sh --force docs/security-reviews/old-report.md
```
