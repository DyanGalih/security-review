/**
 * Single owner of every report-schema enum and field list.
 *
 * `docs/field-registry.md` is the human-readable contract; `test/schema-drift.test.ts`
 * fails when the registry, `docs/field-summaries.yml`, the prompts, the validator,
 * the generator, or `types.ts` disagree with the constants below.
 */

export const REVIEW_TYPES = [
  'audit',
  'branch',
  'staged',
  'plan',
  'tasks',
  'followup',
  'export',
  'verify',
] as const;

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

export const COVERAGE_OUTCOMES = [
  'reported',
  'ruled_out',
  'no_issue_found',
  'not_applicable',
  'needs_follow_up',
] as const;

/** Coverage outcomes that must carry non-empty `evidence`. */
export const COVERAGE_OUTCOMES_REQUIRING_EVIDENCE = ['ruled_out', 'not_applicable', 'needs_follow_up'] as const;

export const VERIFICATION_STATUSES = ['CONFIRMED', 'FALSE_POSITIVE', 'MITIGATED', 'ACCEPTED_RISK', 'FIX_SUGGESTION'] as const;

export const FINDING_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;

export const OVERALL_RISKS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL', 'NONE'] as const;

/** Frontmatter keys the validator rejects a report for lacking. */
export const REQUIRED_FRONTMATTER_FIELDS = [
  'document_type',
  'review_type',
  'total_findings',
  'critical_count',
  'high_count',
  'medium_count',
  'low_count',
  'overall_risk',
  'coverage_complete',
] as const;

/** Finding fields added by the closure discipline; a finding with none of them is legacy. */
export const CLOSURE_FINDING_FIELDS = [
  'confidence',
  'confidenceRationale',
  'counterevidence',
  'severityChangeConditions',
] as const;

/** Every key of a finding item, in registry order. */
export const FINDING_FIELDS = [
  'id',
  'title',
  'severity',
  'category',
  'cwe',
  'asvs',
  'mitre',
  'file',
  'lineRange',
  'description',
  'exploitScenario',
  'impact',
  'remediation',
  'proposedFix',
  'verificationStatus',
  'confidence',
  'confidenceRationale',
  'counterevidence',
  'severityChangeConditions',
  'cvssScore',
  'cvssVersion',
  'poc',
] as const;

export const COVERAGE_FIELDS = ['surface', 'riskArea', 'outcome', 'evidence'] as const;

export const WORKING_TREE_STATES = ['clean', 'dirty', 'unknown'] as const;

export const CVSS_VERSIONS = ['3.1', '4.0'] as const;

export const OWASP_REGEX = /^(A0?[1-9]|A10)(:\d{4})?(-[A-Za-z0-9_ -]+)?$/i;
export const CWE_REGEX = /^CWE-\d+$/i;
export const FINDING_CWE_REGEX = /^CWE-\d+(?::\s*.+)?$/i;
export const ASVS_REGEX = /^(?:[Vv]\d+(?:\.\d+)*|v\d+\.\d+\.\d+-\d+\.\d+\.\d+)$/;
export const MITRE_REGEX = /^T\d+(\.\d+)?$/i;

/** Caveat recorded when findings JSON does not state completeness. */
export const COMPLETENESS_NOT_RECORDED = 'completeness not recorded';
