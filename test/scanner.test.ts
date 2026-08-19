import { describe, it, expect } from 'vitest';
import { scanSecurityEntrypoints } from '../core/scanner.js';
import { join } from 'node:path';

describe('scanSecurityEntrypoints', () => {
  it('should scan directory and identify security files', async () => {
    const cwd = process.cwd();
    const entrypoints = await scanSecurityEntrypoints(cwd);

    expect(entrypoints.length).toBeGreaterThan(0);
    const hasSecurityFiles = entrypoints.some((e) => e.sensitivity === 'HIGH' || e.sensitivity === 'CRITICAL');
    expect(hasSecurityFiles).toBe(true);
  });
});
