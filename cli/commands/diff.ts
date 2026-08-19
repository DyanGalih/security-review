import { getGitDiffSummary } from '../../core/git.js';
import { formatDiffForAgent } from '../../core/formatter.js';

export interface DiffCliOptions {
  staged?: boolean;
  targetBranch?: string;
  baseBranch?: string;
  json?: boolean;
  budget?: number;
}

export async function executeDiffCommand(options: DiffCliOptions = {}): Promise<void> {
  try {
    const diff = await getGitDiffSummary({
      staged: options.staged,
      targetBranch: options.targetBranch,
      baseBranch: options.baseBranch,
    });

    const payload = formatDiffForAgent(diff, {
      format: options.json ? 'json' : 'markdown',
      maxTokenBudget: options.budget,
    });

    console.log(payload.content);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error(`[diff error]: ${error.message || String(err)}`);
    process.exit(1);
  }
}
