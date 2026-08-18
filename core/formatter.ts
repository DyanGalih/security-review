import type { AgentContextPayload, DiffSummary, SecurityEntrypoint } from './types.js';

/**
 * Builds a structured, token-optimized context message for an AI agent performing a security review.
 */
export function formatDiffForAgent(
  diff: DiffSummary,
  options: { maxTokenBudget?: number; format?: 'markdown' | 'json' } = {}
): AgentContextPayload {
  const format = options.format || 'markdown';
  const tokenBudget = options.maxTokenBudget || 8000;

  if (format === 'json') {
    const jsonStr = JSON.stringify(diff, null, 2);
    return {
      format: 'json',
      summary: `Found ${diff.totalFiles} changed files (Critical: ${diff.criticalCount}, High: ${diff.highCount}, Medium: ${diff.mediumCount}, Low: ${diff.lowCount})`,
      contextHeader: `SECURITY REVIEW CONTEXT (STAGED: ${diff.isStaged})`,
      content: jsonStr,
      tokenEstimate: Math.ceil(jsonStr.length / 4),
    };
  }

  const lines: string[] = [];
  lines.push(`### 🔒 Changed Files Security Classification`);
  lines.push(`- **Mode**: ${diff.isStaged ? 'Staged Changes (`git add`)' : `Branch Diff (${diff.baseBranch || 'main'}...HEAD)`}`);
  lines.push(`- **Total Files**: ${diff.totalFiles}`);
  lines.push(`- **Breakdown**: 🔴 Critical: ${diff.criticalCount} | 🟠 High: ${diff.highCount} | 🟡 Medium: ${diff.mediumCount} | 🟢 Low: ${diff.lowCount}`);
  lines.push('');
  lines.push('| Severity | Status | File Path | Added/Del | Focus Area |');
  lines.push('|---|---|---|---|---|');

  // Sort files by sensitivity: Critical -> High -> Medium -> Low
  const priorityMap = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedFiles = [...diff.files].sort((a, b) => priorityMap[a.sensitivity] - priorityMap[b.sensitivity]);

  for (const file of sortedFiles) {
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

  lines.push('');
  lines.push(`**Review Strategy for Agent:** Prioritize full vulnerability audits (OWASP A01, A02, A05, A07) on CRITICAL and HIGH sensitivity files before reviewing MEDIUM/LOW files.`);

  const content = lines.join('\n');
  const tokenEstimate = Math.ceil(content.length / 4);

  return {
    format: 'markdown',
    summary: `${diff.totalFiles} files analyzed. Critical: ${diff.criticalCount}, High: ${diff.highCount}.`,
    contextHeader: `SECURITY REVIEW AGENT PAYLOAD`,
    content,
    tokenEstimate,
  };
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
  return {
    format: 'markdown',
    summary: `${entrypoints.length} security entrypoints discovered.`,
    contextHeader: `SECURITY ENTRYPOINTS SUMMARY`,
    content,
    tokenEstimate: Math.ceil(content.length / 4),
  };
}
