<p align="center">
  <img src="landing/new_logo.png" alt="Security Review logo" width="360">
</p>

# 🔒 Security Review

> Continuous whitebox security auditing, OWASP governance, and token-optimized developer CLI & AI Agent toolkit.

[![Version](https://img.shields.io/badge/version-1.7.0-22c55e)](package.json)
[![OWASP](https://img.shields.io/badge/OWASP-2025-ef4444)](https://owasp.org/Top10/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b)](LICENSE)
[![Spec Kit](https://img.shields.io/badge/Spec%20Kit-compatible-2563eb)](docs/speckit-extension.md)

---

## What Is Security Review?

`security-review` is a modern **whitebox security review toolkit** designed for AI-assisted development workflows and automated CI/CD pipelines.

- **Developer CLI Accelerator**: Fast git diff extraction, security entrypoint discovery, and report frontmatter validation.
- **AI Agent Skills**: Pre-engineered prompt contracts for full audits, staged reviews, branch diffs, plan reviews, and remediation tasks.
- **Spec-Kit Compatible**: 100% backward compatible with Spec-Kit SDD workflows via `/speckit.security-review.*` extension hooks.

---

## ⚡ Quickstart

### 1. Instant Execution (Zero Install)

```bash
# Analyze staged changes for security sensitivity before commit
npx security-review diff --staged

# Scan project for security entrypoints & trust boundaries
npx security-review scan

# Validate security report YAML frontmatter
npx security-review validate docs/security-reviews/report.md
```

### 2. Global Installation

```bash
npm install -g security-review
# or
pnpm add -g security-review
```

After installation, use any of the binary aliases: `security-review`, `sec-review`, or `sr`.

---

## 🤖 AI Agent Skill Integration

Use Security Review directly with AI coding assistants (Antigravity, Claude Code, Cursor, OpenCode, Codex):

| Slash Command | Development Phase | Purpose |
|---|---|---|
| `/security-review` | Milestone / Audit | Full repository security audit across all OWASP categories. |
| `/security-review.staged` | Pre-commit | Focused security review of staged changes (`git diff --cached`). |
| `/security-review.branch` | Feature / PR | Review security risks introduced by the current feature branch. |
| `/security-review.plan` | Technical Design | Review implementation plan for trust boundaries and security gaps. |
| `/security-review.tasks` | Strategy & Tasks | Verify that security requirements are sequenced in implementation tasks. |
| `/security-review.followup` | Triage | Convert security findings into actionable remediation tasks. |
| `/security-review.apply` | Remediation | Automatically apply approved security fixes to `tasks.md` and `plan.md`. |
| `/security-review.export` | Formal Report | Export formal Executive and Technical Pentest Report. |
| `/security-review.init` | Onboarding | Initialize or update the project Security Constitution. |

👉 For full details on prompt contracts and agent workflows, see [Agent Skills Guide](docs/agent-skills.md).

---

## 🔌 Spec-Kit Extension (Backward Compatibility)

If you are using [Spec-Kit](https://spec-kit.dev), Security Review can be added as an extension:

```bash
specify extension add security-review
```

All commands are available as `/speckit.security-review.*` and automatically hook into `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement`.

👉 See the complete [Spec-Kit Extension Guide](docs/speckit-extension.md) for lifecycle hook configuration and command mappings.

---

## 📚 Documentation Index

- [Installation Guide](docs/installation.md) — Comprehensive install options
- [CLI Reference](docs/cli-reference.md) — Command-line subcommands & flags
- [Agent Skills Guide](docs/agent-skills.md) — AI Agent workflows & prompt engineering
- [Spec-Kit Extension Guide](docs/speckit-extension.md) — Spec-Kit integration & backward compatibility
- [Field Registry](docs/field-registry.md) — YAML frontmatter schema dictionary
- [Usage & Lifecycle](docs/usage.md) — End-to-end security review workflows

---

## License & Repository

- **Repository**: [https://github.com/DyanGalih/security-review](https://github.com/DyanGalih/security-review)
- **License**: MIT © DyanGalih
