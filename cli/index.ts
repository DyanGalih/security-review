import { executeDiffCommand } from './commands/diff.js';
import { executeScanCommand } from './commands/scan.js';
import { executeValidateCommand } from './commands/validate.js';
import { executeSyncHeadersCommand } from './commands/sync-headers.js';

export function printHelp(): void {
  console.log(`
🔒 Security Review CLI & Agent Toolkit (@speckit/security-review)

Usage:
  security-review <command> [options]
  sec-review <command> [options]
  sr <command> [options]

Commands:
  diff [--staged] [--branch <name>] [--json] [--budget <tokens>]
    Extracts git changes, categorizes security sensitivity, and formats agent payload.

  scan [--path <dir>] [--json]
    Scans project directory for security-sensitive entrypoints and surfaces.

  validate <file> [--json]
    Validates report YAML frontmatter against field-registry specifications.

  sync-headers [--docs <dir>] [--index <path>]
    Scans and indexes report frontmatters for token-efficient memory retrieval.

  version, -v, --version
    Prints the version.

  help, -h, --help
    Prints this help message.
`);
}

export async function runCli(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    printHelp();
    return;
  }

  if (args[0] === 'version' || args.includes('-v') || args.includes('--version')) {
    console.log('1.7.0');
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case 'diff': {
      const staged = rest.includes('--staged');
      const json = rest.includes('--json');
      const branchIdx = rest.indexOf('--branch');
      const branch = branchIdx !== -1 && rest[branchIdx + 1] ? rest[branchIdx + 1] : undefined;
      const budgetIdx = rest.indexOf('--budget');
      const budget = budgetIdx !== -1 && rest[budgetIdx + 1] ? parseInt(rest[budgetIdx + 1], 10) : undefined;
      await executeDiffCommand({ staged, branch, json, budget });
      break;
    }

    case 'scan': {
      const json = rest.includes('--json');
      const pathIdx = rest.indexOf('--path');
      const path = pathIdx !== -1 && rest[pathIdx + 1] ? rest[pathIdx + 1] : undefined;
      await executeScanCommand({ path, json });
      break;
    }

    case 'validate': {
      const file = rest.find((a) => !a.startsWith('-'));
      if (!file) {
        console.error('Error: Must provide a file path to validate.');
        process.exit(1);
      }
      const json = rest.includes('--json');
      await executeValidateCommand({ file, json });
      break;
    }

    case 'sync-headers': {
      const docsIdx = rest.indexOf('--docs');
      const docsDir = docsIdx !== -1 && rest[docsIdx + 1] ? rest[docsIdx + 1] : undefined;
      const indexIdx = rest.indexOf('--index');
      const indexFile = indexIdx !== -1 && rest[indexIdx + 1] ? rest[indexIdx + 1] : undefined;
      await executeSyncHeadersCommand({ docsDir, indexFile });
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run "security-review --help" for usage.`);
      process.exit(1);
  }
}
