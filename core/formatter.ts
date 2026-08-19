import type { AgentContextPayload, DiffSummary, SecurityEntrypoint, ChangedFile } from './types.js';

const PRIORITY_MAP = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/**
 * Builds a structured, token-optimized context message for an AI agent performing a security review.
 */
export function formatDiffForAgent(
  diff: DiffSummary,
  options: { maxTokenBudget?: number; format?: 'markdown' | 'json' } = {}
): AgentContextPayload {
  const format = options.format || 'markdown';
  const tokenBudget = options.maxTokenBudget;

  if (tokenBudget !== undefined && (typeof tokenBudget !== 'number' || isNaN(tokenBudget) || tokenBudget <= 0)) {
    throw new Error(`Invalid token budget: "${tokenBudget}". Budget must be a positive integer.`);
  }

  // Sort files by sensitivity: Critical -> High -> Medium -> Low
  const sortedFiles = [...diff.files].sort((a, b) => PRIORITY_MAP[a.sensitivity] - PRIORITY_MAP[b.sensitivity]);

  let includedFiles: ChangedFile[] = sortedFiles;
  let omittedCount = 0;

  if (tokenBudget !== undefined && sortedFiles.length > 0) {
    // Check if the full set fits within budget
    const fullTest = format === 'json'
      ? JSON.stringify({ ...diff, files: sortedFiles, includedFilesCount: sortedFiles.length, omittedFilesCount: 0, isTruncated: false, tokenBudget }, null, 2)
      : renderMarkdownTable(diff, sortedFiles, 0, tokenBudget);

    if (Math.ceil(fullTest.length / 4) > tokenBudget) {
      // Find the maximum number of prioritized files that fit
      let bestCount = 1;
      for (let count = sortedFiles.length - 1; count >= 1; count--) {
        const candidateFiles = sortedFiles.slice(0, count);
        const omitted = sortedFiles.length - count;
        const candidatePayload = format === 'json'
          ? JSON.stringify({ ...diff, files: candidateFiles, includedFilesCount: count, omittedFilesCount: omitted, isTruncated: true, tokenBudget }, null, 2)
          : renderMarkdownTable(diff, candidateFiles, omitted, tokenBudget);

        if (Math.ceil(candidatePayload.length / 4) <= tokenBudget) {
          bestCount = count;
          break;
        }
      }
      includedFiles = sortedFiles.slice(0, bestCount);
      omittedCount = sortedFiles.length - bestCount;
    }
  }

  if (format === 'json') {
    const jsonPayload = {
      ...diff,
      files: includedFiles,
      includedFilesCount: includedFiles.length,
      omittedFilesCount: omittedCount,
      isTruncated: omittedCount > 0,
      tokenBudget,
    };
    const jsonStr = JSON.stringify(jsonPayload, null, 2);
    return {
      format: 'json',
      summary: `Found ${diff.totalFiles} changed files (Included: ${includedFiles.length}, Omitted: ${omittedCount})`,
      contextHeader: `SECURITY REVIEW CONTEXT (STAGED: ${diff.isStaged})`,
      content: jsonStr,
      tokenEstimate: Math.ceil(jsonStr.length / 4),
    };
  }

  const content = renderMarkdownTable(diff, includedFiles, omittedCount, tokenBudget);
  const tokenEstimate = Math.ceil(content.length / 4);

  return {
    format: 'markdown',
    summary: `${diff.totalFiles} files analyzed. Critical: ${diff.criticalCount}, High: ${diff.highCount}. Included: ${includedFiles.length}, Omitted: ${omittedCount}.`,
    contextHeader: `SECURITY REVIEW AGENT PAYLOAD`,
    content,
    tokenEstimate,
  };
}

function renderMarkdownTable(
  diff: DiffSummary,
  files: ChangedFile[],
  omittedCount: number,
  tokenBudget?: number
): string {
  const lines: string[] = [];
  lines.push(`### 🔒 Changed Files Security Classification`);
  const modeStr = diff.isStaged
    ? 'Staged Changes (`git add`)'
    : diff.targetBranch
    ? `Branch Diff (${diff.baseBranch || 'main'}...${diff.targetBranch})`
    : 'Staged Changes (`git add`)';

  lines.push(`- **Mode**: ${modeStr}`);
  lines.push(`- **Total Files**: ${diff.totalFiles}${omittedCount > 0 ? ` (Showing top ${files.length}, ${omittedCount} omitted by budget)` : ''}`);
  lines.push(`- **Breakdown**: 🔴 Critical: ${diff.criticalCount} | 🟠 High: ${diff.highCount} | 🟡 Medium: ${diff.mediumCount} | 🟢 Low: ${diff.lowCount}`);
  lines.push('');
  lines.push('| Severity | Status | File Path | Added/Del | Focus Area |');
  lines.push('|---|---|---|---|---|');

  for (const file of files) {
    const badge =
      file.sensitivity === 'CRITICAL'
        ? '🔴 CRITICAL'
        : file.sensitivity === 'HIGH'
        ? '🟠 HIGH'
        : file.sensitivity === 'MEDIUM'
        ? '🟡 MEDIUM'
        : '🟢 LOW';

    lines.push(`| ${badge} | ${file.status} | \`${file.path}\` | +${file.linesAdded}/-${file.linesDeleted} | ${file.tags.join(', ')} |`);
  }

  if (omittedCount > 0) {
    lines.push('');
    lines.push(`> ⚠️ **Notice**: ${omittedCount} lower-priority file(s) omitted to respect the ${tokenBudget} token budget. Review prioritized files first.`);
  }

  lines.push('');
  lines.push(`**Review Strategy for Agent:** Prioritize full vulnerability audits (OWASP A01, A02, A05, A07) on CRITICAL and HIGH sensitivity files before reviewing MEDIUM/LOW files.`);

  return lines.join('\n');
}

/**
 * Formats scanned entrypoints into a token-optimized context message for agent audits.
 */
export function formatEntrypointsForAgent(
  entrypoints: SecurityEntrypoint[],
  options: { format?: 'markdown' | 'json' } = {}
): AgentContextPayload {
  const format = options.format || 'markdown';

  if (format === 'json') {
    const jsonStr = JSON.stringify(entrypoints, null, 2);
    return {
      format: 'json',
      summary: `Found ${entrypoints.length} security entrypoints.`,
      contextHeader: `SECURITY ENTRYPOINTS`,
      content: jsonStr,
      tokenEstimate: Math.ceil(jsonStr.length / 4),
    };
  }

  const lines: string[] = [];
  lines.push(`### 🛡️ Discovered Security Entrypoints (${entrypoints.length} surfaces)`);
  lines.push('');
  lines.push('> ℹ️ **Path-name Heuristic**: These entrypoints are candidate surfaces detected by file paths and naming conventions, requiring human or agent verification.');
  lines.push('');
  lines.push('| Severity | Type | Path |');
  lines.push('|---|---|---|');

  for (const ep of entrypoints) {
    const badge =
      ep.sensitivity === 'CRITICAL'
        ? '🔴 CRITICAL'
        : ep.sensitivity === 'HIGH'
        ? '🟠 HIGH'
        : '🟡 MEDIUM';
    lines.push(`| ${badge} | ${ep.type} | \`${ep.path}\` |`);
  }

  const content = lines.join('\n');
  const tokenEstimate = Math.ceil(content.length / 4);

  return {
    format: 'markdown',
    summary: `${entrypoints.length} surfaces discovered.`,
    contextHeader: `SECURITY ENTRYPOINTS AGENT PAYLOAD`,
    content,
    tokenEstimate,
  };
}
