import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ChangedFile, DiffSummary, FileSensitivity } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Classifies a file path into a security sensitivity bucket.
 */
export function classifyFileSensitivity(filePath: string): { sensitivity: FileSensitivity; tags: string[] } {
  const lower = filePath.toLowerCase();
  const tags: string[] = [];

  // Critical sensitivity: Secrets, env, keys, crypto, payment
  if (
    lower.includes('.env') ||
    lower.includes('secret') ||
    lower.includes('key.pem') ||
    lower.includes('id_rsa') ||
    lower.includes('token') ||
    lower.includes('password') ||
    lower.includes('payment') ||
    lower.includes('billing')
  ) {
    tags.push('secret-or-payment');
    return { sensitivity: 'CRITICAL', tags };
  }

  // High sensitivity: Auth, authorization, permissions, sessions, db migrations, security config
  if (
    lower.includes('auth') ||
    lower.includes('session') ||
    lower.includes('permission') ||
    lower.includes('rbac') ||
    lower.includes('guard') ||
    lower.includes('migration') ||
    lower.includes('policy') ||
    lower.includes('security')
  ) {
    tags.push('auth-or-persistence');
    return { sensitivity: 'HIGH', tags };
  }

  // Medium sensitivity: API routes, controllers, serializers, middleware, handlers
  if (
    lower.includes('route') ||
    lower.includes('controller') ||
    lower.includes('api/') ||
    lower.includes('handler') ||
    lower.includes('middleware') ||
    lower.includes('model') ||
    lower.includes('service')
  ) {
    tags.push('api-or-business-logic');
    return { sensitivity: 'MEDIUM', tags };
  }

  // Low sensitivity: Documentation, tests, markdown, assets
  tags.push('general-or-docs');
  return { sensitivity: 'LOW', tags };
}

/**
 * Safely executes git with parameterized arguments.
 */
export async function runGitCommand(args: string[], cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch (err: unknown) {
    const error = err as { message?: string; stderr?: string };
    throw new Error(`Git execution failed (git ${args.join(' ')}): ${error.stderr?.trim() || error.message || String(err)}`);
  }
}

/**
 * Retrieves current active branch name.
 */
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  try {
    const branch = await runGitCommand(['branch', '--show-current'], cwd);
    return branch.trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Resolves repository default branch (e.g. main, master, or remote default).
 */
export async function resolveDefaultBaseBranch(cwd: string = process.cwd()): Promise<string> {
  try {
    const ref = await runGitCommand(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
    const parts = ref.trim().split('/');
    if (parts.length > 0 && parts[parts.length - 1]) {
      return parts[parts.length - 1];
    }
  } catch {
    // Fall back to probing main or master
  }

  for (const candidate of ['main', 'master']) {
    try {
      await runGitCommand(['rev-parse', '--verify', candidate], cwd);
      return candidate;
    } catch {
      // continue
    }
  }

  return 'main';
}

/**
 * Extracts staged changes or branch diffs and classifies them.
 */
export async function getGitDiffSummary(
  options: { staged?: boolean; targetBranch?: string; baseBranch?: string; cwd?: string } = {}
): Promise<DiffSummary> {
  const cwd = options.cwd || process.cwd();
  const isStaged = !!options.staged;
  const targetBranch = options.targetBranch;
  let baseBranch = options.baseBranch;

  let nameStatusArgs: string[];
  let numstatArgs: string[];

  if (isStaged) {
    nameStatusArgs = ['diff', '--cached', '--name-status'];
    numstatArgs = ['diff', '--cached', '--numstat'];
  } else if (targetBranch) {
    // Validate target branch exists
    try {
      await runGitCommand(['rev-parse', '--verify', targetBranch], cwd);
    } catch {
      throw new Error(`Target branch or ref "${targetBranch}" could not be resolved in repository.`);
    }

    if (!baseBranch) {
      baseBranch = await resolveDefaultBaseBranch(cwd);
    }

    // Validate base branch exists
    try {
      await runGitCommand(['rev-parse', '--verify', baseBranch], cwd);
    } catch {
      throw new Error(`Base branch or ref "${baseBranch}" could not be resolved in repository.`);
    }

    // Validate merge-base between base and target
    try {
      const mb = await runGitCommand(['merge-base', baseBranch, targetBranch], cwd);
      if (!mb.trim()) {
        throw new Error(`No common merge-base found between "${baseBranch}" and "${targetBranch}".`);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      throw new Error(`Failed to find merge-base between "${baseBranch}" and "${targetBranch}": ${error.message || String(err)}`);
    }

    const diffRef = `${baseBranch}...${targetBranch}`;
    nameStatusArgs = ['diff', diffRef, '--name-status'];
    numstatArgs = ['diff', diffRef, '--numstat'];
  } else {
    // If neither staged nor branch target specified, default to staged
    nameStatusArgs = ['diff', '--cached', '--name-status'];
    numstatArgs = ['diff', '--cached', '--numstat'];
  }

  const nameStatusOutput = await runGitCommand(nameStatusArgs, cwd);
  const numstatOutput = await runGitCommand(numstatArgs, cwd).catch(() => '');

  const numstatMap = new Map<string, { added: number; deleted: number }>();
  for (const line of numstatOutput.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      const added = parseInt(parts[0], 10) || 0;
      const deleted = parseInt(parts[1], 10) || 0;
      const filePath = parts.slice(2).join(' ');
      numstatMap.set(filePath, { added, deleted });
    }
  }

  const files: ChangedFile[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const line of nameStatusOutput.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    const statusCode = parts[0];
    const filePath = (statusCode.startsWith('R') || statusCode.startsWith('C'))
      ? (parts[2] || parts[1] || '')
      : (parts[1] || '');

    let status: ChangedFile['status'] = 'modified';
    if (statusCode.startsWith('A')) status = 'added';
    else if (statusCode.startsWith('D')) status = 'deleted';
    else if (statusCode.startsWith('R')) status = 'renamed';
    else if (statusCode.startsWith('C')) status = 'copied';

    const { sensitivity, tags } = classifyFileSensitivity(filePath);
    if (sensitivity === 'CRITICAL') criticalCount++;
    else if (sensitivity === 'HIGH') highCount++;
    else if (sensitivity === 'MEDIUM') mediumCount++;
    else lowCount++;

    const stats = numstatMap.get(filePath) || { added: 0, deleted: 0 };

    files.push({
      path: filePath,
      status,
      sensitivity,
      linesAdded: stats.added,
      linesDeleted: stats.deleted,
      tags,
    });
  }

  const estimatedTokens = files.reduce((acc, f) => acc + (f.linesAdded + f.linesDeleted) * 4, 0);

  return {
    baseBranch,
    targetBranch,
    isStaged,
    totalFiles: files.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    files,
    estimatedTokens,
  };
}
