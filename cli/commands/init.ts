import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find package root (handles dev /src and compiled /dist)
function findPackageRoot(): string {
  const candidates = [
    path.join(__dirname, '..', '..', '..'),
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'commands')) && fs.existsSync(path.join(c, 'package.json'))) {
      return c;
    }
  }
  return path.join(__dirname, '..', '..');
}

export interface AgentConfig {
  dir: string;
  ext: string;
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  antigravity:    { dir: '.agent/skills',           ext: '/SKILL.md' },
  claude:         { dir: '.claude/skills',          ext: '/SKILL.md' },
  'cursor-agent': { dir: '.cursor/skills',          ext: '/SKILL.md' },
  codex:          { dir: '.codex/skills',           ext: '/SKILL.md' },
  copilot:        { dir: '.github/skills',          ext: '/SKILL.md' },
  devin:          { dir: '.devin/skills',           ext: '/SKILL.md' },
  grok:           { dir: '.grok/skills',            ext: '/SKILL.md' },
  trae:           { dir: '.trae/skills',            ext: '/SKILL.md' },
  kimi:           { dir: '.kimi-code/skills',       ext: '/SKILL.md' },
  lingma:         { dir: '.lingma/skills',          ext: '/SKILL.md' },
  zcode:          { dir: '.zcode/skills',           ext: '/SKILL.md' },
  rovodev:        { dir: '.rovodev/skills',         ext: '/SKILL.md' },
  hermes:         { dir: '.hermes/skills',          ext: '/SKILL.md' },
  opencode:       { dir: '.opencode/commands',      ext: '.md' },
  junie:          { dir: '.junie/commands',         ext: '.md' },
  amp:            { dir: '.amp/commands',           ext: '.md' },
  auggie:         { dir: '.augment/commands',       ext: '.md' },
  bob:            { dir: '.bob/commands',           ext: '.md' },
  codebuddy:      { dir: '.codebuddy/commands',     ext: '.md' },
  firebender:     { dir: '.firebender/commands',    ext: '.md' },
  forge:          { dir: '.forge/commands',         ext: '.md' },
  kilocode:       { dir: '.kilocode/workflows',     ext: '.md' },
  'kiro-cli':     { dir: '.kiro/commands',          ext: '.md' },
  omp:            { dir: '.omp/commands',           ext: '.md' },
  pi:             { dir: '.pi/commands',            ext: '.md' },
  qodercli:       { dir: '.qoder/commands',         ext: '.md' },
  qwen:           { dir: '.qwen/commands',          ext: '.md' },
  shai:           { dir: '.shai/commands',          ext: '.md' },
  vibe:           { dir: '.vibe/commands',          ext: '.md' },
  cline:          { dir: '.clinerules/workflows',   ext: '.md' },
  windsurf:       { dir: '.windsurf/workflows',     ext: '.md' },
  gemini:         { dir: '.gemini/commands',        ext: '.toml' },
  tabnine:        { dir: '.tabnine/agent/commands', ext: '.toml' },
  goose:          { dir: '.goose/recipes',          ext: '.yaml' },
};

export const COMMAND_CATALOG: Record<string, string> = {
  'security-audit':         'security-audit.md',
  'security-review-staged': 'security-review-staged.md',
  'security-review-branch': 'security-review-branch.md',
  'security-review-plan':   'security-review-plan.md',
  'security-review-tasks':  'security-review-tasks.md',
  'security-review-followup': 'security-review-followup.md',
  'security-review-apply':  'security-review-apply.md',
  'security-review-export': 'security-review-export.md',
  'security-verify':        'security-verify.md',
  'init':                   'init.md',
};

export interface InitOptions {
  yes?: boolean;
  agent?: string;
  commands?: string;
  overwrite?: 'replace' | 'skip' | 'keep-both';
}

