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
