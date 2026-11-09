import { describe, it, expect } from 'vitest';
import { validateReportFrontmatter } from '../core/validator.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

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
coverage_complete: true
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
coverage_complete: true
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
coverage_complete: true
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

  async function validateFrontmatter(body: string) {
    const tmpPath = join(tmpdir(), `test-fm-${Date.now()}-${randomUUID()}.md`);
    await writeFile(tmpPath, `---\n${body}\n---\n# Content\n`, 'utf8');
    try {
      return await validateReportFrontmatter(tmpPath);
    } finally {
      await unlink(tmpPath);
    }
  }

  const baseCounts = `total_findings: 0
critical_count: 0
high_count: 0
medium_count: 0
low_count: 0
overall_risk: NONE`;

  it('accepts review_type verify and rejects a removed alias with the allowed list', async () => {
    const verify = await validateFrontmatter(`document_type: security-review\nreview_type: verify\n${baseCounts}\ncoverage_complete: true`);
    expect(verify.issues.some((i) => i.field === 'review_type')).toBe(false);

    const alias = await validateFrontmatter(`document_type: security-review\nreview_type: remediation\n${baseCounts}\ncoverage_complete: true`);
    const issue = alias.issues.find((i) => i.field === 'review_type');
    expect(alias.valid).toBe(false);
    expect(issue?.message).toContain('audit, branch, staged, plan, tasks, followup, export, verify');
  });

  it('requires coverage_complete and caveats when the review is incomplete', async () => {
    const missing = await validateFrontmatter(`document_type: security-review\nreview_type: audit\n${baseCounts}`);
    expect(missing.valid).toBe(false);
    expect(missing.issues.some((i) => i.field === 'coverage_complete')).toBe(true);

    const noCaveats = await validateFrontmatter(`document_type: security-review\nreview_type: audit\n${baseCounts}\ncoverage_complete: false`);
    expect(noCaveats.valid).toBe(false);
    expect(noCaveats.issues.some((i) => i.field === 'coverage_caveats')).toBe(true);

    const withCaveats = await validateFrontmatter(`document_type: security-review\nreview_type: audit\n${baseCounts}\ncoverage_complete: false\ncoverage_caveats: ["budget exhausted before the admin routes"]`);
    expect(withCaveats.valid).toBe(true);

    const complete = await validateFrontmatter(`document_type: security-review\nreview_type: audit\n${baseCounts}\ncoverage_complete: true`);
    expect(complete.valid).toBe(true);
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
    expect(result.metadata?.critical_count).toBe(0);
    expect(result.metadata?.high_count).toBe(1);
    expect(result.metadata?.medium_count).toBe(1);
    expect(result.metadata?.total_findings).toBe(2);
    expect(result.metadata?.findings_evaluated).toBe(3);
  });

  it('includes the required report fields in the verification command header', async () => {
    const command = await readFile(join(__dirname, '../commands/security-verify.md'), 'utf8');
    const header = command.match(/```yaml\n(---\n[\s\S]*?\n---)\n```/)?.[1];
    expect(header).toBeDefined();
    for (const field of ['total_findings', 'overall_risk', 'critical_count', 'high_count', 'medium_count', 'low_count']) {
      expect(header).toContain(`${field}:`);
    }
  });

  it('should reject non-integer fix_suggestion_count and invalid e2e_verified types', async () => {
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
fix_suggestion_count: true
confirmed_count: -1
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

    await writeFile(tmpPath, `---
document_type: security-review
review_type: verify
total_findings: 0
critical_count: 0
high_count: 0
medium_count: 0
low_count: 0
overall_risk: NONE
fix_suggestion_count: "1"
---
# Verify Content
`, 'utf8');
    const quotedCount = await validateReportFrontmatter(tmpPath);
    await unlink(tmpPath);
    expect(quotedCount.issues.some((i) => i.field === 'fix_suggestion_count')).toBe(true);
  });
});