async function ask(promptText: string, choices?: any[], multi = false): Promise<any> {
  // If non-interactive environment (redirected/piped or tests without TTY)
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (multi) {
      return choices ? choices.filter(c => c.checked).map(c => typeof c === 'string' ? c : c.value) : [];
    }
    return choices && choices.length > 0 ? (typeof choices[0] === 'string' ? choices[0] : choices[0].value) : '';
  }

  const { select, checkbox, input } = await import('@inquirer/prompts');
  const message = promptText.trim().replace(/:$/, '');

  try {
    if (choices) {
      const formattedChoices = choices.map((c) => (typeof c === 'string' ? { name: c, value: c } : c));
      if (multi) {
        return await checkbox({
          message,
          choices: formattedChoices,
        });
      } else {
        return await select({
          message,
          choices: formattedChoices,
        });
      }
    }
    return await input({ message });
  } catch (error: any) {
    if (error?.name === 'ExitPromptError' || error?.message?.includes('User force closed the prompt')) {
      console.log('\nInitialization aborted.');
      process.exit(0);
    }
    throw error;
  }
}

function getCommandPrefix(cmdKey: string): string {
  if (cmdKey === 'init') return 'sr-init';
  if (cmdKey === 'security-audit' || cmdKey === 'security-review' || cmdKey === 'audit' || cmdKey === 'review') {
    return 'sr-audit';
  }
  if (cmdKey === 'security-verify' || cmdKey === 'verify' || cmdKey === 'poc' || cmdKey === 'sr-poc') {
    return 'sr-verify';
  }
  if (cmdKey.startsWith('security-review-')) {
    return `sr-${cmdKey.replace('security-review-', '')}`;
  }
  if (cmdKey.startsWith('security-audit-')) {
    return `sr-${cmdKey.replace('security-audit-', '')}`;
  }
  return `sr-${cmdKey}`;
}

function commandDestination(cfg: AgentConfig, cmdKey: string, baseDir: string): string {
  const prefix = getCommandPrefix(cmdKey);
  if (cfg.ext === '/SKILL.md') {
    return path.join(baseDir, prefix, 'SKILL.md');
  }
  return path.join(baseDir, `${prefix}${cfg.ext}`);
}

function availableCopy(dest: string, cfg: AgentConfig, cmdKey: string, baseDir: string): string {
  const prefix = getCommandPrefix(cmdKey);
  if (cfg.ext === '/SKILL.md') {
    let candidate = path.join(baseDir, `${prefix}-2`, 'SKILL.md');
    for (let i = 2; fs.existsSync(candidate); i++) {
      candidate = path.join(baseDir, `${prefix}-${i + 1}`, 'SKILL.md');
    }
    return candidate;
  }
  const parsed = path.parse(dest);
  let candidate = path.join(parsed.dir, `${parsed.name}.security-review${parsed.ext}`);
  for (let i = 2; fs.existsSync(candidate); i++) {
    candidate = path.join(parsed.dir, `${parsed.name}.security-review-${i}${parsed.ext}`);
  }
  return candidate;
}

function installSkillMd(cmdKey: string, rawContent: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let description = `Security Review command: ${cmdKey}`;
  let cleanContent = rawContent.trim();

  const match = cleanContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (match) {
    const originalFrontmatter = match[1];
    const descMatch = originalFrontmatter.match(/^description:\s*(.*)$/m);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    cleanContent = cleanContent.substring(match[0].length).trim();
  }

  const prefix = getCommandPrefix(cmdKey);
  const frontmatter = `---
name: ${prefix}
description: ${description}
metadata:
  author: DyanGalih
  source: https://github.com/DyanGalih/security-review
---

${cleanContent}
`;
  fs.writeFileSync(dest, frontmatter, 'utf8');
}

function installMarkdown(rawContent: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, rawContent.trim() + '\n', 'utf8');
}

function installToml(cmdKey: string, rawContent: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const toml = `description = "Security Review: ${getCommandPrefix(cmdKey)}"

prompt = """
${rawContent.trim().replace(/"""/g, '\\"\\"\\"')}
"""
`;
  fs.writeFileSync(dest, toml, 'utf8');
}

