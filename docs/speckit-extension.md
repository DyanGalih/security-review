# Spec-Kit Extension Guide (Backward Compatibility)

> Comprehensive reference for using Security Review as an extension inside [Spec-Kit](https://spec-kit.dev) workflows.

---

## 1. Overview

`security-review` is available as a standalone CLI and agent toolkit and as a separate Spec-Kit extension. The extension manifest declares the supported version range and required core commands.

When registered in Spec-Kit, all commands are prefixed with `speckit.security-review.*` and seamlessly hook into Spec-Kit SDD development phases.

---

## 2. Installation in Spec-Kit

### From a curated registry containing this extension
```bash
specify extension add security-review
```

### From GitHub Release
```bash
specify extension add security-review --from \
  https://github.com/DyanGalih/security-review/archive/refs/tags/v2.1.0.zip
```

### Local Development / Source Checkout
```bash
specify extension add --dev /path/to/security_review/src
```

---

## 3. Spec-Kit Lifecycle Hooks

Security Review integrates directly into Spec-Kit phase transitions:

```text
/speckit.plan        ──► [ Hook: after_plan ]       ──► Prompts /speckit.security-review.plan
/speckit.tasks       ──► [ Hook: after_tasks ]      ──► Prompts /speckit.security-review.tasks
/speckit.implement   ──► [ Hook: after_implement ]  ──► Prompts /speckit.security-review.branch
```

- **`after_plan`**: Prompts the user to review the proposed technical design for missing security requirements before tasks are generated.
- **`after_tasks`**: Prompts the user to verify that trust boundaries and sensitive tasks are properly sequenced.
- **`after_implement`**: Prompts the user to scan the new code changes for vulnerabilities before committing.

---

## 4. Spec-Kit Slash Commands

All Spec-Kit commands are defined in `src/extension.yml`:

| Command | File Mapping | Description |
|---|---|---|
| `/speckit.security-review.audit` | `commands/security-audit.md` | Full repository security audit & OWASP assessment. |
| `/speckit.security-review.staged` | `commands/security-review-staged.md` | Staged changes review (`git diff --cached`). |
| `/speckit.security-review.branch` | `commands/security-review-branch.md` | Branch / PR diff security review. |
| `/speckit.security-review.plan` | `commands/security-review-plan.md` | Security review of plan artifacts. |
| `/speckit.security-review.tasks` | `commands/security-review-tasks.md` | Security review of task artifacts. |
| `/speckit.security-review.followup` | `commands/security-review-followup.md` | Converts review findings into actionable remediation tasks. |
| `/speckit.security-review.apply` | `commands/security-review-apply.md` | Applies approved remediation items into `tasks.md` and `plan.md`. |
| `/speckit.security-review.export` | `commands/security-review-export.md` | Exports formal Executive & Technical Pentest Report. |
| `/speckit.security-review.verify` | `commands/security-verify.md` | Re-verify findings, test exploitability, and generate PoCs. |
| `/speckit.security-review.init` | `commands/init.md` | Initializes project Security Constitution. |

---

## 5. Configuration Reference

You can customize rules by copying the template:

```bash
mkdir -p .security-review
cp config-template.yml .security-review/security-review.yml
```

The commands read `.security-review/security-review.yml` (or a legacy root `security-review.yml`) when present and use the active adapter's security constitution. In an extension-only Spec-Kit project, that constitution is `.specify/memory/security_constitution.md`. Review settings guide the agent; they are not silently enforced by `security-review diff` or `scan`.

---

## Related Documentation
- [Main README](../README.md) — Standalone CLI & AI Agent Toolkit
- [Agent Skills](agent-skills.md) — Generic AI Agent integration
- [Field Registry](field-registry.md) — YAML frontmatter schema dictionary
