# Usage Guide

Security Review provides prompt-driven security workflows across multi-agent AI coding assistants (Antigravity, Claude Code, Cursor, OpenCode, Codex, Gemini, Goose, Windsurf).

---

## 1. Primary Slash Commands

Execute the canonical slash commands directly in your AI coding session:

| Slash Command | Skill / ID | Description |
|---|---|---|
| `/sr-audit` (or `/security-audit`) | `sr-audit` | Full repository security audit against OWASP Top 10, CWEs, and trust boundaries |
| `/sr-staged` | `sr-staged` | Fast pre-commit audit of staged git changes (`git add`) |
| `/sr-branch` | `sr-branch` | PR and feature branch diff audit against base branch (`main`) |
| `/sr-plan` | `sr-plan` | Architecture & technical plan review before coding starts |
| `/sr-tasks` | `sr-tasks` | Implementation tasks review for security checkpoints & ordering |
| `/sr-followup` | `sr-followup` | Convert security findings into backlog tasks & technical debt |
| `/sr-apply` | `sr-apply` | Apply approved security tasks into `tasks.md` and `plan.md` |
| `/sr-export` | `sr-export` | Synthesize executive & technical pentest assessment report |
| `/sr-verify` | `sr-verify` | Re-verify findings, test exploitability, and generate PoCs |
| `/sr-init` | `sr-init` | Initialize or update `security_constitution.md` |

> [!NOTE]
> For Spec-Kit extension users, all commands are additionally available via `/speckit.security-review.*` (e.g., `/speckit.security-review.audit`). See [Spec-Kit Extension Guide](speckit-extension.md).

---

## 2. Basic Workflows

### Full-Repository Audit
```text
/sr-audit
```
Triggers a comprehensive security audit of the repository, evaluating authentication, authorization, input validation, encryption, secret exposure, and infrastructure security.

### Natural-Language Scoping
Pass natural language arguments to focus the audit:
```text
/sr-audit focus on authentication and session management
/sr-audit review only the src/api and src/auth directories
/sr-audit prioritize OWASP A01:Broken Access Control and A05:Injection
```

### Pre-Commit Staged Review
```text
/sr-staged
```
Reviews only staged files in git. This is the fastest way to catch vulnerabilities before committing.

### Branch / PR Review
```text
/sr-branch feature/oauth-login main
```
Compares `feature/oauth-login` against `main` and reviews the changed code paths for security regressions.

---

## 3. Plan & Task Governance

Integrate security into the architecture planning lifecycle:

1. **Plan Review**: After creating a technical plan or design document:
   ```text
   /sr-plan
   ```
2. **Tasks Review**: After generating implementation tasks:
   ```text
   /sr-tasks
   ```
3. **Follow-Up & Remediation**: After reviewing code or receiving findings:
   ```text
   /sr-followup
   /sr-apply
   ```

---

## 4. Finding Verification & Proof of Concept (PoC)

Re-verify candidate findings, filter false positives, and generate non-destructive reproduction PoCs:
```text
/sr-verify docs/security-report.md
/sr-verify TASK-SEC-001
/sr-verify verify SQL injection in user search endpoint
```
Produces:
- **Exploitability Classification**: `CONFIRMED`, `FALSE_POSITIVE`, `MITIGATED`, or `ACCEPTED_RISK`.
- **Proof of Concept (PoC)**: Automated unit/integration test cases and safe curl payloads.
- **Suppression Config**: Automatic YAML snippet for `security-review.yml` for verified false positives.

---

## 5. Formal Pentest Report Export

Synthesize findings into an executive and technical whitebox security assessment:
```text
/sr-export
```
Generates a formal Markdown report including:
- **Executive Summary**: High-level risk score and strategic impact.
- **Technical Findings**: Detailed descriptions, exploit scenarios, CVSS v3.1 scores, and code remediation snippets.
- **Architectural Drift**: Systemic boundary failures and long-term hardening roadmap.

---

## 6. Token-Budgeted CLI Acceleration

Use the CLI companion for instant diff extraction and entrypoint discovery:

```bash
# Token-budgeted staged diff extraction (default 8k tokens)
security-review diff --staged

# JSON formatted diff for subagents
security-review diff --branch feature/payment --json --budget 4000

# Discover security entrypoints
security-review scan
```

---

## 7. Hybrid Mode (Agent Reasoning + CLI Generation)

Save tokens by having the agent output machine-readable JSON findings and using the CLI to generate reports and tasks:

```bash
# 1. Agent emits findings to findings.json
# 2. Compile full Markdown report deterministically:
security-review report --input findings.json --output docs/security-report.md

# 3. Create or append TASK-SEC-NNN items to tasks.md:
security-review tasks --input findings.json --target tasks.md --append
```

---

## 8. SDD Bridge (OpenSpec & Spec-Kit Integration)

Turn findings directly into SDD change proposals or inject tasks into active changes:

```bash
# Check detected SDD framework and active changes
security-review sdd status

# Generate full OpenSpec / Spec-Kit proposal from findings.json
security-review sdd propose --input findings.json --name fix-auth-vulnerabilities

# Append findings directly to active OpenSpec/Spec-Kit tasks.md (auto-detected target)
security-review tasks --input findings.json --append
```