function installYaml(cmdKey: string, rawContent: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const yamlQuote = (val: string) => `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;
  const prefix = getCommandPrefix(cmdKey);
  const yaml = `version: "1.0"
title: ${yamlQuote(prefix)}
description: ${yamlQuote(`Security Review: ${prefix}`)}
prompt: |2
  ${rawContent.trim().replace(/\n/g, '\n  ')}
`;
  fs.writeFileSync(dest, yaml, 'utf8');
}

export function appendAgentsMd(targetDir: string, selectedAgents: string[]): void {
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const agentList = selectedAgents
    .map((agent) => `- \`${path.join(AGENT_CONFIGS[agent]?.dir || `.${agent}/commands`, '*')}\``)
    .join('\n');

  const preamble = `

## Security Review

Use these continuous security governance rules across all code, plan, task, and review phases.
Read installed security prompts and skills at:
${agentList}

- **Mandatory Whitebox Verification**: Review all external entrypoints, SQL queries, auth flows, and cryptographic operations before production release.
- **Strict Evidence Standards**: Ensure all security reviews include ISO timestamps, canonical severity counts (CRITICAL, HIGH, MEDIUM, LOW), and OWASP / CWE identifiers.
- **Non-Destructive Execution**: Never wipe databases or execute arbitrary destructive commands.
`;

  if (fs.existsSync(agentsPath)) {
    const current = fs.readFileSync(agentsPath, 'utf8');
    if (!current.includes('## Security Review')) {
      fs.appendFileSync(agentsPath, preamble, 'utf8');
      console.log(`  ✓ Appended rules to AGENTS.md`);
    } else {
      console.log(`  → AGENTS.md already has Security Review rules, skipped`);
    }
  } else {
    fs.writeFileSync(agentsPath, preamble.trimStart(), 'utf8');
    console.log(`  ✓ Created AGENTS.md with Security Review rules`);
  }
}

export function provisionConfigTemplate(pkgRoot: string, targetDir: string): void {
  const configSource = path.join(pkgRoot, 'config-template.yml');
  const secReviewDir = path.join(targetDir, '.security-review');
  const configDest = path.join(secReviewDir, 'security-review.yml');
  const legacyDest = path.join(targetDir, 'security-review.yml');

  if (!fs.existsSync(configSource)) {
    return;
  }

  fs.mkdirSync(secReviewDir, { recursive: true });

  if (fs.existsSync(configDest)) {
    console.log(`  → .security-review/security-review.yml already exists, skipped`);
  } else if (fs.existsSync(legacyDest)) {
    fs.copyFileSync(legacyDest, configDest);
    console.log(`  ✓ Migrated config from security-review.yml to .security-review/security-review.yml`);
  } else {
    fs.copyFileSync(configSource, configDest);
    console.log(`  ✓ Created default config at .security-review/security-review.yml`);
  }
}

