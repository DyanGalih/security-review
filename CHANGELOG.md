# Changelog

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
