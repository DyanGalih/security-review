# Design Document

This document explains how the Security Review extension is structured and how it aligns with the Spec-Kit Extension Development Guide.

## Overview

The extension is intentionally lightweight. It does not ship a compiled runtime or a custom binary. Instead, it registers a prompt-backed slash command that Spec-Kit exposes to the agent after installation.

Core model:

- `specify` installs and manages the extension
- `extension.yml` declares metadata and command registration
- `commands/` contains the source command files in this repository
- Installation copies that prompt into the project-local command registry under `.claude/commands/`
- The agent runs the review commands as `/speckit.security-review.audit`, `/speckit.security-review.staged`, `/speckit.security-review.branch`, `/speckit.security-review.plan`, `/speckit.security-review.tasks`, `/speckit.security-review.followup`, and `/speckit.security-review.apply`
- Plan and task review commands fit around the Spec-Kit planning flow and help validate secure-by-design decisions before implementation
- Repository-native memory artifacts such as `docs/memory/`, `specs/<feature>/memory.md`, `specs/<feature>/memory-synthesis.md`, and `.github/copilot-instructions.md` provide secure-by-design context when present

## Guide Alignment

The upstream Extension Development Guide establishes four important conventions that this repository now follows:

1. Manifest schema uses top-level `extension`, `requires`, and `provides` sections.
2. Registered command names follow `speckit.<extension>.<command>`.
3. Command files start with YAML frontmatter and then use Markdown body content.
4. Local installation and registration are project-scoped under `.specify/` and `.claude/`.

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                      Spec-Kit Project                        │
│                                                              │
│  specify extension add ...                                   │
│            │                                                 │
│            ▼                                                 │
│   .specify/extensions/                                       │
│            │                                                 │
│            ▼                                                 │
│   commands/*.md (source command files)                      │
│            │                                                 │
│            ▼                                                 │
│   installed .claude/commands/speckit.security-review.audit.md │
│            │                                                 │
│            ▼                                                 │
│   /speckit.security-review.audit                              │
│            │                                                 │
│            ▼                                                 │
│   Security report with findings and remediation tasks        │
└──────────────────────────────────────────────────────────────┘
```

The same install-and-register pattern applies to the staged, branch, plan, task, follow-up, and apply commands.

The upstream Spec-Kit workflow documented at speckit.org centers on `/plan`, `/tasks`, `/analyze`, and `/implement`. This extension layers security review commands around that documented flow rather than replacing it.
The official lifecycle ends at `/implement`; there are no `test` or `deploy` slash commands in the documented core flow.

## Repository Structure

```text
security-review-extension/
├── extension.yml
├── config-template.yml
├── commands/
│   ├── security-review.md
│   ├── security-review-plan.md
│   ├── security-review-staged.md
│   ├── security-review-branch.md
│   ├── security-review-tasks.md
│   ├── security-review-followup.md
│   ├── security-review-apply.md
│   └── init.md
├── docs/
│   ├── installation.md
│   ├── usage.md
│   └── design.md
├── examples/
│   └── example-output.md
└── assets/
```

## Manifest Design

The manifest is declarative and minimal.

- `extension`: identity, version, repository, and descriptive metadata
- `requires`: Spec-Kit compatibility requirement
- `provides.commands`: slash-command registration
- `tags`: catalog and discovery metadata

The command remains named `speckit.security-review.audit` because the development guide reserves that namespace for extension commands even though installation and management are done through the `specify` CLI.

## Command File Design

The command file follows the guide's command-file format:

1. YAML frontmatter for metadata
2. Markdown body for the actual command instructions
3. `$ARGUMENTS` passthrough so the user can supply natural-language scoping input

This lets the extension stay prompt-driven while still supporting targeted reviews such as focusing on authentication, secrets, or specific directories.

## Document Header Strategy

Every generated security review document starts with a YAML frontmatter block. This block serves three purposes simultaneously:

1. **Header-first LLM decisions**: An LLM reading the document encounters all structured metadata before the first finding. It can decide whether the document is relevant — by risk level, review type, OWASP categories, or date — without processing the report body. This reduces token usage in agentic pipelines that load multiple documents.

2. **INDEX.md routing**: Each frontmatter block maps to a compact routing row in the consuming repo's `docs/memory/INDEX.md`. The row contains the same key fields in one line, allowing the LLM to filter across all security review documents using only the index — without loading any document body.

3. **SQLite Phase 1 readiness**: The frontmatter fields are the exact schema that flash-mem and the compatibility memory-hub layer can ingest as SQL columns. No rework is required when the optimizer is enabled — the same frontmatter values populate the cache directly.

The field definitions, indexing hints, INDEX.md row format, and SQLite column mapping are maintained in `docs/field-registry.md` and `docs/field-summaries.yml`.

### Two-Stage Retrieval Flow

```text
Stage 1 (now — no SQLite required):
  LLM reads docs/memory/INDEX.md
    → filters rows by overall_risk, review_type, owasp_categories
    → loads only matching document(s)
    → reads frontmatter first → decides whether to read the full body

Stage 2 (after flash-mem SQLite Phase 1 / compatibility optimizer):
  SQL query on security_reviews table
    → SELECT doc_path WHERE overall_risk IN ('CRITICAL','HIGH')
    → LLM never touches INDEX.md or document bodies for non-matching docs
    → loads only the filtered doc paths
    → reads frontmatter first → reads relevant sections
```

The frontmatter defined today is the SQL schema for tomorrow. No data migration is needed.
It also lets the full-project audit re-read project memory artifacts before evaluating the implementation.

The plan review command uses the same flash-mem context to review `plan.md` and supporting design artifacts. If flash-mem is unavailable, it uses the spec-kit-memory-hub compatibility context. After `/speckit.tasks` generates the task list, the task review command checks whether the sequencing still preserves the secure-by-design intent. After a security review, the follow-up command can turn findings into concrete tasks or technical debt while checking whether incomplete issues are already tracked, and it emits backlog-ready task records with source finding references. The apply command is the explicit opt-in step that writes approved follow-up items back into `tasks.md` and, when necessary, `plan.md`.

## Security Coverage Model

The prompt is organized around these review layers:

### OWASP Top 10 (2025)

| Category                                  | Coverage Summary                           |
| ----------------------------------------- | ------------------------------------------ |
| A01 Broken Access Control                 | Authorization gaps, IDOR, SSRF             |
| A02 Security Misconfiguration             | Headers, defaults, exposed internals       |
| A03 Software Supply Chain Failures        | Dependencies, lockfiles, build integrity   |
| A04 Cryptographic Failures                | Weak crypto, key handling, TLS             |
| A05 Injection                             | SQL, NoSQL, command, template injection    |
| A06 Insecure Design                       | Missing controls, unsafe workflows         |
| A07 Authentication Failures               | Session, password, MFA, token flaws        |
| A08 Software or Data Integrity Failures   | Deserialization, update trust, CI/CD abuse |
| A09 Security Logging & Alerting Failures  | Logging coverage and alerting quality      |
| A10 Mishandling of Exceptional Conditions | Fail-open paths and unsafe error handling  |

### Additional Analysis Layers

- Secure coding practices
- Architecture and trust boundaries
- Supply-chain and dependency review
- DevSecOps configuration review
- STRIDE-oriented threat framing

## Installation and Registration Model

The extension guide treats installation as project-local.

### Release install

```bash
cd /path/to/spec-kit-project
specify extension add security-review --from <release-zip>
```

### Development install

```bash
cd /path/to/spec-kit-project
specify extension add --dev /path/to/security-review/src
```

### Registration checks

```bash
specify extension list
ls .claude/commands/speckit.security-review.*
cat .specify/extensions/.registry
```

## Memory Model

The extension is most useful when the Spec-Kit project keeps design intent in memory:

- Durable memory lives in `docs/memory/`
- Feature-specific working memory lives in `specs/<feature>/memory.md`
- The concise summary for active work lives in `specs/<feature>/memory-synthesis.md`
- Copilot instructions in `.github/copilot-instructions.md` can reinforce the same design intent
- Full-project audits should use those artifacts to assess whether the implementation still matches the intended design
- Plan and task reviews should use those artifacts to make sure the planned work stays aligned before implementation begins
- Staged and branch reviews should use it as context, but the diff under review still remains the source of truth

## Output Design

The report format is optimized for remediation, not just detection. Each finding should include:

- Severity and location
- OWASP mapping
- Risk explanation
- Exploit scenario where relevant
- Concrete remediation guidance
- Spec-Kit-ready follow-up tasks

## Design Tradeoffs

### Why a Prompt-Backed Command

- Easier to maintain than a language-specific scanner
- Works across mixed-language repositories
- Lets the agent explain why a finding matters

### Why Natural-Language Scoping Instead of CLI Flags

- Matches the command-file model in the extension guide
- Avoids inventing a parallel standalone CLI interface
- Keeps the prompt flexible for different review contexts

### Why Project-Local Installation

- Matches the upstream development guide
- Makes command registration explicit and inspectable
- Keeps extension behavior tied to the current Spec-Kit project

## Future Enhancements

- Add a manifest-managed config entry if the project moves from an optional review brief to a formal extension configuration file
- Add `.extensionignore` if release packaging should exclude development-only content
- Add automated manifest and command-file validation tests
