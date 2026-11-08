import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../cli/index.js';

/**
 * The CLI owns exit codes; core only returns data or throws. These tests pin the contract:
 * invalid findings JSON exits 1 with each error on stderr, legacy findings warn and exit 0.
 */
describe('CLI findings loading contract', () => {
  let tmpDir: string;
  let stderr: string[];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-cli-findings-'));
    stderr = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      stderr.push(args.map(String).join(' '));
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('report exits 1 and names the finding and field when confidence lacks a rationale', async () => {
    const input = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(
      input,
      JSON.stringify([
        {
          id: 'SEC-007',
          title: 't',
          severity: 'HIGH',
          category: 'A01',
          description: 'd',
          confidence: 'medium',
          counterevidence: 'checked',
          severityChangeConditions: 'none',
        },
      ])
    );

    await expect(runCli(['report', '--input', input, '--output', path.join(tmpDir, 'out.md')])).rejects.toThrow(
      'process.exit(1)'
    );
    expect(stderr.some((line) => line.includes('SEC-007') && line.includes('confidenceRationale'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'out.md'))).toBe(false);
  });

  it('tasks and sdd propose reject the same invalid input through the shared loader', async () => {
    const input = path.join(tmpDir, 'findings.json');
    fs.writeFileSync(input, JSON.stringify({ findings: [null] }));

    await expect(runCli(['tasks', '--input', input])).rejects.toThrow('process.exit(1)');
    expect(stderr.some((line) => line.includes('[tasks error]') && line.includes('findings[0]'))).toBe(true);

    stderr.length = 0;
    await expect(runCli(['sdd', 'propose', '--input', input, '--target', tmpDir])).rejects.toThrow('process.exit(1)');
    expect(stderr.some((line) => line.includes('[sdd propose error]') && line.includes('findings[0]'))).toBe(true);
  });

  it('report renders legacy findings with one warning per absent field class and exits 0', async () => {
    const input = path.join(tmpDir, 'findings.json');
    const output = path.join(tmpDir, 'out.md');
    fs.writeFileSync(
      input,
      JSON.stringify([{ id: 'SEC-001', title: 'legacy', severity: 'LOW', category: 'A05', description: 'd' }])
    );

    await runCli(['report', '--input', input, '--output', output]);

    const warnings = stderr.filter((line) => line.startsWith('[report warning]'));
    expect(warnings).toHaveLength(4);
    expect(warnings.some((line) => line.includes('confidence not recorded'))).toBe(true);
    const rendered = fs.readFileSync(output, 'utf8');
    expect(rendered).toContain('#### Confidence\nnot recorded');
    expect(rendered).toContain('coverage_complete: false');
  });
});
