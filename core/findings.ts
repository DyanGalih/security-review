import {
  ASVS_REGEX,
  CLOSURE_FINDING_FIELDS,
  COMPLETENESS_NOT_RECORDED,
  CONFIDENCE_LEVELS,
  COVERAGE_OUTCOMES,
  COVERAGE_OUTCOMES_REQUIRING_EVIDENCE,
  CVSS_VERSIONS,
  CWE_REGEX,
  FINDING_CWE_REGEX,
  FINDING_SEVERITIES,
  MITRE_REGEX,
  OVERALL_RISKS,
  REVIEW_TYPES,
  VERIFICATION_STATUSES,
  WORKING_TREE_STATES,
} from './schema.js';
import type { CoverageEntry, FindingItem, FindingsReport } from './types.js';

/** Thrown when findings JSON cannot be accepted. Every problem is listed; nothing is reported twice. */
export class FindingsValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`Findings JSON failed validation (${errors.length} error${errors.length === 1 ? '' : 's'})`);
    this.name = 'FindingsValidationError';
    this.errors = errors;
  }
}

export interface ParsedFindings {
  report: FindingsReport;
  /** Non-fatal notes, one per missing legacy field class. */
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function oneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** A finding is legacy when it carries none of the closure fields. */
export function isLegacyFinding(
  finding: Partial<Record<(typeof CLOSURE_FINDING_FIELDS)[number], unknown>>
): boolean {
  return CLOSURE_FINDING_FIELDS.every((field) => finding[field] === undefined);
}

function validateFinding(finding: Record<string, unknown>, label: string, errors: string[]): void {
  if (!isNonEmptyString(finding.id)) {
    errors.push(`${label}: id is required`);
  }
  if (!isNonEmptyString(finding.title)) {
    errors.push(`${label}: title is required`);
  }
  if (!oneOf(FINDING_SEVERITIES, typeof finding.severity === 'string' ? finding.severity.toUpperCase() : finding.severity)) {
    errors.push(`${label}: severity must be one of ${FINDING_SEVERITIES.join(', ')}`);
  }
  if (!isNonEmptyString(finding.category)) {
    errors.push(`${label}: category is required`);
  }
  if (!isNonEmptyString(finding.description)) {
    errors.push(`${label}: description is required`);
  }
  if (finding.cwe !== undefined && (typeof finding.cwe !== 'string' || !FINDING_CWE_REGEX.test(finding.cwe))) {
    errors.push(`${label}: cwe must match CWE pattern (e.g. CWE-89 or CWE-89: SQL Injection)`);
  }
  if (finding.asvs !== undefined && (typeof finding.asvs !== 'string' || !ASVS_REGEX.test(finding.asvs))) {
    errors.push(`${label}: asvs must match ASVS requirement pattern (e.g. v5.0.0-1.2.5 or V2.1.1)`);
  }
  if (finding.mitre !== undefined && (typeof finding.mitre !== 'string' || !MITRE_REGEX.test(finding.mitre))) {
    errors.push(`${label}: mitre must match MITRE ATT&CK technique pattern (e.g. T1190)`);
  }
  if (finding.cvssScore !== undefined && !isNonEmptyString(finding.cvssScore)) {
    errors.push(`${label}: cvssScore must be a non-empty string`);
  }
  if (finding.cvssVersion !== undefined && !oneOf(CVSS_VERSIONS, finding.cvssVersion)) {
    errors.push(`${label}: cvssVersion must be 3.1 or 4.0`);
  }
  if (finding.cvssScore !== undefined && finding.cvssVersion === undefined) {
    errors.push(`${label}: cvssVersion is required when cvssScore is present`);
  }

  if (finding.verificationStatus !== undefined && !oneOf(VERIFICATION_STATUSES, finding.verificationStatus)) {
    errors.push(`${label}: verificationStatus must be one of ${VERIFICATION_STATUSES.join(', ')}`);
  }

  if (isLegacyFinding(finding)) return;

  if (!oneOf(CONFIDENCE_LEVELS, finding.confidence)) {
    errors.push(`${label}: confidence must be one of ${CONFIDENCE_LEVELS.join(', ')}`);
  } else if (finding.confidence !== 'high' && !isNonEmptyString(finding.confidenceRationale)) {
    errors.push(`${label}: confidenceRationale is required when confidence is ${finding.confidence}`);
  }
  if (!isNonEmptyString(finding.counterevidence)) {
    errors.push(`${label}: counterevidence is required`);
  }
  if (!isNonEmptyString(finding.severityChangeConditions)) {
    errors.push(`${label}: severityChangeConditions is required`);
  }
}

function validateCoverage(coverage: unknown, errors: string[]): void {
  if (coverage === undefined) return;
  if (!Array.isArray(coverage)) {
    errors.push('coverage: must be an array');
    return;
  }
  coverage.forEach((entry, index) => {
    const label = `coverage[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label}: must be an object`);
      return;
    }
    const surface = isNonEmptyString(entry.surface) ? entry.surface : undefined;
    if (!surface) errors.push(`${label}: surface is required`);
    if (!isNonEmptyString(entry.riskArea)) errors.push(`${label}: riskArea is required`);
    if (!oneOf(COVERAGE_OUTCOMES, entry.outcome)) {
      errors.push(`${label}: outcome must be one of ${COVERAGE_OUTCOMES.join(', ')}`);
    } else if (
      (COVERAGE_OUTCOMES_REQUIRING_EVIDENCE as readonly string[]).includes(entry.outcome) &&
      !isNonEmptyString(entry.evidence)
    ) {
      errors.push(`${label}${surface ? ` (${surface})` : ''}: evidence is required for outcome ${entry.outcome}`);
    }
  });
}

