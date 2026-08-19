import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInitCommand } from '../cli/commands/init.js';
import { runCli } from '../cli/index.js';

describe('Security Review init command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-init-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should initialize default agents in non-interactive --yes mode', async () => {
    const result = await runInitCommand(tmpDir, { yes: true });
    expect(result.success).toBe(true);

    // Verify Antigravity skills
    const antigravitySkill = path.join(tmpDir, '.agent/skills/sr-review/SKILL.md');
    expect(fs.existsSync(antigravitySkill)).toBe(true);
    const agContent = fs.readFileSync(antigravitySkill, 'utf8');
    expect(agContent).toContain('name: sr-review');
    expect(agContent).toContain('author: DyanGalih');

    // Verify Claude skills
    const claudeSkill = path.join(tmpDir, '.claude/skills/sr-staged/SKILL.md');
    expect(fs.existsSync(claudeSkill)).toBe(true);

    // Verify OpenCode markdown command
    const opencodeCmd = path.join(tmpDir, '.opencode/commands/sr-review.md');
    expect(fs.existsSync(opencodeCmd)).toBe(true);

    // Verify configuration template
    const configDest = path.join(tmpDir, 'security-review.yml');
    expect(fs.existsSync(configDest)).toBe(true);

    // Verify AGENTS.md
    const agentsMd = path.join(tmpDir, 'AGENTS.md');
    expect(fs.existsSync(agentsMd)).toBe(true);
    const agentsContent = fs.readFileSync(agentsMd, 'utf8');
    expect(agentsContent).toContain('## Security Review');
  });

  it('should support TOML format for Gemini and YAML format for Goose', async () => {
    const result = await runInitCommand(tmpDir, {
      yes: true,
      agent: 'gemini,goose',
      commands: 'security-review,init',
    });
    expect(result.success).toBe(true);

    const geminiCmd = path.join(tmpDir, '.gemini/commands/sr-review.toml');
    expect(fs.existsSync(geminiCmd)).toBe(true);
    const geminiContent = fs.readFileSync(geminiCmd, 'utf8');
    expect(geminiContent).toContain('description = "Security Review: sr-review"');
    expect(geminiContent).toContain('prompt = """');

    const gooseCmd = path.join(tmpDir, '.goose/recipes/sr-review.yaml');
    expect(fs.existsSync(gooseCmd)).toBe(true);
    const gooseContent = fs.readFileSync(gooseCmd, 'utf8');
    expect(gooseContent).toContain('title: "sr-review"');
  });

  it('should respect overwrite=skip mode', async () => {
    const skillPath = path.join(tmpDir, '.agent/skills/sr-review/SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, 'CUSTOM_CONTENT', 'utf8');

    await runInitCommand(tmpDir, {
      yes: true,
      agent: 'antigravity',
      commands: 'security-review',
      overwrite: 'skip',
    });

    expect(fs.readFileSync(skillPath, 'utf8')).toBe('CUSTOM_CONTENT');
  });

  it('should respect overwrite=keep-both mode', async () => {
    const skillPath = path.join(tmpDir, '.agent/skills/sr-review/SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, 'CUSTOM_CONTENT', 'utf8');

    await runInitCommand(tmpDir, {
      yes: true,
      agent: 'antigravity',
      commands: 'security-review',
      overwrite: 'keep-both',
    });

    expect(fs.readFileSync(skillPath, 'utf8')).toBe('CUSTOM_CONTENT');
    const duplicatePath = path.join(tmpDir, '.agent/skills/sr-review-2/SKILL.md');
    expect(fs.existsSync(duplicatePath)).toBe(true);
  });

  it('should execute init command from CLI dispatcher', async () => {
    await runCli(['init', tmpDir, '--yes', '--agent', 'opencode', '--commands', 'security-review-staged']);
    const stagedCmd = path.join(tmpDir, '.opencode/commands/sr-staged.md');
    expect(fs.existsSync(stagedCmd)).toBe(true);
  });
});
