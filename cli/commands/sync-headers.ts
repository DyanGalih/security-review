import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { validateReportFrontmatter } from '../../core/validator.js';

export interface SyncHeadersCliOptions {
  docsDir?: string;
  indexFile?: string;
  dryRun?: boolean;
}

const MANAGED_START = '<!-- MANAGED: SECURITY_REVIEWS -->';
const MANAGED_END = '<!-- /MANAGED: SECURITY_REVIEWS -->';

export async function executeSyncHeadersCommand(options: SyncHeadersCliOptions = {}): Promise<void> {
  const targetDir = resolve(options.docsDir || process.cwd());
  const indexPath = resolve(options.indexFile || join(targetDir, 'docs/memory/INDEX.md'));
  const isDryRun = !!options.dryRun;

  console.log(`🔍 Scanning for security report frontmatter in: ${targetDir}`);
  if (isDryRun) {
    console.log(`ℹ️ Running in --dry-run mode (no files will be written).`);
  }

  // Find all .md files in docs/ or targetDir
  const reportFiles: string[] = [];
  async function findMarkdownFiles(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        await findMarkdownFiles(full);
      } else if (entry.isFile() && entry.name.endsWith('.md') && full !== indexPath) {
        reportFiles.push(full);
      }
    }
  }

  await findMarkdownFiles(targetDir);

  const syncedEntries: Array<{
    filePath: string;
    relPath: string;
    date: string;
    scope: string;
    risk: string;
    total: number;
    title: string;
  }> = [];

  for (const file of reportFiles) {
    const res = await validateReportFrontmatter(file);
    if (res.valid && res.metadata) {
      const dateVal = res.metadata.assessment_date ?? res.metadata.date;
      const dateStr = typeof dateVal === 'string' ? dateVal : (dateVal instanceof Date ? dateVal.toISOString().slice(0, 10) : 'N/A');
      const scopeStr = String(res.metadata.review_type || 'audit');
      const riskStr = String(res.metadata.overall_risk ?? res.metadata.risk_level ?? 'UNKNOWN').toUpperCase();
      const totalNum = Number(res.metadata.total_findings || 0);
      const titleStr = String(res.metadata.title || res.metadata.description || 'Security Report');
      const relPath = relative(dirname(indexPath), file);

      syncedEntries.push({
        filePath: file,
        relPath,
        date: dateStr,
        scope: scopeStr,
        risk: riskStr,
        total: totalNum,
        title: titleStr,
      });
    }
  }

  // Sort deterministically by date descending, then relative path ascending
  syncedEntries.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.relPath.localeCompare(b.relPath);
  });

  console.log(`📋 Found ${syncedEntries.length} valid report frontmatters to index.`);

  // Build the managed markdown table
  const tableLines: string[] = [];
  tableLines.push(MANAGED_START);
  tableLines.push('| Date | Scope | Risk | Findings | File |');
  tableLines.push('|---|---|---|---|---|');

  for (const entry of syncedEntries) {
    tableLines.push(`| ${entry.date} | ${entry.scope} | **${entry.risk}** | ${entry.total} | [${entry.relPath}](${entry.relPath}) |`);
  }
  tableLines.push(MANAGED_END);

  const managedContent = tableLines.join('\n');

  if (isDryRun) {
    console.log(`\n--- [PREVIEW: ${indexPath}] ---\n${managedContent}\n-------------------------------\n`);
    return;
  }

  // Read existing INDEX.md if it exists
  let existingContent = '';
  try {
    existingContent = await readFile(indexPath, 'utf8');
  } catch {
    existingContent = '';
  }

  let finalContent = '';
  if (existingContent.includes(MANAGED_START) && existingContent.includes(MANAGED_END)) {
    const startIdx = existingContent.indexOf(MANAGED_START);
    const endIdx = existingContent.indexOf(MANAGED_END) + MANAGED_END.length;
    finalContent = existingContent.slice(0, startIdx) + managedContent + existingContent.slice(endIdx);
  } else if (existingContent.trim()) {
    finalContent = existingContent.trimEnd() + '\n\n## Security Reviews\n\n' + managedContent + '\n';
  } else {
    finalContent = '# Project Memory Index\n\n## Security Reviews\n\n' + managedContent + '\n';
  }

  // Ensure parent directory exists
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, finalContent, 'utf8');

  console.log(`✅ Successfully updated security reviews index at: ${indexPath}`);
}
