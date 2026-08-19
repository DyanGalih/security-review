import { describe, it, expect } from 'vitest';
import { validateReportFrontmatter } from '../core/validator.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
});
