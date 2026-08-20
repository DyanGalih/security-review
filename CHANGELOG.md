# Changelog

## v2.0.0

- **Major Rebrand & Standalone Decoupling**:
  - Rebranded package and binaries to standalone `security-review` (`https://github.com/DyanGalih/security-review`).
  - Decoupled standalone CLI & Agent skills (`/sr-*` and `/security-review.*`) from Spec-Kit while preserving complete backward compatibility for Spec-Kit extensions (`speckit.security-review.*`).
  - Added interactive multi-agent skill installer via `security-review init .` supporting Antigravity, Claude Code, Cursor, OpenCode, Codex, Gemini CLI, Goose CLI, and Windsurf.
  - Standardized short slash command prefixes (`/sr-audit`, `/sr-staged`, `/sr-branch`, `/sr-plan`, `/sr-tasks`, `/sr-followup`, `/sr-apply`, `/sr-export`, `/sr-init`).
  - Renamed core audit command template from `security-review.md` to `security-audit.md` (while keeping `speckit.security-review.audit` in `extension.yml`).
  - Generalized all 9 command prompts to remove framework-specific coupling while supporting generic planning documents (`plan.md`, `design.md`, `tasks.md`).
  - Added `security_task` as primary report frontmatter field with seamless fallback support for `spec_kit_task`.
  - Added Finding Re-Verification & Safe Proof-of-Concept (PoC) generation skill (`/sr-verify` / `commands/security-verify.md`), classifying findings (`CONFIRMED`, `FALSE_POSITIVE`, `MITIGATED`, `ACCEPTED_RISK`) and generating non-destructive unit test PoCs and curl reproductions.
  - Added modern promotional landing page under `src/landing/` (`index.html`, `styles.css`, `new_logo.png`).
- **CLI & Runtime Enhancements**:
  - **Centralized `.security-review/` Configuration**: Standardized all project-internal configurations and workspace caches under `<workspace>/.security-review/` (`.security-review/security-review.yml`, `.security-review/findings.json`), with automatic migration for legacy root config files during `init`.
  - **Automatic Report Persistence & Latest Report Discovery**: Configured `/sr-audit`, `/sr-export`, and `/sr-verify` prompts to automatically save completed Markdown reports directly to `docs/security-reviews/<YYYY-MM-DD>-<type>.md`, and updated downstream commands/CLI (`report`, `tasks`, `sdd propose`, `/sr-followup`, `/sr-export`, `/sr-verify`) to automatically discover and review the latest report from `docs/security-reviews/` by default.
  - **SDD Bridge & Framework Auto-Detection**: Added automatic workspace detection for OpenSpec, Spec-Kit, and Generic environments, `security-review sdd status` inspection, and `security-review sdd propose --input findings.json` to generate complete change packages (`proposal.md`, `spec.md`, `design.md`, `tasks.md`) directly from security review findings.
  - **Hybrid Findings Mode & Deterministic Generators**: Added `FindingItem` / `FindingsReport` JSON schema, plus `security-review report --input findings.json` (deterministic Markdown pentest report compiler) and `security-review tasks --input findings.json` (direct `TASK-SEC-NNN` creation/append into `tasks.md`).
  - `diff --branch <target> [base]`: Deterministic target/base syntax with strict merge-base validation.
  - Token-budgeted payloads with sensitivity prioritization (`CRITICAL` -> `HIGH` -> `MEDIUM` -> `LOW`).
  - `sync-headers --dry-run` and bounded `INDEX.md` section management.
  - Strict frontmatter schema validation (types, regex patterns, counts, export provenance).
  - Node.js engine requirement updated to `>= 22.0.0`.
- **Documentation Restructure**:
  - Modularized documentation inside `src/` with dedicated `agent-skills.md`, `cli-reference.md`, `speckit-extension.md`, `design.md`, `usage.md`, and `installation.md`.

## v1.7.0

- Upgraded repository into an installable Node.js / TypeScript CLI & Agent Toolkit (`@speckit/security-review`) alongside the Spec-Kit extension.
- Added executable binary entrypoints `security-review`, `sec-review`, and `sr`.
- Added core subcommands:
  - `diff`: Fast, parameterized git staged & branch diff extraction with security sensitivity classification and token-budgeted agent formatting.
  - `scan`: Discovery of security-relevant entrypoints, trust boundaries, and configuration files.
  - `validate`: Strict YAML frontmatter verification against `src/docs/field-registry.md`.
  - `sync-headers`: Indexing frontmatter metadata into memory tables.
- Implemented strict TypeScript (NodeNext / ESM) modules under `src/core/` and `src/cli/`.
- Added automated unit and integration test suite with Vitest.
- Maintained 100% backward compatibility with existing Spec-Kit extension manifests and commands.

## v1.6.1

- Bumped the extension version to `1.6.1`.

## v1.6.0

- Bumped the extension version to `1.6.0`.
- Integrated OWASP ASVS v4.0.3, SANS/CWE Top 25, and MITRE ATT&CK into the security review prompts.
- Added language-specific and ecosystem security checks to all prompt scopes.
- Updated the output structure and YAML frontmatter to support ASVS requirement mapping and MITRE technique mapping.

## v1.5.3

- Bumped the extension version to `1.5.3`.
- Updated release and installation references to the new tag.

## v1.5.2

- Bumped the extension version to `1.5.2`.
- Updated release and installation references to the new tag.
- Updated memory-oriented documentation to make `flash-mem` the primary integration path and keep `spec-kit-memory-hub` as the compatibility fallback.

## v1.4.9

- Added explicit instructions for agents to read specification files bypassing gitignore.

## v1.5.0

- Added YAML frontmatter header to all generated security review documents containing structured metadata: `document_type`, `review_type`, `assessment_date`, `overall_risk`, per-severity counts, `owasp_categories`, `cwe_ids`, and a static `field_summaries` dictionary.
- All 6 report-generating prompts (`audit`, `branch`, `staged`, `plan`, `tasks`, `followup`) now instruct the LLM to emit the frontmatter block before the report body and output a proposed `docs/memory/INDEX.md` routing row after the report.
- Added `docs/field-registry.md` defining every metadata field, its type, range, indexing priority, INDEX.md row format, and future SQLite Phase 1 column mapping.
- Added `docs/field-summaries.yml` as a machine-readable schema for all frontmatter fields.
- Updated `examples/example-output.md` with populated frontmatter and a sample INDEX.md row.
- Added `scripts/update-document-headers.sh` to batch-prepend frontmatter to existing review documents.
- Updated `docs/design.md` with the Document Header Strategy and two-stage retrieval flow (INDEX.md now → SQLite Phase 1 later).
- Updated `docs/usage.md` with field reference table, INDEX.md integration guide, and batch-update instructions.
- Updated `README.md` Output Format section to describe the new header and memory-hub integration.

## v1.3.1

- Bumped the extension version to `1.3.1`.
- Updated release and installation references to the new tag.
- Added the install smoke test and contribution guide.
