import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateMarkdownReport, generateTasksMarkdown, appendTasksToFile, computeReportStats } from '../core/generator.js';
import { FindingItem, FindingsReport } from '../core/types.js';
import { runCli } from '../cli/index.js';

describe('Core Findings Generator & CLI commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-generator-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const mockFindings: FindingItem[] = [
    {
      id: 'TASK-SEC-001',
      title: 'SQL Injection in User Search',
      severity: 'CRITICAL',
      category: 'A05:Injection',
      cwe: 'CWE-89',
      file: 'src/api/users.ts',
      lineRange: '34-40',
      description: 'Raw query concatenated with untrusted input.',
      exploitScenario: "Attacker passes admin'-- to bypass authentication.",
      impact: 'Complete data exfiltration.',
      remediation: 'Use parameterized query builder.',
      proposedFix: 'db.query("SELECT * FROM users WHERE id = $1", [id]);',
      verificationStatus: 'CONFIRMED',
      poc: {
        type: 'typescript',
        code: 'expect(search("admin\'--")).resolves.toBeDefined();',
        reproductionSteps: ['Run test suite', 'Verify raw SQL is executed'],
      },
    },
    {
      id: 'TASK-SEC-002',
      title: 'Missing Authorization Header Check',
      severity: 'HIGH',
      category: 'A01:Broken Access Control',
      cwe: 'CWE-285',
      file: 'src/api/admin.ts',
      lineRange: '12-18',
      description: 'Admin route accessible without auth middleware.',
      remediation: 'Apply requireAdmin middleware.',
    },
  ];

  it('should compute report statistics accurately', () => {
    const stats = computeReportStats(mockFindings);
    expect(stats.total).toBe(2);
    expect(stats.critical).toBe(1);
    expect(stats.high).toBe(1);
    expect(stats.medium).toBe(0);
    expect(stats.overallRisk).toBe('CRITICAL');
    expect(stats.owaspCategories).toContain('A05');
    expect(stats.owaspCategories).toContain('A01');
    expect(stats.cweIds).toContain('CWE-89');
    expect(stats.cweIds).toContain('CWE-285');
  });

  it('should generate a valid Markdown report with YAML frontmatter', () => {
    const report: FindingsReport = {
      assessment_date: '2026-08-19',
      codebase_analyzed: 'src/api',
      total_files_analyzed: 15,
      findings: mockFindings,
      architectural_risks: [
        { pattern: 'Direct DB queries in controllers', description: 'Bypasses repository validation.' },
      ],
    };

    const markdown = generateMarkdownReport(report);
    expect(markdown).toContain('document_type: security-review');
    expect(markdown).toContain('critical_count: 1');
    expect(markdown).toContain('high_count: 1');
    expect(markdown).toContain('TASK-SEC-001: SQL Injection in User Search');
    expect(markdown).toContain('Proof of Concept (PoC)');
    expect(markdown).toContain('Direct DB queries in controllers');
  });

  it('should generate task markdown checklist items', () => {
    const tasksMd = generateTasksMarkdown(mockFindings);
    expect(tasksMd).toContain('- [ ] **TASK-SEC-001: SQL Injection in User Search**');
    expect(tasksMd).toContain('- **Severity:** CRITICAL');
    expect(tasksMd).toContain('- **Target File:** `src/api/users.ts:34-40`');
    expect(tasksMd).toContain('- [ ] **TASK-SEC-002: Missing Authorization Header Check**');
  });

  it('should append tasks to an existing file correctly', () => {
    const targetFile = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(targetFile, '# Project Tasks\n\n- [ ] Task 1\n', 'utf8');

    const tasksMd = generateTasksMarkdown(mockFindings);
    const result = appendTasksToFile(targetFile, tasksMd);
    expect(result.updated).toBe(true);

    const updated = fs.readFileSync(targetFile, 'utf8');
    expect(updated).toContain('# Project Tasks');
    expect(updated).toContain('## Security Remediation Tasks');
    expect(updated).toContain('TASK-SEC-001');
  });

  it('should execute CLI report command from JSON input file', async () => {
    const jsonPath = path.join(tmpDir, 'findings.json');
    const outReport = path.join(tmpDir, 'report.md');
    fs.writeFileSync(jsonPath, JSON.stringify(mockFindings), 'utf8');

    await runCli(['report', '--input', jsonPath, '--output', outReport]);
    expect(fs.existsSync(outReport)).toBe(true);
    const content = fs.readFileSync(outReport, 'utf8');
    expect(content).toContain('document_type: security-review');
    expect(content).toContain('TASK-SEC-001');
  });

  it('should execute CLI tasks command and append to tasks.md', async () => {
    const jsonPath = path.join(tmpDir, 'findings.json');
    const tasksPath = path.join(tmpDir, 'tasks.md');
    fs.writeFileSync(jsonPath, JSON.stringify({ findings: mockFindings }), 'utf8');
    fs.writeFileSync(tasksPath, '# Implementation Tasks\n', 'utf8');

    await runCli(['tasks', '--input', jsonPath, '--target', tasksPath, '--append']);
    const content = fs.readFileSync(tasksPath, 'utf8');
    expect(content).toContain('# Implementation Tasks');
    expect(content).toContain('TASK-SEC-001: SQL Injection in User Search');
    expect(content).toContain('TASK-SEC-002: Missing Authorization Header Check');
  });

  it('should automatically save report to docs/security-reviews/ when --output is omitted', async () => {
    const jsonPath = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      assessment_date: '2026-08-19',
      findings: mockFindings,
    }), 'utf8');

    const cwdSpy = process.cwd;
    process.cwd = () => tmpDir;
    try {
      await runCli(['report', '--input', jsonPath]);
      const defaultReportPath = path.join(tmpDir, 'docs/security-reviews/2026-08-19-security-report.md');
      expect(fs.existsSync(defaultReportPath)).toBe(true);
      const content = fs.readFileSync(defaultReportPath, 'utf8');
      expect(content).toContain('document_type: security-review');
    } finally {
      process.cwd = cwdSpy;
    }
  });
});
