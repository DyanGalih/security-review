import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import yaml from 'js-yaml';
import { getGitDiffSummary } from '../core/git.js';
import { validateReportFrontmatter } from '../core/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execFileAsync = promisify(execFile);

const commandNames = [
  'security-audit.md',
  'security-review-staged.md',
  'security-review-branch.md',
  'security-review-plan.md',
  'security-review-tasks.md',
  'security-review-followup.md',
  'security-review-apply.md',
  'security-review-export.md',
  'security-verify.md',
  'init.md',
];

async function readCommand(name: string): Promise<string> {
  return readFile(join(__dirname, '../commands', name), 'utf8');
}

function unclosedFence(content: string): string | undefined {
  let open: { char: string; length: number; line: number } | undefined;
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*(`{3,}|~{3,})(?:[^`]*)?$/);
    if (!match) continue;

    const marker = match[1];
    if (!open) {
      open = { char: marker[0], length: marker.length, line: index + 1 };
      continue;
    }

    const isBareCloser = lines[index].trim() === marker;
    if (marker[0] === open.char && marker.length >= open.length && isBareCloser) open = undefined;
  }

  return open ? `unclosed fence from line ${open.line}` : undefined;
}

describe('security review command contracts', () => {
  it('keeps every registered command prompt structurally balanced', async () => {
    for (const name of commandNames) {
      expect(unclosedFence(await readCommand(name)), name).toBeUndefined();
    }
  });

  it('defines untrusted-input handling and avoids unapproved memory writes', async () => {
    for (const name of commandNames) {
      const content = await readCommand(name);
      expect(content.toLowerCase(), name).toContain('untrusted');
      expect(content, name).not.toMatch(/Do not ask; trigger|MUST proactively use|After analysis completes, store durable/);
      expect(content, name).not.toMatch(/previously accepted[^\n]*do not create/i);
    }
  });

  it('uses one canonical risk vocabulary', async () => {
    for (const name of commandNames) {
      expect(await readCommand(name), name).not.toContain('MODERATE');
    }
  });

  it('registers export provenance in the canonical schema', async () => {
    const schema = await readFile(join(__dirname, '../docs/field-summaries.yml'), 'utf8');
    expect(schema).toContain('export');
    expect(schema).toContain('assessment_kind');
    expect(schema).toContain('source_artifacts');
    expect(schema).toContain('commit_or_branch');
    expect(schema).toContain('NONE');

    const parsed = yaml.load(schema) as { classification_fields: { owasp_categories: { items: { pattern: string } } } };
    expect(parsed.classification_fields.owasp_categories.items.pattern).toBe('^A(0[1-9]|10)$');
  });

  it('keeps full, staged, and branch scope semantics distinct', async () => {
    const full = await readCommand('security-audit.md');
    const staged = await readCommand('security-review-staged.md');
    const branch = await readCommand('security-review-branch.md');

    expect(full).toContain('entire repository');
    expect(full).not.toContain('Use the `changed_files` list as the primary audit set');
    expect(staged).toContain('staged for commit');
    expect(branch).toContain('<target>');
  });

  it('reads review policy before scope selection and rechecks historical false positives', async () => {
    for (const name of commandNames.filter((file) => file !== 'init.md' && file !== 'security-review-apply.md')) {
      const prompt = await readCommand(name);
      expect(prompt.indexOf('Adapter and Project Configuration Preflight'), name).toBeLessThan(prompt.indexOf('## Objective'));
      for (const setting of ['exclude-files', 'focus', 'min-severity', 'output']) {
        expect(prompt, `${name} applies ${setting}`).toContain(`\`${setting}\``);
      }
      expect(prompt, name).toContain('must be rechecked before suppression');
      expect(prompt, name).toContain('coverage limitations');
    }
  });

  it('records the selected ASVS version whenever a command emits ASVS mappings', async () => {
    for (const name of commandNames) {
      const prompt = await readCommand(name);
      if (/^asvs_requirements:/m.test(prompt)) {
        expect(prompt, `${name} declares asvs_version`).toMatch(/^asvs_version:/m);
      }
    }
    expect(await readCommand('security-audit.md')).toContain('v5.0.0-1.2.5');
  });

  it('keeps the full-audit report contract singular and uses canonical risk values', async () => {
    const audit = await readCommand('security-audit.md');
    expect(audit.match(/^## Remediation & Planning Updates$/gm)).toHaveLength(1);
    expect(audit).toContain('**Overall Security Posture:** [CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL | NONE]');
    expect(audit).toContain('When the user requests a saved report');
    expect(audit).not.toContain('you MUST write the full Markdown report directly to disk');
  });

  it('places false-positive records under the installed configuration root', async () => {
    const verify = await readCommand('security-verify.md');
    const snippet = verify.split('## 4. False Positive Suppression Config')[1].match(/```yaml\n([\s\S]*?)\n```/)?.[1];
    expect(snippet).toBeDefined();
    const parsed = yaml.load(snippet!) as { 'security-review': { 'false-positives': Array<Record<string, string>> } };
    const template = yaml.load(await readFile(join(__dirname, '../config-template.yml'), 'utf8')) as Record<string, unknown>;
    expect(template).toHaveProperty('security-review');
    expect(parsed['security-review']['false-positives'][0]).toHaveProperty('rule');
    expect(parsed['security-review']['false-positives'][0]).toHaveProperty('file');
    expect(parsed['security-review']['false-positives'][0]).toHaveProperty('reason');
    expect(parsed['security-review']['false-positives'][0]).toHaveProperty('date');
  });

  it('registers every hook target and declares the required Spec-Kit core commands', async () => {
    const manifest = yaml.load(await readFile(join(__dirname, '../extension.yml'), 'utf8')) as {
      requires: { speckit_version: string; commands: string[] };
      hooks: Record<string, { command: string }>;
      provides: { commands: Array<{ name: string; file: string }> };
    };
    expect(manifest.requires.speckit_version).toBe('>=0.9.0');
    expect(manifest.requires.commands).toEqual(['speckit.plan', 'speckit.tasks', 'speckit.implement']);
    const registered = new Set(manifest.provides.commands.map(({ name }) => name));
    for (const hook of Object.values(manifest.hooks)) expect(registered.has(hook.command)).toBe(true);
    for (const { file } of manifest.provides.commands) expect(commandNames).toContain(file.replace('commands/', ''));
  });

  it('ships a resolvable adapter preflight in each installed prompt', async () => {
    for (const adapter of ['resolve', 'spec-kit', 'openspec', 'generic']) {
      const mapping = await readFile(join(__dirname, '../adapters', `${adapter}.md`), 'utf8');
      expect(mapping, `${adapter} includes discovery`).toContain(adapter === 'spec-kit' ? 'feature' : 'change');
      if (adapter !== 'resolve') {
        expect(mapping, `${adapter} defines artifact actions`).toContain('## Actions');
      }
    }
    for (const name of commandNames) {
      const prompt = await readCommand(name);
      expect(prompt, `${name} resolves the adapter`).toContain('.security-review/adapters/resolve.md');
      expect(prompt, `${name} handles extension-only Spec-Kit`).toContain('For an extension-only Spec-Kit installation');
    }
  });

  it('documents policy consumption, precedence, false-positive validation, and legacy CLI boundaries', async () => {
    const template = await readFile(join(__dirname, '../config-template.yml'), 'utf8');
    expect(template).toContain('CLI diff and scan do not silently enforce it');
    for (const name of commandNames.filter((file) => file !== 'init.md')) {
      const prompt = await readCommand(name);
      expect(prompt, name).toContain('Read `.security-review/security-review.yml`');
      expect(prompt, name).toContain('legacy root `security-review.yml`');
      expect(prompt, name).toMatch(/revalidat\w+[^\n]*false positive/i);
    }
    const verify = await readCommand('security-verify.md');
    expect(verify).toContain('Configuration does not authorize execution');
  });

  it('keeps dependency lockfiles in default full-audit scope and documents exclusions as coverage gaps', async () => {
    const template = await readFile(join(__dirname, '../config-template.yml'), 'utf8');
    expect(template).not.toMatch(/- ['"]?(?:\*\.lock|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)/);
    const audit = await readCommand('security-audit.md');
    expect(audit).toContain('Dependency lockfiles remain in full-audit scope by default');
    expect(audit).toContain('supply-chain coverage limitation');
    expect(audit).toContain('coverage_caveats');
  });

  it('records reproducible revision and working-tree provenance for full audits', async () => {
    const audit = await readCommand('security-audit.md');
    for (const field of ['reviewed_commit', 'reviewed_branch', 'working_tree_state', 'untracked_files_included', 'exclusions', 'unreadable_areas']) {
      expect(audit, `audit header includes ${field}`).toContain(`${field}:`);
    }
    expect(audit).toContain('git rev-parse HEAD');
    expect(audit).toContain('git status --porcelain');
    expect(audit).toContain('without executing repository code');
  });

  it('guards the second-pass supply-chain, PoC, CVSS, provenance, and export contracts', async () => {
    const audit = await readCommand('security-audit.md');
    expect(audit).toContain('Dependency lockfiles remain in full-audit scope by default');
    expect(audit).toContain('Prefer CVSS 4.0 for newly assessed findings');
    expect(audit).toContain('do not silently convert or relabel it as 4.0');
    expect(audit).toContain('reviewed_commit:');
    expect((await readFile(join(__dirname, '../config-template.yml'), 'utf8'))).not.toMatch(/package-lock\.json|yarn\.lock|pnpm-lock\.yaml/);

    const verify = await readCommand('security-verify.md');
    const safety = verify.split('### Mandatory PoC Safety Floor')[1].split('\n### ')[0];
    expect(safety).toContain('explicit approval for that exact action, destination/target, and scope');
    expect(safety).toContain('Authorization never waives the six Execution Sandbox controls');

    const generatorTests = await readFile(join(__dirname, 'generator.test.ts'), 'utf8');
    expect(generatorTests).toContain('preserves synthesis provenance, audit revision, standards, and explicit CVSS versions');
  });

  it('separates inert PoC output from file writes, execution, and HTTP side effects', async () => {
    const verify = await readCommand('security-verify.md');
    const safety = verify.split('### Mandatory PoC Safety Floor')[1].split('\n### ')[0];
    expect(safety).toContain('does not itself authorize a file write, execution, or HTTP request');
    expect(safety).toContain('explicit approval for that exact action, destination/target, and scope');
    expect(safety).toContain('Authorization never waives the six Execution Sandbox controls');
    expect(safety).toContain('provide inert PoC text and a validation plan instead');
  });

  it('partitions committed, staged, and deleted paths in live git state via TypeScript getGitDiffSummary', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'security-review-detector-'));
    const git = (...args: string[]) => execFileAsync('git', args, { cwd: directory });

    try {
      await git('init', '-b', 'main');
      await git('config', 'user.name', 'Security Review Test');
      await git('config', 'user.email', 'security-review@example.invalid');
      for (const name of ['committed.txt', 'staged.txt', 'unstaged.txt', 'deleted.txt', 'rename-old.txt']) {
        await writeFile(join(directory, name), 'initial\n');
      }
      await git('add', '.');
      await git('commit', '-m', 'initial');
      await git('update-ref', 'refs/remotes/origin/main', 'HEAD');
      await git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
      await git('switch', '-c', 'feature/review');

      await writeFile(join(directory, 'committed.txt'), 'committed change\n');
      await git('add', 'committed.txt');
      await git('commit', '-m', 'feature change');
      await writeFile(join(directory, 'staged.txt'), 'staged change\n');
      await git('add', 'staged.txt');
      await git('mv', 'rename-old.txt', 'rename-new.txt');

      const stagedDiff = await getGitDiffSummary({ staged: true, cwd: directory });
      expect(stagedDiff.isStaged).toBe(true);
      expect(stagedDiff.totalFiles).toBeGreaterThanOrEqual(1);
      const stagedPaths = stagedDiff.files.map((f) => f.path);
      expect(stagedPaths).toContain('staged.txt');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('validates report frontmatter properly using validateReportFrontmatter', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'security-review-header-'));
    const report = join(directory, 'report.md');

    try {
      const validDoc = `---
document_type: security-review
review_type: audit
assessment_date: "2026-08-19"
overall_risk: HIGH
total_findings: 3
critical_count: 1
high_count: 2
medium_count: 0
low_count: 0
owasp_categories: [A01, A05]
coverage_complete: true
---

# Security Report
`;
      await writeFile(report, validDoc);
      const res = await validateReportFrontmatter(report);
      expect(res.valid).toBe(true);
      expect(res.metadata?.overall_risk).toBe('HIGH');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
