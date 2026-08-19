# CLI Reference

> Detailed reference for the `security-review` command-line interface.

---

## 1. Overview

The `security-review` CLI (aliases: `sec-review`, `sr`) provides fast, local git diff extraction, security entrypoint discovery, frontmatter schema validation, and memory index synchronization.

```bash
security-review <command> [options]
```

---

## 2. Prerequisites
- **Node.js**: `>= 22.0.0`
- **Git**: Installed and available on `$PATH`

---

## 3. Commands

### `init`
Installs Security Review prompt templates and skills into the target workspace for selected AI coding agents, provisions `security-review.yml`, and configures `AGENTS.md`.

```bash
# Interactive setup in current directory
security-review init

# Non-interactive installation for Antigravity and Claude Code
security-review init . --yes --agent antigravity,claude

# Install for all supported agents
security-review init /path/to/project --yes --agent all

# Specify individual commands and overwrite behavior
security-review init . --yes --agent cursor-agent,opencode --commands security-review,security-review-staged --overwrite replace
```

**Options:**
- `target`: Target workspace directory path (default: `.`).
- `-y, --yes`: Non-interactive mode (uses defaults or supplied flags without prompting).
- `--agent <names>`: Comma-separated list of agent keys (`antigravity`, `claude`, `cursor-agent`, `opencode`, `codex`, `copilot`, `gemini`, `windsurf`, `cline`, etc., or `all`).
- `--commands <list>`: Comma-separated list of command keys (`security-audit`, `security-review-staged`, `security-review-branch`, `security-review-plan`, `security-review-tasks`, `security-review-followup`, `security-review-apply`, `security-review-export`, `security-verify`, `init`, or `all`).
- `--overwrite <mode>`: Overwrite strategy when target files exist (`replace` | `skip` | `keep-both`). Default in `--yes` mode is `replace`.

---

### `diff`
Extracts git changes, categorizes security sensitivity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), and formats context payloads for AI agents.

```bash
# Staged changes only (default)
security-review diff --staged

# Branch diff: compare target branch against default repository base (main)
security-review diff --branch feature/auth

# Branch diff: compare target branch against explicit base branch
security-review diff --branch feature/auth develop

# Structured token budget: bounds output to 4,000 tokens, prioritizing Critical/High files
security-review diff --staged --budget 4000

# JSON output payload for programmatic agent integration
security-review diff --branch feature/auth --json
```

**Options:**
- `--staged`: Analyzes currently staged changes (`git diff --cached`).
- `--branch <target> [base]`: Compares `<target>` against `[base]` (or default base branch). Exits with an error if ref or merge-base resolution fails.
- `--budget <tokens>`: Positive integer bounding the output size by omitting lowest-priority files first.
- `--json`: Formats output as structured JSON.

---

### `scan`
Discovers candidate security-sensitive entrypoints (authentication handlers, persistence migrations, payment routes, and configurations) based on path-name heuristics.

```bash
# Scan current working directory
security-review scan

# Scan custom directory
security-review scan --path ./src/api

# JSON output
security-review scan --json
```

> ℹ️ **Path-name Heuristic**: `scan` identifies candidate surfaces using file naming patterns. It is not a static analysis (SAST) or vulnerability scanner; findings require agent or human review.

---

### `report`
Compiles raw JSON findings emitted by AI agents or scanners into a formal Markdown security report with risk summaries, executive metrics, and technical breakdowns.

```bash
# Generate report from findings.json and save to docs/security-reviews/ automatically
security-review report --input findings.json

# Save report to specific custom path
security-review report --input findings.json --output docs/custom-report.md

# Output formatted JSON report
security-review report --input findings.json --format json

# Print report to stdout
security-review report --input findings.json --output -
```

**Options:**
- `--input <file>`: Path to the JSON findings file (required).
- `--output <file>`: Target output file path (default: `docs/security-reviews/<YYYY-MM-DD>-security-report.md`, or `-` for stdout).
- `--format <fmt>`: `markdown` (default) or `json`.

---

### `tasks`
Converts raw JSON findings into `TASK-SEC-NNN` remediation checklist items and optionally appends them directly to `tasks.md`.

```bash
# Output tasks to stdout
security-review tasks --input findings.json

# Generate new tasks file
security-review tasks --input findings.json --target tasks.md

# Append findings to existing tasks.md
security-review tasks --input findings.json --target tasks.md --append
```

**Options:**
- `--input <file>`: Path to the JSON findings file (required).
- `--target <file>`: Path to `tasks.md` file (if omitted, auto-detects active OpenSpec or Spec-Kit tasks target).
- `--append`: Appends tasks to existing file without overwriting.

---

### `sdd`
Provides SDD framework auto-detection and automated change proposal generation from security findings.

#### `sdd status`
Inspects workspace and identifies active SDD framework (`OpenSpec`, `Spec-Kit`, or `Generic`) along with resolved active change paths.

```bash
# Display framework status
security-review sdd status

# Output as JSON
security-review sdd status --json
```

#### `sdd propose`
Generates a complete SDD change directory (`proposal.md`, `spec.md`, `design.md`, `tasks.md`) directly from a findings JSON file.

```bash
# Auto-detect framework and generate remediation change package
security-review sdd propose --input findings.json

# Explicitly create OpenSpec change with custom name
security-review sdd propose --input findings.json --framework openspec --name fix-auth-sqli
```

---

### `validate`
Validates report YAML frontmatter headers against the schema dictionary in `field-registry.md`.

```bash
# Validate a single report
security-review validate docs/security-reviews/2026-08-19-auth.md

# JSON output
security-review validate report.md --json
```

Enforces:
- `document_type: security-review`
- Canonical risk levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`, `NONE`)
- Non-negative integer count totals
- ISO date formats (`YYYY-MM-DD`)
- Standard identifier patterns (OWASP `A01-A10`, CWE `CWE-\d+`, ASVS `V\d+`, MITRE `T\d+`)
- Export provenance fields for `review_type: export` (`assessment_kind`, `source_artifacts`, `commit_or_branch`)

---

### `sync-headers`
Scans valid security report frontmatters and synchronizes a managed table in `docs/memory/INDEX.md`.

```bash
# Preview table rows without modifying files
security-review sync-headers --docs docs/security-reviews/ --dry-run

# Update managed INDEX section (preserves unrelated content)
security-review sync-headers --docs docs/security-reviews/ --index docs/memory/INDEX.md
```

Managed Section Format in `INDEX.md`:
```markdown
<!-- MANAGED: SECURITY_REVIEWS -->
| Date | Scope | Risk | Findings | File |
|---|---|---|---|---|
| 2026-08-19 | branch | **HIGH** | 4 | [2026-08-19-auth.md](2026-08-19-auth.md) |
<!-- /MANAGED: SECURITY_REVIEWS -->
```

---

## Related Documentation
- [Main README](../README.md)
- [Installation Guide](installation.md)
- [Agent Skills](agent-skills.md)
- [Spec-Kit Extension Guide](speckit-extension.md)
- [Field Registry](field-registry.md)
