import { describe, it, expect } from 'vitest';
import { validateReportFrontmatter } from '../core/validator.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('validateReportFrontmatter', () => {
  it('should successfully validate example-output.md', async () => {
    const examplePath = join(__dirname, '../examples/example-output.md');
    const result = await validateReportFrontmatter(examplePath);

    expect(result.valid).toBe(true);
    expect(result.frontmatterPresent).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.overall_risk).toBe('MEDIUM');
    expect(result.metadata?.total_findings).toBe(18);
  });

  it('should return valid=false for missing files', async () => {
    const result = await validateReportFrontmatter('nonexistent-report.md');
    expect(result.valid).toBe(false);
    expect(result.frontmatterPresent).toBe(false);
  });

  it('should reject invalid document_type', async () => {
    const tmpPath = join(tmpdir(), `test-invalid-doc-${Date.now()}.md`);
    await writeFile(
      tmpPath,
      `---
document_type: generic-doc
review_type: audit
total_findings: 0
critical_count: 0
high_count: 0
medium_count: 0
low_count: 0
overall_risk: NONE
---
# Content
`,
      'utf8'
    );

    const result = await validateReportFrontmatter(tmpPath);
    await unlink(tmpPath);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'document_type')).toBe(true);
  });

  it('should reject invalid identifier patterns and count mismatches', async () => {
    const tmpPath = join(tmpdir(), `test-invalid-patterns-${Date.now()}.md`);
    await writeFile(
      tmpPath,
      `---
document_type: security-review
review_type: audit
total_findings: 5
critical_count: 1
high_count: 1
medium_count: 1
low_count: 1
overall_risk: HIGH
owasp_categories: [INVALID_OWASP]
cwe_identifiers: [INVALID_CWE]
---
# Content
`,
      'utf8'
    );

    const result = await validateReportFrontmatter(tmpPath);
    await unlink(tmpPath);

    expect(result.valid).toBe(false);
    // Count sum (4) != total_findings (5)
    expect(result.issues.some((i) => i.field === 'total_findings')).toBe(true);
    // Invalid patterns
    expect(result.issues.some((i) => i.field === 'owasp_categories')).toBe(true);
    expect(result.issues.some((i) => i.field === 'cwe_identifiers')).toBe(true);
  });

  it('should enforce export provenance on export review_type', async () => {
    const tmpPath = join(tmpdir(), `test-export-${Date.now()}.md`);
    await writeFile(
      tmpPath,
      `---
document_type: security-review
review_type: export
total_findings: 0
critical_count: 0
high_count: 0
medium_count: 0
low_count: 0
overall_risk: NONE
assessment_kind: whitebox-review
source_artifacts: ["docs/security-reviews/2026-08-19-auth.md"]
commit_or_branch: "main"
---
# Export Content
`,
      'utf8'
    );

    const result = await validateReportFrontmatter(tmpPath);
    await unlink(tmpPath);

    expect(result.valid).toBe(true);
  });

  it('should successfully validate example-verify-e2e.md with Playwright E2E and fix_suggestion fields', async () => {
    const examplePath = join(__dirname, '../examples/example-verify-e2e.md');
    const result = await validateReportFrontmatter(examplePath);

    expect(result.valid).toBe(true);
    expect(result.frontmatterPresent).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.review_type).toBe('verify');
    expect(result.metadata?.e2e_verified).toBe(true);
    expect(result.metadata?.fix_suggestion_count).toBe(1);
    expect(result.metadata?.confirmed_count).toBe(1);
    expect(result.metadata?.false_positive_count).toBe(1);
  });

  it('should reject invalid fix_suggestion_count or e2e_verified types', async () => {
    const tmpPath = join(tmpdir(), `test-invalid-verify-${Date.now()}.md`);
    await writeFile(
      tmpPath,
      `---
document_type: security-review
review_type: verify
total_findings: 1
critical_count: 1
high_count: 0
medium_count: 0
low_count: 0
overall_risk: CRITICAL
fix_suggestion_count: -5
e2e_verified: "not-a-boolean"
---
# Verify Content
`,
      'utf8'
    );

    const result = await validateReportFrontmatter(tmpPath);
    await unlink(tmpPath);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'fix_suggestion_count')).toBe(true);
    expect(result.issues.some((i) => i.field === 'e2e_verified')).toBe(true);
  });
});
