import { executeDiffCommand } from './commands/diff.js';
import { executeScanCommand } from './commands/scan.js';
import { executeValidateCommand } from './commands/validate.js';
import { executeSyncHeadersCommand } from './commands/sync-headers.js';
import { executeReportCommand } from './commands/report.js';
import { executeTasksCommand } from './commands/tasks.js';
import { executeSddStatusCommand, executeSddProposeCommand } from './commands/sdd.js';
import { runInitCommand } from './commands/init.js';

export function printHelp(): void {
  console.log(`
🔒 Security Review CLI & Agent Toolkit (security-review)

Usage:
  security-review <command> [options]
  sec-review <command> [options]
  sr <command> [options]

Commands:
  init [target] [-y|--yes] [--agent <names>] [--commands <list>] [--overwrite <mode>]
    Installs Security Review commands & skills for AI agents and provisions governance configs.

  diff [--staged] [--branch <target> [base]] [--json] [--budget <tokens>]
    Extracts git changes, categorizes security sensitivity, and formats agent payload.

  scan [--path <dir>] [--json]
    Scans project directory for candidate security-sensitive entrypoints (path-name heuristic).

  report --input <file> [--output <file>] [--format <markdown|json>]
    Compiles raw structured findings JSON into an executive & technical security report.

  tasks --input <file> [--target <tasks.md>] [--append]
    Generates TASK-SEC-NNN remediation checklist items or appends them directly to tasks.md.

  sdd status [--path <dir>] [--json]
    Inspects and displays active SDD framework (OpenSpec, Spec-Kit, Generic) and resolved paths.

  sdd propose --input <file> [--framework <openspec|speckit|auto>] [--name <change-name>] [--target <dir>]
    Generates a complete SDD change proposal (proposal.md, spec.md, design.md, tasks.md) from findings.

  validate <file> [--json]
    Validates report YAML frontmatter against field-registry specifications.

  sync-headers [--docs <dir>] [--index <path>] [--dry-run]
    Scans and indexes report frontmatters into a managed memory section.

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
    console.log('2.0.0');
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case 'init': {
      const target = rest.find((a) => !a.startsWith('-')) || '.';
      const yes = rest.includes('-y') || rest.includes('--yes');
      const agentIdx = rest.indexOf('--agent');
      const agent = agentIdx !== -1 ? rest[agentIdx + 1] : undefined;
      const commandsIdx = rest.indexOf('--commands');
      const commands = commandsIdx !== -1 ? rest[commandsIdx + 1] : undefined;
      const overwriteIdx = rest.indexOf('--overwrite');
      const overwrite = (overwriteIdx !== -1 ? rest[overwriteIdx + 1] : undefined) as 'replace' | 'skip' | 'keep-both' | undefined;

      await runInitCommand(target, { yes, agent, commands, overwrite });
      break;
    }

    case 'diff': {
      const staged = rest.includes('--staged');
      const json = rest.includes('--json');
      const branchIdx = rest.indexOf('--branch');
      let targetBranch: string | undefined;
      let baseBranch: string | undefined;
      if (branchIdx !== -1) {
        targetBranch = rest[branchIdx + 1];
        if (!targetBranch || targetBranch.startsWith('-')) {
          console.error('[diff error]: Missing target branch argument after --branch');
          process.exit(1);
        }
        const nextArg = rest[branchIdx + 2];
        if (nextArg && !nextArg.startsWith('-')) {
          baseBranch = nextArg;
        }
      }
      const budgetIdx = rest.indexOf('--budget');
      let budget: number | undefined;
      if (budgetIdx !== -1) {
        const rawBudget = rest[budgetIdx + 1];
        if (!rawBudget || isNaN(Number(rawBudget))) {
          console.error('[diff error]: Invalid or missing token budget argument after --budget');
          process.exit(1);
        }
        budget = parseInt(rawBudget, 10);
      }
      await executeDiffCommand({ staged, targetBranch, baseBranch, json, budget });
      break;
    }

    case 'scan': {
      const json = rest.includes('--json');
      const pathIdx = rest.indexOf('--path');
      const path = pathIdx !== -1 && rest[pathIdx + 1] ? rest[pathIdx + 1] : undefined;
      await executeScanCommand({ path, json });
      break;
    }

    case 'report': {
      const inputIdx = rest.indexOf('--input');
      const input = inputIdx !== -1 ? rest[inputIdx + 1] : undefined;
      const outputIdx = rest.indexOf('--output');
      const output = outputIdx !== -1 ? rest[outputIdx + 1] : undefined;
      const formatIdx = rest.indexOf('--format');
      const format = (formatIdx !== -1 ? rest[formatIdx + 1] : 'markdown') as 'markdown' | 'json';
      await executeReportCommand({ input, output, format });
      break;
    }

    case 'tasks': {
      const inputIdx = rest.indexOf('--input');
      const input = inputIdx !== -1 ? rest[inputIdx + 1] : undefined;
      const targetIdx = rest.indexOf('--target');
      const target = targetIdx !== -1 ? rest[targetIdx + 1] : undefined;
      const append = rest.includes('--append');
      await executeTasksCommand({ input, target, append });
      break;
    }

    case 'sdd': {
      const subAction = rest[0];
      const subRest = rest.slice(1);
      if (subAction === 'status') {
        const pathIdx = subRest.indexOf('--path');
        const path = pathIdx !== -1 ? subRest[pathIdx + 1] : undefined;
        const json = subRest.includes('--json');
        await executeSddStatusCommand({ path, json });
      } else if (subAction === 'propose') {
        const inputIdx = subRest.indexOf('--input');
        const input = inputIdx !== -1 ? subRest[inputIdx + 1] : undefined;
        const frameworkIdx = subRest.indexOf('--framework');
        const framework = frameworkIdx !== -1 ? subRest[frameworkIdx + 1] : undefined;
        const nameIdx = subRest.indexOf('--name');
        const name = nameIdx !== -1 ? subRest[nameIdx + 1] : undefined;
        const targetIdx = subRest.indexOf('--target');
        const target = targetIdx !== -1 ? subRest[targetIdx + 1] : undefined;
        await executeSddProposeCommand({ input, framework, name, target });
      } else {
        console.error('Unknown sdd action. Available actions: "status", "propose". Run "security-review --help" for details.');
        process.exit(1);
      }
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
      const dryRun = rest.includes('--dry-run');
      await executeSyncHeadersCommand({ docsDir, indexFile, dryRun });
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run "security-review --help" for usage.`);
      process.exit(1);
  }
}
