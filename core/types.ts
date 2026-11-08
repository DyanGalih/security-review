import type { CONFIDENCE_LEVELS, COVERAGE_OUTCOMES, REVIEW_TYPES, VERIFICATION_STATUSES } from './schema.js';

export type FileSensitivity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked';
  sensitivity: FileSensitivity;
  diffSnippet?: string;
  linesAdded: number;
  linesDeleted: number;
  tags: string[];
}

export interface DiffSummary {
  baseBranch?: string;
  targetBranch?: string;
  isStaged: boolean;
  totalFiles: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  files: ChangedFile[];
  estimatedTokens: number;
}

export interface SecurityEntrypoint {
  path: string;
  type: 'route' | 'auth' | 'middleware' | 'controller' | 'model' | 'config' | 'secret' | 'general';
  sensitivity: FileSensitivity;
  description?: string;
}

export interface ValidationIssue {
  field?: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  valid: boolean;
  filePath: string;
  frontmatterPresent: boolean;
  metadata?: Record<string, unknown>;
  issues: ValidationIssue[];
}

export interface AgentContextPayload {
  format: 'markdown' | 'json';
  summary: string;
  contextHeader: string;
  content: string;
  tokenEstimate: number;
}

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type ReviewType = (typeof REVIEW_TYPES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type CoverageOutcome = (typeof COVERAGE_OUTCOMES)[number];

/** One reviewed surface and how it closed. */
export interface CoverageEntry {
  surface: string;
  riskArea: string;
  outcome: CoverageOutcome;
  /** Required for ruled_out, not_applicable, and needs_follow_up. */
  evidence?: string;
}

export interface FindingPoc {
  type?: 'test' | 'curl' | 'script' | string;
  code: string;
  reproductionSteps?: string[];
  expectedVulnerable?: string;
  expectedRemediated?: string;
}

export interface FindingItem {
  id: string; // e.g. "TASK-SEC-001" or "SEC-001"
  title: string;
  severity: FindingSeverity;
  category: string; // e.g. "A01:Broken Access Control"
  cwe?: string; // e.g. "CWE-89"
  asvs?: string;
  mitre?: string;
  file?: string;
  lineRange?: string;
  description: string;
  exploitScenario?: string;
  impact?: string;
  remediation?: string;
  proposedFix?: string;
  verificationStatus?: VerificationStatus;
  /** Calibrated confidence. Required unless the finding is legacy (has none of the closure fields). */
  confidence?: ConfidenceLevel;
  /** Required when confidence is not high: the specific gap (for example "static-only trace"). */
  confidenceRationale?: string;
  /** The strongest case against the finding, or what was checked and found absent. */
  counterevidence?: string;
  /** The single piece of evidence that would raise or lower the severity. */
  severityChangeConditions?: string;
  poc?: FindingPoc;
}

export interface FindingsReport {
  document_type?: 'security-review';
  review_type?: ReviewType;
  assessment_date?: string;
  codebase_analyzed?: string;
  total_files_analyzed?: number;
  overall_risk?: FindingSeverity | 'NONE';
  assessment_kind?: 'whitebox-review' | 'report-synthesis';
  findings: FindingItem[];
  architectural_risks?: Array<{ pattern: string; description: string }>;
  coverage?: CoverageEntry[];
  /** Absent means false, with the caveat "completeness not recorded". */
  coverage_complete?: boolean;
  /** Required and non-empty when coverage_complete is false. */
  coverage_caveats?: string[];
}
