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

  const validReviewTypes = ['audit', 'branch', 'staged', 'plan', 'tasks', 'followup', 'export'];
  if (data.review_type && !validReviewTypes.includes(String(data.review_type))) {
    issues.push({
      field: 'review_type',
      message: `Unrecognized review type: "${data.review_type}". Expected one of: ${validReviewTypes.join(', ')}`,
      severity: 'ERROR',
    });
  }

  if (data.review_type === 'export') {
    const requiredExportFields = ['assessment_kind', 'source_artifacts', 'commit_or_branch'] as const;
    for (const field of requiredExportFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        issues.push({
          field,
          message: `Missing required export provenance field: "${field}"`,
          severity: 'ERROR',
        });
      }
    }

    if (data.assessment_kind && !['whitebox-review', 'report-synthesis'].includes(String(data.assessment_kind))) {
      issues.push({
        field: 'assessment_kind',
        message: `Invalid assessment_kind: "${data.assessment_kind}". Expected whitebox-review or report-synthesis.`,
        severity: 'ERROR',
      });
    }

    if (data.source_artifacts !== undefined && (!Array.isArray(data.source_artifacts) || data.source_artifacts.some((item: unknown) => typeof item !== 'string'))) {
      issues.push({
        field: 'source_artifacts',
        message: 'source_artifacts must be an array of strings.',
        severity: 'ERROR',
      });
    }

    if (data.commit_or_branch !== undefined && (typeof data.commit_or_branch !== 'string' || data.commit_or_branch.trim() === '')) {
      issues.push({
        field: 'commit_or_branch',
        message: 'commit_or_branch must be a non-empty string.',
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
    const validLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL', 'NONE'];
    const levelStr = String(riskField).toUpperCase().replace(' RISK', '').trim();
    const normalizedLevel = levelStr === 'MODERATE' ? 'MEDIUM' : levelStr === 'SECURE' ? 'NONE' : levelStr;
    if (normalizedLevel !== levelStr) {
      issues.push({
        field: 'overall_risk',
        message: `Legacy risk level "${riskField}" maps to "${normalizedLevel}". Regenerate the document with the canonical value.`,
        severity: 'WARNING',
      });
    } else if (!validLevels.includes(normalizedLevel)) {
      issues.push({
        field: 'overall_risk',
        message: `Unrecognized risk level: "${riskField}". Expected one of: ${validLevels.join(', ')}`,
        severity: 'WARNING',
      });
    }

    const counts = ['critical_count', 'high_count', 'medium_count', 'low_count', 'informational_count']
      .map((field) => Number(data[field] ?? 0));
    const total = Number(data.total_findings);
    if (counts.every(Number.isFinite) && Number.isFinite(total)) {
      const countSum = counts.reduce((sum, count) => sum + count, 0);
      if (countSum !== total) {
        issues.push({
          field: 'total_findings',
          message: `total_findings (${total}) does not equal the sum of severity counts (${countSum}).`,
          severity: 'ERROR',
        });
      }
      if (total > 0 && normalizedLevel === 'NONE') {
        issues.push({
          field: 'overall_risk',
          message: 'overall_risk cannot be NONE when active findings exist.',
          severity: 'ERROR',
        });
      } else if (total === 0 && normalizedLevel !== 'NONE') {
        issues.push({
          field: 'overall_risk',
          message: 'A zero-finding report should use the canonical overall_risk NONE.',
          severity: 'WARNING',
        });
      }
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
