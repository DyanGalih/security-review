import {
  CLOSURE_FINDING_FIELDS,
  COMPLETENESS_NOT_RECORDED,
  CONFIDENCE_LEVELS,
  COVERAGE_OUTCOMES,
  COVERAGE_OUTCOMES_REQUIRING_EVIDENCE,
  REVIEW_TYPES,
  VERIFICATION_STATUSES,
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

  const completeness = resolveCompleteness(base);
  if (completeness.error) errors.push(completeness.error);

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
