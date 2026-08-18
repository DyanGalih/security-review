import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateReportFrontmatter } from '../../core/validator.js';

export interface SyncHeadersCliOptions {
  docsDir?: string;
  indexFile?: string;
}

export async function executeSyncHeadersCommand(options: SyncHeadersCliOptions = {}): Promise<void> {
  const targetDir = options.docsDir || process.cwd();
  const indexPath = options.indexFile || join(targetDir, 'docs/memory/INDEX.md');

  console.log(`🔍 Scanning for security report frontmatter in: ${targetDir}`);

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
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await findMarkdownFiles(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        reportFiles.push(full);
      }
    }
  }

  await findMarkdownFiles(targetDir);

  const syncedEntries: Array<{ file: string; title: string; risk: string; total: number }> = [];

  for (const file of reportFiles) {
    const res = await validateReportFrontmatter(file);
    if (res.valid && res.metadata) {
      syncedEntries.push({
        file,
        title: String(res.metadata.title || 'Security Report'),
        risk: String(res.metadata.risk_level || 'UNKNOWN'),
        total: Number(res.metadata.total_findings || 0),
      });
    }
  }

  console.log(`📋 Found ${syncedEntries.length} valid report frontmatters to index.`);
  for (const entry of syncedEntries) {
    console.log(`   • [${entry.risk}] ${entry.title} (${entry.total} findings)`);
  }
}
