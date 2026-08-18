import { scanSecurityEntrypoints } from '../../core/scanner.js';
import { formatEntrypointsForAgent } from '../../core/formatter.js';

export interface ScanCliOptions {
  path?: string;
  json?: boolean;
}

export async function executeScanCommand(options: ScanCliOptions = {}): Promise<void> {
  try {
    const targetDir = options.path || process.cwd();
    const entrypoints = await scanSecurityEntrypoints(targetDir);

    const payload = formatEntrypointsForAgent(entrypoints, {
      format: options.json ? 'json' : 'markdown',
    });

    console.log(payload.content);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error(`[scan error]: ${error.message || String(err)}`);
    process.exit(1);
  }
}
