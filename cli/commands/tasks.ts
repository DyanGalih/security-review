import fs from 'node:fs';
import path from 'node:path';
import { generateTasksMarkdown, appendTasksToFile } from '../../core/generator.js';
import { resolveActiveTasksFile, resolveLatestFindingsJson } from '../../core/detector.js';
import { FindingsValidationError, parseFindingsReport } from '../../core/findings.js';
import { FindingItem } from '../../core/types.js';

export interface TasksCommandOptions {
  input?: string;
  target?: string;
  append?: boolean;
}

export async function executeTasksCommand(options: TasksCommandOptions): Promise<void> {
  let inputPath = options.input;
  if (!inputPath) {
    inputPath = resolveLatestFindingsJson(process.cwd());
    if (!inputPath) {
      console.error('[tasks error]: Missing required --input argument and no findings.json was found in workspace.');
      process.exit(1);
    }
  }

  let rawJson: string;
  if (inputPath === '-') {
    rawJson = fs.readFileSync(0, 'utf8');
  } else {
    if (!fs.existsSync(inputPath)) {
      console.error(`[tasks error]: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    rawJson = fs.readFileSync(inputPath, 'utf8');
  }

  let findings: FindingItem[];
  try {
    const parsed = parseFindingsReport(rawJson);
    for (const warning of parsed.warnings) console.error(`[tasks warning]: ${warning}`);
    findings = parsed.report.findings;
  } catch (err: unknown) {
    if (err instanceof FindingsValidationError) {
      for (const error of err.errors) console.error(`[tasks error]: ${error}`);
    } else {
      console.error(`[tasks error]: Failed to parse findings JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }

  const tasksMarkdown = generateTasksMarkdown(findings);

  if (options.target || options.append) {
    const targetFile = options.target ? path.resolve(options.target) : resolveActiveTasksFile(process.cwd());
    if (options.append) {
      const res = appendTasksToFile(targetFile, tasksMarkdown);
      if (res.created) {
        console.log(`✓ Created ${path.relative(process.cwd(), targetFile)} with ${findings.length} security tasks`);
      } else {
        console.log(`✓ Appended ${findings.length} security tasks to ${path.relative(process.cwd(), targetFile)}`);
      }
    } else {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, tasksMarkdown, 'utf8');
      console.log(`✓ Generated ${findings.length} security tasks in ${path.relative(process.cwd(), targetFile)}`);
    }
  } else {
    console.log(tasksMarkdown);
  }
}
