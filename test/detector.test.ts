import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectSDDEnvironment, resolveActiveTasksFile, resolveLatestSecurityReport, resolveLatestFindingsJson } from '../core/detector.js';

describe('SDD Environment Detector', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-detector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect generic workspace when no SDD structure exists', () => {
    const env = detectSDDEnvironment(tmpDir);
    expect(env.framework).toBe('generic');
    expect(env.workspaceDir).toBe(path.resolve(tmpDir));
    expect(resolveActiveTasksFile(tmpDir)).toBe(path.join(tmpDir, 'tasks.md'));
  });

  it('should detect OpenSpec workspace and active changes', () => {
    const changeDir = path.join(tmpDir, 'openspec/changes/feature-auth');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '# Tasks\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design\n', 'utf8');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal\n', 'utf8');

    const env = detectSDDEnvironment(tmpDir);
    expect(env.framework).toBe('openspec');
    expect(env.activeChange).toBe('feature-auth');
    expect(env.changeDir).toBe(changeDir);
    expect(env.tasksPath).toBe(path.join(changeDir, 'tasks.md'));
    expect(env.designPath).toBe(path.join(changeDir, 'design.md'));
    expect(env.specPath).toBe(path.join(changeDir, 'proposal.md'));
    expect(resolveActiveTasksFile(tmpDir)).toBe(path.join(changeDir, 'tasks.md'));
  });

  it('should ignore archive directory in OpenSpec changes', () => {
    const archiveDir = path.join(tmpDir, 'openspec/changes/archive/old-change');
    fs.mkdirSync(archiveDir, { recursive: true });

    const activeChangeDir = path.join(tmpDir, 'openspec/changes/live-change');
    fs.mkdirSync(activeChangeDir, { recursive: true });
    fs.writeFileSync(path.join(activeChangeDir, 'tasks.md'), '# Live Tasks\n', 'utf8');

    const env = detectSDDEnvironment(tmpDir);
    expect(env.framework).toBe('openspec');
    expect(env.activeChange).toBe('live-change');
  });

  it('should detect Spec-Kit workspace', () => {
    const specifyDir = path.join(tmpDir, '.specify');
    fs.mkdirSync(specifyDir, { recursive: true });
    fs.writeFileSync(path.join(specifyDir, 'tasks.md'), '# Tasks\n', 'utf8');
    fs.writeFileSync(path.join(specifyDir, 'plan.md'), '# Plan\n', 'utf8');
    fs.writeFileSync(path.join(specifyDir, 'spec.md'), '# Spec\n', 'utf8');

    const env = detectSDDEnvironment(tmpDir);
    expect(env.framework).toBe('speckit');
    expect(env.tasksPath).toBe(path.join(specifyDir, 'tasks.md'));
    expect(env.designPath).toBe(path.join(specifyDir, 'plan.md'));
    expect(env.specPath).toBe(path.join(specifyDir, 'spec.md'));
    expect(resolveActiveTasksFile(tmpDir)).toBe(path.join(specifyDir, 'tasks.md'));
  });

  it('should resolve latest security report based on date prefix and mtime', () => {
    const reportDir = path.join(tmpDir, 'docs/security-reviews');
    fs.mkdirSync(reportDir, { recursive: true });

    const olderReport = path.join(reportDir, '2026-08-10-old-report.md');
    const newerReport = path.join(reportDir, '2026-08-19-latest-report.md');

    fs.writeFileSync(olderReport, '# Old Report', 'utf8');
    fs.writeFileSync(newerReport, '# Latest Report', 'utf8');

    const resolved = resolveLatestSecurityReport(tmpDir);
    expect(resolved).toBe(newerReport);
  });

  it('should resolve latest findings.json if present', () => {
    expect(resolveLatestFindingsJson(tmpDir)).toBeUndefined();

    const findingsFile = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(findingsFile, '[]', 'utf8');

    expect(resolveLatestFindingsJson(tmpDir)).toBe(findingsFile);
  });
});
