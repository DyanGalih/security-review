# Architecture & Technical Design

This document details the architectural design of **Security Review (`v2.0.0`)**, a standalone CLI and multi-agent security audit toolkit with optional Spec-Kit extension compatibility.

---

## 1. System Overview

Security Review delivers token-budgeted, multi-agent security intelligence by splitting duties between two layers:

1. **The CLI Layer (Execution & Token Optimization)**:
   - High-speed git diff filtering (`security-review diff`).
   - Security entrypoint and attack-surface scanning (`security-review scan`).
   - Deterministic report frontmatter validation (`security-review validate`).
   - Interactive multi-agent skill initialization (`security-review init`).

2. **The Agent Layer (Reasoning & Auditing)**:
   - Prompt-driven security audits with OWASP Top 10 (2025), CWE, and CVSS scoring.
   - Architectural drift detection and trust boundary validation.
   - Structured remediation task generation (`TASK-SEC-NNN`).

---

## 2. Multi-Agent Integration Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Coding Workspace                             │
│                                                                        │
│   security-review init .                                               │
│            │                                                           │
│            ├──▶ .agent/skills/         (Antigravity)                   │
│            ├──▶ .claude/skills/        (Claude Code)                   │
│            ├──▶ .cursor/rules/         (Cursor)                        │
│            ├──▶ .opencode/commands/    (OpenCode)                      │
│            ├──▶ .codex/skills/         (Codex CLI)                     │
│            ├──▶ .gemini/commands/      (Gemini Code Assist)            │
│            ├──▶ .goose/recipes/        (Goose CLI)                     │
│            └──▶ .windsurf/rules/       (Windsurf)                      │
│                                                                        │
│   Slash Command Execution:                                             │
│   /sr-audit, /sr-staged, /sr-branch, /sr-plan, /sr-tasks, /sr-apply     │
│            │                                                           │
│            ▼                                                           │
│   Token-Budgeted Context Extraction (via security-review diff/scan)    │
│            │                                                           │
│            ▼                                                           │
│   Structured Security Assessment Report (YAML frontmatter + Markdown)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Command Catalog & Prefix Mapping

All commands are provisioned with standardized short prefixes (`sr-*`) and support canonical alias mappings:

| Command | Short Prefix | Standalone Alias | Purpose |
|---|---|---|---|
| `security-audit` | `sr-audit` | `security-review`, `audit` | Full repository security audit |
| `security-review-staged` | `sr-staged` | `staged` | Pre-commit staged diff review |
| `security-review-branch` | `sr-branch` | `branch` | Feature branch / PR diff review |
| `security-review-plan` | `sr-plan` | `plan` | Technical plan & architecture review |
| `security-review-tasks` | `sr-tasks` | `tasks` | Implementation tasks review |
| `security-review-followup`| `sr-followup` | `followup` | Findings to backlog conversion |
| `security-review-apply` | `sr-apply` | `apply` | Apply approved tasks to `tasks.md` |
| `security-review-export`| `sr-export` | `export` | Formal pentest report synthesis |
| `init` | `sr-init` | `init` | Security constitution initialization |

---

## 4. Spec-Kit Compatibility Layer

To maintain 100% backward compatibility for projects built on Spec-Kit:
- `src/extension.yml` defines the extension manifest.
- Upstream command names like `speckit.security-review.audit` map directly to `commands/security-audit.md`.
- Lifecycle hooks (`after_plan`, `after_tasks`, `after_implement`) are declared and functional.
- For complete details, see [Spec-Kit Extension Guide](speckit-extension.md).

---

## 5. Document Header & Schema Strategy

Every generated security review output starts with a strict YAML frontmatter block:

```yaml
---
document_type: security-review
review_type: <audit|staged|branch|plan|tasks|export>
assessment_date: "2026-08-19"
codebase_analyzed: "src/"
total_files_analyzed: 14
total_findings: 3
overall_risk: HIGH
critical_count: 0
high_count: 2
medium_count: 1
low_count: 0
informational_count: 0
owasp_categories: [A01, A05]
cwe_ids: [CWE-89, CWE-285]
security_task: TASK-SEC-001
---
```

### Frontmatter Schema Dual-Readiness
- **Fast LLM Evaluation**: Agents can evaluate risk and categories by reading the frontmatter header without loading the entire document body.
- **SQL / Flash-Mem Indexing**: Frontmatter columns directly mirror SQLite caching tables for fast indexed retrieval.
- **Backward Compatibility**: `security_task` is canonical; `spec_kit_task` is supported as a transparent alias.
