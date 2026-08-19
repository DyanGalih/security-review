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