/**
 * Resolves completeness as the report must state it: absent means incomplete with the
 * "completeness not recorded" caveat. Returns an error message when the input is contradictory.
 */
export function resolveCompleteness(report: {
  coverage_complete?: unknown;
  coverage_caveats?: unknown;
}): { complete: boolean; caveats: string[]; error?: string } {
  const { coverage_complete: complete, coverage_caveats: caveats } = report;

  if (complete === undefined) {
    return { complete: false, caveats: [COMPLETENESS_NOT_RECORDED] };
  }
  if (typeof complete !== 'boolean') {
    return { complete: false, caveats: [], error: 'coverage_complete: must be true or false' };
  }
  if (caveats !== undefined && (!Array.isArray(caveats) || !caveats.every(isNonEmptyString))) {
    return { complete, caveats: [], error: 'coverage_caveats: must be a list of non-empty strings' };
  }
  const list = (caveats as string[] | undefined) ?? [];
  if (!complete && list.length === 0) {
    return { complete, caveats: [], error: 'coverage_caveats: required and non-empty when coverage_complete is false' };
  }
  return { complete, caveats: list };
}

/**
 * Parses and validates findings JSON (an array of findings or a report object).
 * The one loader every command uses; `cli/` decides what to print and how to exit.
 */
export function parseFindingsReport(raw: string): ParsedFindings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new FindingsValidationError([`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`]);
  }

  const errors: string[] = [];
  let base: Record<string, unknown>;
  if (Array.isArray(parsed)) {
    base = { findings: parsed };
  } else if (isRecord(parsed)) {
    base = parsed;
  } else {
    throw new FindingsValidationError(['Expected an array of findings or a findings report object']);
  }

  if (!Array.isArray(base.findings)) {
    throw new FindingsValidationError(['findings: must be an array']);
  }

  const legacyMissing = new Set<string>();
  base.findings.forEach((finding, index) => {
    if (!isRecord(finding)) {
      errors.push(`findings[${index}]: must be an object`);
      return;
    }
    const label = `findings[${index}]${isNonEmptyString(finding.id) ? ` (${finding.id})` : ''}`;
    if (isLegacyFinding(finding)) {
      for (const field of CLOSURE_FINDING_FIELDS) legacyMissing.add(field);
    }
    validateFinding(finding, label, errors);
  });

  validateCoverage(base.coverage, errors);

  if (base.review_type !== undefined && !oneOf(REVIEW_TYPES, base.review_type)) {
    errors.push(`review_type: must be one of ${REVIEW_TYPES.join(', ')}`);
  }

  if (base.overall_risk !== undefined && !oneOf(OVERALL_RISKS, typeof base.overall_risk === 'string' ? base.overall_risk.toUpperCase() : base.overall_risk)) {
    errors.push(`overall_risk: must be one of ${OVERALL_RISKS.join(', ')}`);
  }

  const completeness = resolveCompleteness(base);
  if (completeness.error) errors.push(completeness.error);

  const validateStringArray = (field: string, regex?: RegExp, name?: string) => {
    if (base[field] === undefined) return;
    if (!Array.isArray(base[field])) {
      errors.push(`${field}: must be an array`);
      return;
    }
    base[field].forEach((item: unknown, idx: number) => {
      if (!isNonEmptyString(item)) {
        errors.push(`${field}[${idx}]: must be a non-empty string`);
      } else if (regex && !regex.test(item)) {
        errors.push(`${field}[${idx}]: "${item}" does not match ${name ?? field} pattern`);
      }
    });
  };

  validateStringArray('asvs_requirements', ASVS_REGEX, 'ASVS');
  validateStringArray('mitre_techniques', MITRE_REGEX, 'MITRE ATT&CK');
  validateStringArray('cwe_ids', CWE_REGEX, 'CWE');
  validateStringArray('exclusions');
  validateStringArray('unreadable_areas');
  validateStringArray('source_artifacts');

  if (base.assessment_narrative !== undefined && typeof base.assessment_narrative !== 'string') {
    errors.push('assessment_narrative: must be a string');
  }
  if (base.untracked_files_included !== undefined && typeof base.untracked_files_included !== 'boolean') {
    errors.push('untracked_files_included: must be a boolean');
  }
  if (base.working_tree_state !== undefined && !oneOf(WORKING_TREE_STATES, base.working_tree_state)) {
    errors.push(`working_tree_state: must be one of ${WORKING_TREE_STATES.join(', ')}`);
  }
  if (base.reviewed_commit !== undefined && typeof base.reviewed_commit !== 'string') {
    errors.push('reviewed_commit: must be a string');
  }
  if (base.reviewed_branch !== undefined && typeof base.reviewed_branch !== 'string') {
    errors.push('reviewed_branch: must be a string');
  }
  if (base.commit_or_branch !== undefined && typeof base.commit_or_branch !== 'string') {
    errors.push('commit_or_branch: must be a string');
  }
  if (base.asvs_version !== undefined && (typeof base.asvs_version !== 'string' || (base.asvs_version !== 'unknown' && !/^\d+\.\d+\.\d+$/.test(base.asvs_version)))) {
    errors.push('asvs_version: must be a semantic version such as 5.0.0, or unknown');
  }
  if (base.cvss_version !== undefined && !oneOf(CVSS_VERSIONS, base.cvss_version)) {
    errors.push(`cvss_version: must be one of ${CVSS_VERSIONS.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new FindingsValidationError(errors);
  }

  const warnings = [...legacyMissing].map(
    (field) => `${field} not recorded on legacy finding(s); rendered as "not recorded"`
  );

  const report: FindingsReport = {
    ...(base as Omit<FindingsReport, 'findings'>),
    findings: base.findings as FindingItem[],
    coverage: base.coverage as CoverageEntry[] | undefined,
    coverage_complete: completeness.complete,
    coverage_caveats: completeness.caveats,
  };

  return { report, warnings };
}
