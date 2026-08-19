import { describe, it, expect } from 'vitest';
import { classifyFileSensitivity } from '../core/git.js';

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
