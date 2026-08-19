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
    const antigravitySkill = path.join(tmpDir, '.agent/skills/sr-audit/SKILL.md');
    expect(fs.existsSync(antigravitySkill)).toBe(true);
    const agContent = fs.readFileSync(antigravitySkill, 'utf8');
    expect(agContent).toContain('name: sr-audit');
    expect(agContent).toContain('author: DyanGalih');

    // Verify Claude skills
    const claudeSkill = path.join(tmpDir, '.claude/skills/sr-staged/SKILL.md');
    expect(fs.existsSync(claudeSkill)).toBe(true);

    // Verify OpenCode markdown command
    const opencodeCmd = path.join(tmpDir, '.opencode/commands/sr-audit.md');
    expect(fs.existsSync(opencodeCmd)).toBe(true);

    // Verify configuration template
    const configDest = path.join(tmpDir, '.security-review', 'security-review.yml');
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
      commands: 'security-audit,init',
    });
    expect(result.success).toBe(true);

    const geminiCmd = path.join(tmpDir, '.gemini/commands/sr-audit.toml');
    expect(fs.existsSync(geminiCmd)).toBe(true);
    const geminiContent = fs.readFileSync(geminiCmd, 'utf8');
    expect(geminiContent).toContain('description = "Security Review: sr-audit"');
    expect(geminiContent).toContain('prompt = """');

    const gooseCmd = path.join(tmpDir, '.goose/recipes/sr-audit.yaml');
    expect(fs.existsSync(gooseCmd)).toBe(true);
    const gooseContent = fs.readFileSync(gooseCmd, 'utf8');
    expect(gooseContent).toContain('title: "sr-audit"');
  });

  it('should respect overwrite=skip mode', async () => {
    const skillPath = path.join(tmpDir, '.agent/skills/sr-audit/SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, 'CUSTOM_CONTENT', 'utf8');

    await runInitCommand(tmpDir, {
      yes: true,
      agent: 'antigravity',
      commands: 'security-audit',
      overwrite: 'skip',
    });

    expect(fs.readFileSync(skillPath, 'utf8')).toBe('CUSTOM_CONTENT');
  });

  it('should respect overwrite=keep-both mode', async () => {
    const skillPath = path.join(tmpDir, '.agent/skills/sr-audit/SKILL.md');
    fs.mkdirSync(path.dirname(skillPath), { recursive: true });
    fs.writeFileSync(skillPath, 'CUSTOM_CONTENT', 'utf8');

    await runInitCommand(tmpDir, {
      yes: true,
      agent: 'antigravity',
      commands: 'security-audit',
      overwrite: 'keep-both',
    });

    expect(fs.readFileSync(skillPath, 'utf8')).toBe('CUSTOM_CONTENT');
    const duplicatePath = path.join(tmpDir, '.agent/skills/sr-audit-2/SKILL.md');
    expect(fs.existsSync(duplicatePath)).toBe(true);
  });

  it('should execute init command from CLI dispatcher', async () => {
    await runCli(['init', tmpDir, '--yes', '--agent', 'opencode', '--commands', 'security-review-staged']);
    const stagedCmd = path.join(tmpDir, '.opencode/commands/sr-staged.md');
    expect(fs.existsSync(stagedCmd)).toBe(true);
  });

  it('should install security-verify skill as sr-verify', async () => {
    await runCli(['init', tmpDir, '--yes', '--agent', 'antigravity', '--commands', 'security-verify']);
    const verifySkill = path.join(tmpDir, '.agent/skills/sr-verify/SKILL.md');
    expect(fs.existsSync(verifySkill)).toBe(true);
    const content = fs.readFileSync(verifySkill, 'utf8');
    expect(content).toContain('name: sr-verify');
    expect(content).toContain('Proof of Concept');
  });

  it('should migrate legacy root security-review.yml to .security-review/security-review.yml', async () => {
    const legacyConfig = path.join(tmpDir, 'security-review.yml');
    fs.writeFileSync(legacyConfig, 'custom_rule: true\n', 'utf8');

    await runInitCommand(tmpDir, { yes: true });
    const newConfig = path.join(tmpDir, '.security-review', 'security-review.yml');
    expect(fs.existsSync(newConfig)).toBe(true);
    expect(fs.readFileSync(newConfig, 'utf8')).toContain('custom_rule: true');
  });
});
