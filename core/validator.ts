import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import type { ValidationIssue, ValidationResult } from './types.js';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const OWASP_REGEX = /^(A0?[1-9]|A10)(:\d{4})?(-[A-Za-z0-9_ -]+)?$/i;
const CWE_REGEX = /^CWE-\d+$/i;
const ASVS_REGEX = /^V\d+(\.\d+)*$/i;
const MITRE_REGEX = /^T\d+(\.\d+)?$/i;

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

  // 1. Document Type Check
  if (data.document_type === undefined || data.document_type === null) {
    issues.push({
      field: 'document_type',
      message: 'Missing required frontmatter field: "document_type"',
      severity: 'ERROR',
    });
  } else if (data.document_type !== 'security-review') {
    issues.push({
      field: 'document_type',
      message: `Invalid document_type "${data.document_type}". Expected "security-review".`,
      severity: 'ERROR',
    });
  }

  // 2. Review Type Check
  const validReviewTypes = ['audit', 'branch', 'staged', 'plan', 'tasks', 'followup', 'export', 'remediation', 'plan-review', 'tasks-review'];
  if (data.review_type === undefined || data.review_type === null) {
    issues.push({
      field: 'review_type',
      message: 'Missing required frontmatter field: "review_type"',
      severity: 'ERROR',
    });
  } else if (!validReviewTypes.includes(String(data.review_type))) {
    issues.push({
      field: 'review_type',
      message: `Unrecognized review type: "${data.review_type}". Expected one of: ${validReviewTypes.join(', ')}`,
      severity: 'ERROR',
    });
  }

  // 3. Assessment Date Check
  const dateValue = data.assessment_date ?? data.date;
  if (dateValue !== undefined && dateValue !== null) {
    const dateStr = typeof dateValue === 'string' ? dateValue : (dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : String(dateValue));
    if (!ISO_DATE_REGEX.test(dateStr)) {
      issues.push({
        field: 'assessment_date',
        message: `Invalid date format for "${dateStr}". Expected ISO format YYYY-MM-DD.`,
        severity: 'ERROR',
      });
    }
  }

  // 4. Counts & Total Validation
  const countFields = ['critical_count', 'high_count', 'medium_count', 'low_count'];
  for (const field of countFields) {
    if (data[field] === undefined || data[field] === null) {
      issues.push({
        field,
        message: `Missing required frontmatter field: "${field}"`,
        severity: 'ERROR',
      });
    } else {
      const val = Number(data[field]);
      if (!Number.isInteger(val) || val < 0) {
        issues.push({
          field,
          message: `Field "${field}" must be a non-negative integer. Got "${data[field]}".`,
          severity: 'ERROR',
        });
      }
    }
  }

  if (data.total_findings === undefined || data.total_findings === null) {
    issues.push({
      field: 'total_findings',
      message: 'Missing required frontmatter field: "total_findings"',
      severity: 'ERROR',
    });
  } else {
    const total = Number(data.total_findings);
    if (!Number.isInteger(total) || total < 0) {
      issues.push({
        field: 'total_findings',
        message: `Field "total_findings" must be a non-negative integer. Got "${data.total_findings}".`,
        severity: 'ERROR',
      });
    } else {
      const counts = ['critical_count', 'high_count', 'medium_count', 'low_count', 'informational_count']
        .map((f) => Number(data[f] ?? 0));
      if (counts.every(Number.isFinite)) {
        const countSum = counts.reduce((sum, c) => sum + c, 0);
        if (countSum !== total) {
          issues.push({
            field: 'total_findings',
            message: `total_findings (${total}) does not equal the sum of severity counts (${countSum}).`,
            severity: 'ERROR',
          });
        }
      }
    }
  }

  // 5. Risk Assessment Field & Consistency
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

    const total = Number(data.total_findings ?? 0);
    if (Number.isFinite(total)) {
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

  // 6. Security Identifiers Patterns (OWASP, CWE, ASVS, MITRE)
  const validatePatternArray = (field: string, regex: RegExp, name: string) => {
    const val = data[field];
    if (val !== undefined && val !== null) {
      if (!Array.isArray(val)) {
        issues.push({
          field,
          message: `Field "${field}" must be an array of strings.`,
          severity: 'ERROR',
        });
      } else {
        for (const item of val) {
          if (typeof item !== 'string' || !regex.test(item.trim())) {
            issues.push({
              field,
              message: `Invalid ${name} identifier format: "${item}".`,
              severity: 'ERROR',
            });
          }
        }
      }
    }
  };

  validatePatternArray('owasp_categories', OWASP_REGEX, 'OWASP');
  validatePatternArray('owasp', OWASP_REGEX, 'OWASP');
  validatePatternArray('cwe_identifiers', CWE_REGEX, 'CWE');
  validatePatternArray('cwe', CWE_REGEX, 'CWE');
  validatePatternArray('asvs_categories', ASVS_REGEX, 'ASVS');
  validatePatternArray('mitre_attack', MITRE_REGEX, 'MITRE ATT&CK');

  // 7. Export Provenance Validation
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

    if (data.source_artifacts !== undefined && (!Array.isArray(data.source_artifacts) || data.source_artifacts.length === 0 || data.source_artifacts.some((item: unknown) => typeof item !== 'string'))) {
      issues.push({
        field: 'source_artifacts',
        message: 'source_artifacts must be a non-empty array of strings.',
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

  return {
    valid: issues.filter((i) => i.severity === 'ERROR').length === 0,
    filePath,
    frontmatterPresent: true,
    metadata: data,
    issues,
  };
}
