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
export type VerificationStatus = 'CONFIRMED' | 'FALSE_POSITIVE' | 'MITIGATED' | 'ACCEPTED_RISK' | 'FIX_SUGGESTION';

export interface FindingPoc {
  type?: 'test' | 'curl' | 'script' | 'playwright' | string;
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
  confidence?: number;
  poc?: FindingPoc;
}

export interface FindingsReport {
  document_type?: 'security-review';
  review_type?: 'audit' | 'staged' | 'branch' | 'plan' | 'tasks' | 'export' | 'verify' | 'followup';
  assessment_date?: string;
  codebase_analyzed?: string;
  total_files_analyzed?: number;
  total_findings?: number;
  overall_risk?: FindingSeverity | 'NONE';
  assessment_kind?: 'whitebox-review' | 'report-synthesis';
  findings: FindingItem[];
  architectural_risks?: Array<{ pattern: string; description: string }>;
  confirmed_count?: number;
  false_positive_count?: number;
  mitigated_count?: number;
  accepted_risk_count?: number;
  fix_suggestion_count?: number;
  e2e_verified?: boolean;
}
