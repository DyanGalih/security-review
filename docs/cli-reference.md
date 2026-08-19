# CLI Reference

> Detailed reference for the `security-review` command-line interface.

---

## 1. Overview

The `security-review` CLI (aliases: `sec-review`, `sr`) provides high-speed, local operations to support whitebox security reviews and AI agent workflows.

```bash
security-review <command> [options]
```

---

## 2. Commands

### `diff`
Extracts git changes, categorizes security sensitivity (CRITICAL, HIGH, MEDIUM, LOW), and formats context messages for AI agents.

```bash
# Staged changes only
security-review diff --staged

# Branch diff vs base
security-review diff --branch feature/auth

# Custom base branch and token budget
security-review diff --branch feature/auth main --budget 5000

# JSON output
security-review diff --staged --json
```

---

### `scan`
Scans the project directory for security-sensitive entrypoints (authentication, persistence, payments, configurations).

```bash
# Scan current working directory
security-review scan

# Scan custom directory
security-review scan --path ./src/api

# JSON output
security-review scan --json
```

---

### `validate`
Validates report YAML frontmatter headers against the schema dictionary.

```bash
# Validate a single report
security-review validate docs/security-reviews/2026-08-19-auth.md

# JSON output
security-review validate report.md --json
```

---

### `sync-headers`
Scans and indexes report frontmatters for token-efficient memory retrieval tables.

```bash
# Scan docs directory
security-review sync-headers --docs docs/security-reviews/
```

---

## Related Documentation
- [Main README](../README.md)
- [Agent Skills](agent-skills.md)
- [Field Registry](field-registry.md)
