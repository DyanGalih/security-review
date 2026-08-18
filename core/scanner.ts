import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { classifyFileSensitivity } from './git.js';
import type { SecurityEntrypoint } from './types.js';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode',
  '.next',
  '.turbo',
  'vendor',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar', '.gz',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.sqlite', '.db'
]);

/**
 * Scans a repository directory for security-sensitive entrypoints.
 */
export async function scanSecurityEntrypoints(
  targetDir: string = process.cwd(),
  maxDepth: number = 6
): Promise<SecurityEntrypoint[]> {
  const results: SecurityEntrypoint[] = [];

  async function walk(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;

    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const relPath = relative(targetDir, fullPath);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          await walk(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase() : '';
        if (BINARY_EXTENSIONS.has(ext)) continue;

        const { sensitivity, tags } = classifyFileSensitivity(relPath);
        if (sensitivity === 'CRITICAL' || sensitivity === 'HIGH' || sensitivity === 'MEDIUM') {
          let type: SecurityEntrypoint['type'] = 'general';
          if (tags.includes('secret-or-payment')) type = 'secret';
          else if (tags.includes('auth-or-persistence')) type = 'auth';
          else if (tags.includes('api-or-business-logic')) type = 'route';

          results.push({
            path: relPath,
            type,
            sensitivity,
            description: `Detected as ${type} with tags: ${tags.join(', ')}`,
          });
        }
      }
    }
  }

  await walk(targetDir, 0);
  return results;
}
