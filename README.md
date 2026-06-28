# 🔒 Security Review

> Continuous security governance and OWASP auditing for AI-assisted development.

[![Version](https://img.shields.io/badge/version-1.6.1-22c55e)](extension.yml)
[![Spec Kit](https://img.shields.io/badge/Spec%20Kit-compatible-2563eb)](https://spec-kit.dev)
[![OWASP](https://img.shields.io/badge/OWASP-2025-ef4444)](https://owasp.org/Top10/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b)](LICENSE)

## What Is This?

A Spec Kit extension that performs **security reviews at every stage of delivery** — from plan to implementation — and turns findings into structured, trackable remediation tasks.

It answers one question:

> Is this work secure, and if not, what exactly needs to be fixed?

## The Problem It Solves

AI generates code that works, but it doesn't think about security:

- It concatenates user input into SQL queries because that's the fastest path
- It skips authorization checks on admin endpoints because "it's internal"
- It hardcodes API keys in config files because the test passes
- It adds dependencies without checking for known CVEs

You discover these issues in code review — or worse, in production. By then, fixing them is expensive and disruptive.

**Security Review catches these issues early** by reviewing your specs, plans, task lists, staged changes, branch diffs, and full codebase against **OWASP Top 10 (2025)**, **OWASP ASVS v4.0.3**, **SANS/CWE Top 25**, **MITRE ATT&CK**, language-specific secure coding practices, and your project's own security context.

## What It Actually Does

## Extension Interoperability

This extension acts as a cooperative citizen in the Spec Kit ecosystem by sharing context through explicit handoff artifacts in the `specs/<feature>/` directory.

**The Governed Delivery Lifecycle:**
1. **`/specify`** -> Write initial feature spec.
2. **`/speckit.architecture-guard.governed-plan`** -> Orchestrates memory synthesis, technical planning, and security/architecture validation.
3. **`/speckit.architecture-guard.governed-tasks`** -> Orchestrates task generation with memory, security, and architecture refactor awareness.
4. **`/speckit.architecture-guard.governed-implement`** -> Orchestrates implementation with memory context and post-implementation governance review.

By using explicit markdown files, extensions remain decoupled, and all constraints and decisions are fully reviewable in Git.

---

# Installation

### From Registry

```text
specify extension add security-review
```

### From GitHub

```text
specify extension add security-review --from \
   https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.6.1.zip
```

### Local Development

```text
specify extension add --dev /path/to/spec-kit-security-review
```

---

# Recommended Security Lifecycle

Security Review is a **governance and audit layer** that runs at every phase of Spec Kit delivery to catch vulnerabilities before they reach production.

| Milestone | Recommended Command | Phase Integration | Purpose |
| --- | --- | --- | --- |
| **Milestone: Design** | `security-review.plan` | After `/plan` | Review technical design for trust boundaries and insecure patterns. |
| **Milestone: Strategy** | `security-review.tasks` | After `/tasks` | Ensure security requirements are sequenced correctly in the task list. |
| **Milestone: Verification** | `security-review.branch` | After `/implement` | Focused security review of the current changes or branch. |
| **Milestone: Remediation** | `security-review.apply` | After findings | Inject approved security fixes into your Plan and Task artifacts. |

---

## How to Handle Findings

Security Review generates structured reports with actionable findings. To resolve them:

### 1. Evaluate the Finding
Review the **Exploit Scenario** and **Remediation** provided in the report. Decide if the finding is a valid risk that needs fixing or an accepted project design.

### 2. Plan the Follow-up
Run `/speckit.security-review.followup`.
The AI will guide you through each finding. You can choose to **Fix Now** (add to current tasks) or **Track as Tech Debt** (save for later).

### 3. Apply the Fixes
Run `/speckit.security-review.apply`.
This will **automatically inject** the remediation tasks into your `plan.md` and `tasks.md`, making security part of your standard delivery flow.

---

## Continuous Security (Out-of-Band)

These commands are ideal for pre-commit hooks or automated PR checks to ensure incremental changes remain secure.

| Context | Recommended Command | Purpose |
| --- | --- | --- |
| **Pre-Commit** | `security-review.staged` | Review only files staged with `git add`. |
| **Pre-Merge** | `security-review.branch` | Review changes introduced by your branch (auto-detects current). |

---

### Key Behavior: Structured, Actionable Output

Every finding includes severity, location, OWASP category, exploit scenario, remediation, and a Spec Kit task ID:

```text
### [CRITICAL] SQL Injection in User Authentication

**Location:** src/auth/login.js:45
**OWASP Category:** A05:2025-Injection
**Description:** User input concatenated directly into SQL query...
**Exploit Scenario:** Attacker could bypass authentication by...
**Remediation:** Use parameterized queries or ORM...
**Spec-Kit Task:** TASK-SEC-001
```

## Benefits

### Compared to Spec Kit Alone

| Spec Kit Only | Spec Kit + Security Review |
| --- | --- |
| Security issues found during code review or production | Caught during planning, before code is written |
| No structured way to track security debt | Every finding becomes a `TASK-SEC-NNN` with severity and acceptance criteria |
| AI generates insecure patterns without feedback | AI output is reviewed against OWASP 2025 and secure coding practices |
| Security is a vague checkbox | Security coverage is enumerated: OWASP, supply chain, secrets, DevSecOps |

### Compared to Traditional Security Tools

| Traditional Tools | Security Review |
| --- | --- |
| Require language-specific scanners per framework | Framework-agnostic, works across any stack |
| Run against code only | Reviews plans, tasks, staged diffs, branch diffs, AND code |
| Produce generic reports | Produces Spec Kit task IDs ready for your backlog |
| Separate workflow from development | Integrated into the Spec Kit delivery lifecycle |
| Expensive to set up and maintain | Zero runtime dependencies, prompt-based |

## Security Coverage

### OWASP Top 10 (2025)

| Code | Category |
| --- | --- |
| A01 | Broken Access Control (includes SSRF) |
| A02 | Security Misconfiguration |
| A03 | Software Supply Chain Failures |
| A04 | Cryptographic Failures |
| A05 | Injection |
| A06 | Insecure Design |
| A07 | Authentication Failures |
| A08 | Software or Data Integrity Failures |
| A09 | Security Logging & Alerting Failures |
| A10 | Mishandling of Exceptional Conditions |

### Additional Coverage

- Input validation and output encoding
- Secrets management and cryptographic handling
- Session and API security
- Trust boundaries and attack surface review
- Dependency, build, and CI/CD risk analysis
- STRIDE threat modeling (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege)

## When To Use It

**Use it when:**

- Your project handles **user input, authentication, or sensitive data**
- You're using **AI-assisted development** and want security checks on AI output
- Your team needs **structured security tracking** (not just "we should fix this")
- You want **pre-commit or pre-merge security gates** without blocking tooling
- You need **OWASP coverage** documented for compliance or audit purposes

**Best fit:**

- Web applications and APIs
- Projects with authentication, payments, or user data
- Teams that need security review integrated into their delivery flow
- Codebases with third-party dependencies to monitor

## When NOT To Use It

**Don't use it for:**

- **Static sites with no backend** — there's minimal attack surface
- **Internal scripts with no user input** — no trust boundaries to review
- **Replacing a penetration test** — this is prompt-based review, not runtime testing
- **Replacing dependency scanners** — it checks for known patterns, not CVE databases in real-time
- **Projects with no security requirements** — if security doesn't matter, skip it

**The honest test:** If your project never handles user input, authentication, or sensitive data, you probably don't need this.

---

# Quick Start

1. See [Installation](#installation) section for all methods.

2. Run a security review:
   ```text
   /speckit.security-review.branch
   ```

3. Turn findings into tasks:
   ```text
   /speckit.security-review.followup
   ```

4. Apply approved tasks to your plan:
   ```text
   /speckit.security-review.apply
   ```

For normal feature development, prefer `branch` review after implementation. Use `audit` for broader pre-release or milestone reviews.

---

## Choosing the Right Security Review Scope

Security Review supports different review scopes depending on the development stage.

Not every workflow requires a full-codebase security audit.

During normal Spec Kit implementation workflows, prefer:

```text
/speckit.security-review.branch
```

Use:

```text
/speckit.security-review.audit
```

for:

* release reviews
* milestone reviews
* major architecture changes
* systemic security analysis
* broader trust-boundary validation

## Avoid Overusing Full Audits

Running full security audits during every implementation cycle may create:

- noisy findings
- duplicated review output
- slower development workflows
- governance fatigue

Prefer scoped review during active feature development.

Use full audits intentionally.

## Recommended Spec Kit Workflow Usage

### During Feature Development

Recommended flow:

```text
/specify
↓
security review on specification
↓
/plan
↓
security review on plan
↓
/tasks
↓
/implement
↓
/speckit.security-review.branch
```

This keeps security review focused on the current feature implementation.

### During Pre-Release or Major Review Cycles

Recommended flow:

```text
release candidate
↓
/speckit.security-review.audit
```

Use `audit` for:

* release reviews
* milestone reviews
* major architecture changes
* systemic security analysis
* broader trust-boundary validation

## Governance Artifacts

Security Review respects the following project governance artifacts when they exist:

| Artifact | Purpose |
| --- | --- |
| `security_constitution.md` | **The Source of Truth.** Repository-wide security rules, standards, and requirements that every feature must follow. |
| `specs/<feature>/security-constraints.md` | Feature-specific security rules generated during planning or specification. |
| `docs/memory/` | Durable repository memory containing historical security decisions. |

## Optimizer-Aware Memory Retrieval

This extension integrates with [flash-mem](https://github.com/DyanGalih/flash-mem) as the primary memory workflow for Spec Kit integration. When enabled, the extension uses `flash-mem` to prepare context and perform targeted searches across your project's durable memory rather than reading full directories.

If `flash-mem` is unavailable, the extension falls back to [spec-kit-memory-hub](https://github.com/DyanGalih/spec-kit-memory-hub) for the compatibility MCP surface.

To enable this:
1. Ensure `flash-mem` is installed.
2. Set `optimizer.enabled: true` in your `.specify/extensions/memory-md/config.yml`.
3. If `flash-mem` is unavailable, install `spec-kit-memory-hub` so the compatibility MCP surface can provide the same project-memory context.
4. The security review agent will automatically switch to the **Optimizer-Aware Flow** (Prepare Context -> Search -> Synthesize -> Read).

---

# Commands

## Quick Reference

| Command | Phase | When To Use | Output |
| --- | --- | --- | --- |
| `audit` | Governance | Release reviews, milestone reviews, broader system security analysis | Full-codebase vulnerabilities with OWASP categories |
| `branch` | Implementation Validation | After implementation, normal feature development (pre-merge) | Changes-only security review, focused findings |
| `staged` | Pre-Commit | Pre-commit hooks, local validation before git add | Only staged files security review |
| `plan` | Planning | After `/speckit.plan` | Security gaps in technical design |
| `tasks` | Task Generation | After `/speckit.tasks` | Task sequencing, missing security requirements |
| `followup` | Remediation Planning | After findings are reviewed | Convert findings to tasks or technical debt |
| `apply` | Integration | After followup decisions | Inject security tasks into plan.md and tasks.md |
| `export` | Reporting | For whitebox testing/compliance | Formal Executive and Technical Pentest Report |

---

## Command Details

### Full Audit

```text
/speckit.security-review.audit
/speckit.security-review.audit focus on authentication, secrets handling, and payment flows
/speckit.security-review.audit review only the api and worker directories
```

Performs broader or full-system security review across the codebase. Recommended for milestone reviews, release reviews, or major architecture validation.

### Staged Changes (Pre-Commit)

```text
/speckit.security-review.staged
/speckit.security-review.staged focus on secrets and injection
```

Reviews only files staged with `git add`. If nothing is staged, it tells you.

### Branch / PR Diff (Pre-Merge)

```text
/speckit.security-review.branch
/speckit.security-review.branch feature/payment-gateway
/speckit.security-review.branch feature/payment-gateway develop
```

Reviews security risks introduced by the current branch or implementation changes. Recommended for normal feature development workflows.

By default, it detects your **current active branch** and compares it against its **original source** (main, develop, etc.). You can also specify branches explicitly if needed.

### Example: Feature Development

```text
/speckit.implement
↓
/speckit.security-review.branch
```

Reviews only the current implementation changes.

### Example: Pre-Release Review

```text
release candidate
↓
/speckit.security-review.audit
```

Performs broader review across the codebase.

### Plan Review

```text
/speckit.security-review.plan
```

Reviews the implementation plan for missing security requirements and unsafe assumptions. Run after `/speckit.plan`.

### Task Review

```text
/speckit.security-review.tasks
```

Checks that security tasks exist and are properly sequenced. Run after `/speckit.tasks`.

### Follow-Up Planning

```text
/speckit.security-review.followup
```

Converts findings into remediation tasks (`Implement now`), technical debt (`Track as technical debt`), or marks them as already covered.

### Apply Follow-Ups

```text
/speckit.security-review.apply
```

Writes approved security tasks into `tasks.md` and `plan.md`. Supports dry-run preview.

### Formal Report Export

Synthesizes multiple review artifacts into a single, professional **Whitebox Security Assessment Report**.

```text
/speckit.security-review.export
```

Use this when you need to provide a formal report to stakeholders or clients. It produces:
- **Executive Summary**: High-level risk and business impact.
- **Technical Findings**: Detailed exploit walk-throughs and code-level remediation.
- **Strategic Roadmap**: Long-term security hardening advice based on project memory.

---

# Workflow Integration

```text
/speckit.plan                      → Planning Phase
/speckit.security-review.plan      → Review plan for security gaps
/speckit.tasks                     → Task Generation
/speckit.security-review.tasks     → Review task sequencing
/speckit.implement                 → Implementation Phase
/speckit.security-review.branch    → Focused security review
/speckit.security-review.followup  → Convert findings to tasks
/speckit.security-review.apply     → Apply approved tasks
/speckit.security-review.export    → Export formal report
```

## With Companion Extensions

| Extension | Relationship |
| --- | --- |
| **Memory Hub** | Security Review reads `docs/memory/`, `specs/<feature>/memory-synthesis.md`, and `.github/copilot-instructions.md` as design context. Optional but recommended. |
| **Architecture Guard** | Routes architecture-only findings to Architecture Guard. Security Review keeps security findings. No duplication. |

## Using Security Review with Architecture Guard

When used with Architecture Guard orchestration workflows:

- `governed-plan` should use plan-level security review
- `governed-tasks` should use task-level security review
- `governed-implement` should generally prefer:

```text
/speckit.security-review.branch
```

for implementation validation

Architecture Guard orchestration should only use:

```text
/speckit.security-review.audit
```

for broader governance or release-level workflows.

---

# Configuration

### When You Need to Configure

Configuration is **optional**. You only need it if:
- Your project has custom security requirements
- You want to exclude certain patterns or directories
- You need to customize severity thresholds
- You want to focus on specific OWASP categories

### How to Configure

Copy `config-template.yml` into your project as a team brief:

```bash
cp config-template.yml speckit-security.yml
```

> **Note:** The extension is prompt-driven and does not read this file automatically. Use it as a human-readable team brief, and include relevant settings in your slash-command input when you want the agent to follow them.

The template covers: exclusion patterns, focus areas, severity thresholds, output settings, OWASP categories, dependency scanning, secrets detection, architecture settings, DevSecOps checks, memory hub paths, reporting, and false positive tracking.

---

# Project Structure

```text
security-review-extension/
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── config-template.yml                ← Team brief template (not auto-read)
├── extension.yml                      ← Extension manifest
├── commands/                          ← Spec Kit command definitions (self-contained)
│   ├── security-review.md                   ← Full audit (655 lines)
│   ├── security-review-staged.md            ← Staged changes
│   ├── security-review-branch.md            ← Branch/PR diff
│   ├── security-review-plan.md              ← Plan review
│   ├── security-review-tasks.md             ← Task review
│   ├── security-review-followup.md          ← Finding follow-up
│   ├── security-review-apply.md             ← Apply approved items
│   └── init.md                              ← Bootstrap security rules
├── docs/
│   ├── design.md
│   ├── installation.md
│   └── usage.md
├── examples/
│   └── example-output.md
├── assets/
│   ├── logo.png
│   └── logo.svg
└── scripts/
    └── test-install.sh                ← Smoke tests (35 tests)
```

---

# Output Format

Generated reports include a **YAML frontmatter header** before the report body. This header contains structured metadata (risk level, finding counts, OWASP categories, and field definitions) that enables header-first processing:

- An LLM reads the header and decides whether the document is relevant before loading the body
- The header fields map directly to `docs/memory/INDEX.md` routing rows for token-efficient retrieval
- The same fields become SQL columns when flash-mem SQLite Phase 1 or the compatibility memory-hub optimizer is enabled — no rework needed

See [docs/field-registry.md](docs/field-registry.md) for the full field schema and [docs/usage.md](docs/usage.md) for INDEX.md integration instructions.

## Example Report

```markdown
# SECURITY REVIEW REPORT

## Executive Summary

**Overall Security Posture:** MODERATE RISK
**Total Findings:** 23
- Critical: 2
- High: 5
- Medium: 8
- Low: 6
- Informational: 2

## Vulnerability Findings

### [CRITICAL] SQL Injection in User Authentication

**Location:** src/auth/login.js:45
**OWASP Category:** A05:2025-Injection
**ASVS Requirement:** V2.1.1
**MITRE Technique:** T1190
**Reference Link:** https://owasp.org/Top10/A03_2021-Injection/
**Description:** User input is concatenated directly into SQL query...
**Exploit Scenario:** Attacker could bypass authentication by...
**Remediation:** Use parameterized queries or ORM...
**Spec-Kit Task:** TASK-SEC-001
```

Full example: [examples/example-output.md](examples/example-output.md).

---

# Release Checklist

1. Update `extension.version` in `extension.yml`
2. Update README badge and install URL
3. Update `docs/installation.md` and `docs/usage.md` URLs
4. Add new section in `CHANGELOG.md`
5. Verify no stale version strings:
   ```bash
   grep -RIn "version: 'OLD_VERSION'\|vOLD_VERSION.zip\|version-OLD_VERSION" .
   ```
6. Run `./scripts/test-install.sh`
7. Commit, tag, and push:
   ```bash
   git commit -m "release: vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```

---

# Non-Goals

This extension does not:

- Replace penetration testing or runtime security scanners
- Act as a real-time CVE database
- Enforce rules at build time
- Auto-fix vulnerabilities
- Require runtime tools or framework-specific APIs
- Duplicate Architecture Guard findings (architecture-only issues are routed there)

---

# Support

- Documentation: [docs/](docs/)
- Examples: [examples/](examples/)
- Issues: [GitHub Issues](https://github.com/DyanGalih/spec-kit-security-review/issues)
- Discussions: [GitHub Discussions](https://github.com/DyanGalih/spec-kit-security-review/discussions)

---

# License

This extension is released under the [MIT License](LICENSE).
