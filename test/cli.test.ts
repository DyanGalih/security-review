import { describe, it, expect, vi } from 'vitest';
import { runCli } from '../cli/index.js';

describe('CLI Dispatcher', () => {
  it('should print help when no arguments provided', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCli([]);
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Security Review CLI & Agent Toolkit');
    consoleSpy.mockRestore();
  });

  it('should print version when requested', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCli(['--version']);
    expect(consoleSpy).toHaveBeenCalledWith('2.0.0');
    consoleSpy.mockRestore();
  });
});
