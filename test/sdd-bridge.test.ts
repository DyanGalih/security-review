import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { provisionSddChange, sanitizeChangeName, buildOpenSpecProposal } from '../core/sdd-bridge.js';
import { FindingItem } from '../core/types.js';
import { runCli } from '../cli/index.js';

describe('SDD Bridge & CLI Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-sdd-test-'));
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
      remediation: 'Use parameterized query builder.',
      proposedFix: 'db.query("SELECT * FROM users WHERE id = $1", [id]);',
      poc: {
        type: 'typescript',
        code: 'expect(search("admin\'--")).resolves.toBeDefined();',
      },
    },
  ];

  it('should sanitize change names properly', () => {
    expect(sanitizeChangeName('Fix / Auth & SQLi!')).toBe('fix-auth-sqli');
    expect(sanitizeChangeName(undefined, mockFindings)).toBe('remediate-task-sec-001-sql-injection-in-user-searc');
  });

  it('should build complete OpenSpec proposal artifacts', () => {
    const { proposalMd, specMd, designMd, tasksMd } = buildOpenSpecProposal(mockFindings, 'fix-sqli');
    expect(proposalMd).toContain('# Proposal: Security Remediation (fix-sqli)');
    expect(proposalMd).toContain('TASK-SEC-001: SQL Injection in User Search');
    expect(specMd).toContain('## 1. Requirement: Remediate TASK-SEC-001');
    expect(specMd).toContain('Acceptance Criteria');
    expect(designMd).toContain('# Technical Design: Security Remediation (fix-sqli)');
    expect(tasksMd).toContain('- [ ] **TASK-SEC-001: SQL Injection in User Search**');
  });

  it('should provision an OpenSpec change directory on disk', () => {
    const result = provisionSddChange({
      findings: mockFindings,
      workspaceDir: tmpDir,
      framework: 'openspec',
      changeName: 'fix-sqli',
    });

    expect(result.framework).toBe('openspec');
    expect(fs.existsSync(path.join(result.changePath, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(result.changePath, 'specs/remediation/spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(result.changePath, 'design.md'))).toBe(true);
    expect(fs.existsSync(path.join(result.changePath, 'tasks.md'))).toBe(true);
  });

  it('should provision a Spec-Kit change directory on disk', () => {
    const result = provisionSddChange({
      findings: mockFindings,
      workspaceDir: tmpDir,
      framework: 'speckit',
      changeName: 'fix-sqli',
    });

    expect(result.framework).toBe('speckit');
    expect(fs.existsSync(path.join(tmpDir, '.specify/specs/fix-sqli/spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.specify/plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.specify/tasks.md'))).toBe(true);
  });

  it('should execute sdd propose via CLI dispatcher', async () => {
    const jsonPath = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(jsonPath, JSON.stringify(mockFindings), 'utf8');

    // Create openspec directory so auto-detect finds it
    fs.mkdirSync(path.join(tmpDir, 'openspec'));

    const cwdSpy = process.cwd;
    process.cwd = () => tmpDir;
    try {
      await runCli(['sdd', 'propose', '--input', jsonPath, '--name', 'cli-remediation']);
      const generatedChange = path.join(tmpDir, 'openspec/changes/cli-remediation');
      expect(fs.existsSync(path.join(generatedChange, 'proposal.md'))).toBe(true);
    } finally {
      process.cwd = cwdSpy;
    }
  });

  it('should execute sdd status via CLI dispatcher', async () => {
    await runCli(['sdd', 'status', '--path', tmpDir]);
  });
});
