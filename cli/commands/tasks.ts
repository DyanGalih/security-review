import fs from 'node:fs';
import path from 'node:path';
import { generateTasksMarkdown, appendTasksToFile } from '../../core/generator.js';
import { resolveActiveTasksFile } from '../../core/detector.js';
import { loadFindingsForCli } from '../loader.js';

export interface TasksCommandOptions {
  input?: string;
  target?: string;
  append?: boolean;
}

export async function executeTasksCommand(options: TasksCommandOptions): Promise<void> {
  const parsed = loadFindingsForCli(options.input, 'tasks');
  const findings = parsed.report.findings;

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
