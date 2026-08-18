import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import type { ValidationIssue, ValidationResult } from './types.js';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Validates a markdown security report against field-registry frontmatter specifications.
 */
export async function validateReportFrontmatter(filePath: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      valid: false,
      filePath,
      frontmatterPresent: false,
      issues: [{ message: `Cannot read file: ${error.message || String(err)}`, severity: 'ERROR' }],
    };
  }

  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      valid: false,
      filePath,
      frontmatterPresent: false,
      issues: [{ message: 'Missing YAML frontmatter block (--- ... ---)', severity: 'ERROR' }],
    };
  }

  let data: Record<string, unknown>;
  try {
    data = yaml.load(match[1]) as Record<string, unknown>;
    if (!data || typeof data !== 'object') {
      throw new Error('Frontmatter is not a valid YAML mapping/object');
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      valid: false,
      filePath,
      frontmatterPresent: true,
      issues: [{ message: `YAML syntax error in frontmatter: ${error.message || String(err)}`, severity: 'ERROR' }],
    };
  }

  // Validate required metadata fields per field-registry.md
  const requiredFields = [
    'document_type',
    'review_type',
    'total_findings',
    'critical_count',
    'high_count',
    'medium_count',
    'low_count',
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      issues.push({
        field,
        message: `Missing required frontmatter field: "${field}"`,
        severity: 'ERROR',
      });
    }
  }

  // Check risk field (either overall_risk or risk_level)
  const riskField = data.overall_risk ?? data.risk_level;
  if (!riskField) {
    issues.push({
      field: 'overall_risk',
      message: `Missing required risk level field ("overall_risk" or "risk_level")`,
      severity: 'ERROR',
    });
  } else {
    const validLevels = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'INFORMATIONAL'];
    const levelStr = String(riskField).toUpperCase().replace(' RISK', '').trim();
    if (!validLevels.includes(levelStr)) {
      issues.push({
        field: 'overall_risk',
        message: `Unrecognized risk level: "${riskField}". Expected one of: ${validLevels.join(', ')}`,
        severity: 'WARNING',
      });
    }
  }

  return {
    valid: issues.filter((i) => i.severity === 'ERROR').length === 0,
    filePath,
    frontmatterPresent: true,
    metadata: data,
    issues,
  };
}
