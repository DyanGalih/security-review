import { describe, it, expect } from 'vitest';
import { classifyFileSensitivity, getGitDiffSummary } from '../core/git.js';
import { formatDiffForAgent } from '../core/formatter.js';
import type { DiffSummary } from '../core/types.js';

describe('classifyFileSensitivity', () => {
  it('should classify environment files and secrets as CRITICAL', () => {
    const res1 = classifyFileSensitivity('.env.production');
    expect(res1.sensitivity).toBe('CRITICAL');
    expect(res1.tags).toContain('secret-or-payment');

    const res2 = classifyFileSensitivity('src/config/jwt-secret.ts');
    expect(res2.sensitivity).toBe('CRITICAL');
  });

  it('should classify auth and migrations as HIGH', () => {
    const res1 = classifyFileSensitivity('src/auth/login.controller.ts');
    expect(res1.sensitivity).toBe('HIGH');
    expect(res1.tags).toContain('auth-or-persistence');

    const res2 = classifyFileSensitivity('src/db/migrations/001_users.sql');
    expect(res2.sensitivity).toBe('HIGH');
  });

  it('should classify general API routes and controllers as MEDIUM', () => {
    const res = classifyFileSensitivity('src/api/products.controller.ts');
    expect(res.sensitivity).toBe('MEDIUM');
    expect(res.tags).toContain('api-or-business-logic');
  });

  it('should classify markdown and doc files as LOW', () => {
    const res = classifyFileSensitivity('README.md');
    expect(res.sensitivity).toBe('LOW');
  });
});

describe('formatDiffForAgent with token budgeting', () => {
  const mockDiff: DiffSummary = {
    isStaged: true,
    totalFiles: 6,
    criticalCount: 2,
    highCount: 2,
    mediumCount: 1,
    lowCount: 1,
    estimatedTokens: 800,
    files: [
      { path: 'README.md', status: 'modified', sensitivity: 'LOW', linesAdded: 10, linesDeleted: 5, tags: ['docs'] },
      { path: '.env', status: 'modified', sensitivity: 'CRITICAL', linesAdded: 2, linesDeleted: 1, tags: ['secret'] },
      { path: 'secrets.json', status: 'modified', sensitivity: 'CRITICAL', linesAdded: 5, linesDeleted: 0, tags: ['secret'] },
      { path: 'src/auth/jwt.ts', status: 'modified', sensitivity: 'HIGH', linesAdded: 20, linesDeleted: 10, tags: ['auth'] },
      { path: 'src/auth/rbac.ts', status: 'modified', sensitivity: 'HIGH', linesAdded: 15, linesDeleted: 5, tags: ['auth'] },
      { path: 'src/api/routes.ts', status: 'modified', sensitivity: 'MEDIUM', linesAdded: 15, linesDeleted: 5, tags: ['api'] },
    ],
  };

  it('should prioritize CRITICAL and HIGH files when budget is tight', () => {
    // Setting budget to 180 will include top 2 CRITICAL files and omit lower priority ones
    const payload = formatDiffForAgent(mockDiff, { maxTokenBudget: 180 });
    expect(payload.content).toContain('.env');
    expect(payload.content).toContain('secrets.json');
    expect(payload.content).not.toContain('README.md');
    expect(payload.content).not.toContain('src/api/routes.ts');
    expect(payload.tokenEstimate).toBeLessThanOrEqual(185);
  });

  it('should reject non-positive or NaN token budgets', () => {
    expect(() => formatDiffForAgent(mockDiff, { maxTokenBudget: -10 })).toThrow(/Invalid token budget/);
    expect(() => formatDiffForAgent(mockDiff, { maxTokenBudget: 0 })).toThrow(/Invalid token budget/);
  });
});