export async function runInitCommand(
  target: string = '.',
  options: InitOptions = {}
): Promise<{ success: boolean; installedFiles: string[] }> {
  const pkgRoot = findPackageRoot();
  const commandsDir = path.join(pkgRoot, 'commands');

  if (!fs.existsSync(commandsDir)) {
    throw new Error(`Cannot locate canonical commands directory in package at ${commandsDir}`);
  }

  const targetDir = path.resolve(process.cwd(), target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`\n🛡️  Initializing Security Review in ${targetDir}\n`);

  // Detect which agents already exist in the target directory
  const allAgentNames = Object.keys(AGENT_CONFIGS).sort();
  const detectedAgents: string[] = [];
  const undetectedAgents: string[] = [];

  for (const name of allAgentNames) {
    if (fs.existsSync(path.join(targetDir, AGENT_CONFIGS[name].dir))) {
      detectedAgents.push(name);
    } else {
      undetectedAgents.push(name);
    }
  }

  // Resolve selected agents
  let selectedAgents: string[] = [];
  if (options.agent) {
    if (options.agent.toLowerCase() === 'all') {
      selectedAgents = Object.keys(AGENT_CONFIGS);
    } else {
      selectedAgents = options.agent
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((k) => !!AGENT_CONFIGS[k]);
    }
  } else if (options.yes) {
    selectedAgents = detectedAgents.length > 0 ? detectedAgents : ['antigravity', 'claude', 'opencode'];
  } else {
    // Interactive prompt with detected agents auto-checked
    const agentChoices = [
      ...detectedAgents.map((a) => ({ name: `${a} (detected in workspace)`, value: a, checked: true })),
      ...undetectedAgents.map((a) => ({
        name: a,
        value: a,
        checked: detectedAgents.length === 0 && (a === 'antigravity' || a === 'claude'),
      })),
    ];

    selectedAgents = await ask('Select AI agent(s) to install commands for:', agentChoices, true);
    if (!selectedAgents || selectedAgents.length === 0) {
      console.log('No agents selected. Exiting.');
      return { success: false, installedFiles: [] };
    }
  }

  if (selectedAgents.length === 0) {
    selectedAgents = ['antigravity'];
  }

  // Resolve selected commands
  const allCmdKeys = Object.keys(COMMAND_CATALOG);
  let selectedCommands: string[] = [];
  if (options.commands) {
    if (options.commands.toLowerCase() === 'all') {
      selectedCommands = allCmdKeys;
    } else {
      const requested = options.commands.split(',').map((s) => s.trim());
      selectedCommands = allCmdKeys.filter((k) =>
        requested.some((r) => r === k || r === k.replace('security-review-', '') || r === k.replace('security-review', 'review'))
      );
    }
  } else if (options.yes) {
    selectedCommands = allCmdKeys;
  } else {
    const commandChoices = [
      { name: 'All Commands (Full Audit, Staged, Branch, Plan, Tasks, Apply, Followup, Export, Verify/PoC, Init)', value: 'all', checked: true },
      ...allCmdKeys.map((c) => ({ name: `${c} (/${getCommandPrefix(c)})`, value: c, checked: false })),
    ];
    const picked: string[] = await ask('Select Security Review commands to install:', commandChoices, true);
    if (!picked || picked.length === 0 || picked.includes('all')) {
      selectedCommands = allCmdKeys;
    } else {
      selectedCommands = picked;
    }
  }

  if (selectedCommands.length === 0) {
    selectedCommands = allCmdKeys;
  }

  const overwriteMode = options.overwrite || 'replace';
  const installedFiles: string[] = [];

  for (const agentKey of selectedAgents) {
    const agentCfg = AGENT_CONFIGS[agentKey];
    if (!agentCfg) continue;

    const baseAgentDir = path.join(targetDir, agentCfg.dir);
    console.log(`\n📦 Installing for agent [${agentKey}] → ${agentCfg.dir}`);

    for (const cmdKey of selectedCommands) {
      const promptFile = COMMAND_CATALOG[cmdKey];
      if (!promptFile) continue;

      const promptPath = path.join(commandsDir, promptFile);
      if (!fs.existsSync(promptPath)) continue;

      const rawContent = fs.readFileSync(promptPath, 'utf8');
      let dest = commandDestination(agentCfg, cmdKey, baseAgentDir);

      if (fs.existsSync(dest)) {
        if (overwriteMode === 'skip') {
          console.log(`  → ${getCommandPrefix(cmdKey)}: skipped (file exists)`);
          continue;
        } else if (overwriteMode === 'keep-both') {
          dest = availableCopy(dest, agentCfg, cmdKey, baseAgentDir);
        }
      }

      if (agentCfg.ext === '/SKILL.md') {
        installSkillMd(cmdKey, rawContent, dest);
      } else if (agentCfg.ext === '.md') {
        installMarkdown(rawContent, dest);
      } else if (agentCfg.ext === '.toml') {
        installToml(cmdKey, rawContent, dest);
      } else if (agentCfg.ext === '.yaml') {
        installYaml(cmdKey, rawContent, dest);
      }

      installedFiles.push(dest);
      console.log(`  ✓ ${getCommandPrefix(cmdKey)} → ${path.relative(targetDir, dest)}`);
    }
  }

  console.log('\n📄 Provisioning Project Governance Artifacts:');
  provisionConfigTemplate(pkgRoot, targetDir);
  appendAgentsMd(targetDir, selectedAgents);

  console.log('\n✅ Security Review initialization complete.\n');

  return { success: true, installedFiles };
}
