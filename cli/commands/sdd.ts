import fs from 'node:fs';
import path from 'node:path';
import { detectSDDEnvironment, resolveActiveTasksFile, resolveLatestFindingsJson, SDDFramework } from '../../core/detector.js';
import { provisionSddChange } from '../../core/sdd-bridge.js';
import { FindingItem, FindingsReport } from '../../core/types.js';

export interface SddStatusOptions {
  path?: string;
  json?: boolean;
}

export interface SddProposeCliOptions {
  input?: string;
  framework?: string;
  name?: string;
  target?: string;
}

export async function executeSddStatusCommand(options: SddStatusOptions): Promise<void> {
  const targetDir = options.path || '.';
  const env = detectSDDEnvironment(targetDir);

  if (options.json) {
    console.log(JSON.stringify(env, null, 2));
    return;
  }

  console.log(`\n🔍 SDD Framework Status for: ${env.workspaceDir}`);
  console.log(`  Framework:      ${env.framework.toUpperCase()}`);
  if (env.activeChange) {
    console.log(`  Active Change:  ${env.activeChange}`);
    console.log(`  Change Dir:     ${env.changeDir}`);
  }
  if (env.tasksPath) {
    console.log(`  Tasks Target:   ${env.tasksPath}`);
  } else {
    console.log(`  Tasks Target:   (default: ${resolveActiveTasksFile(env.workspaceDir)})`);
  }
  if (env.designPath) {
    console.log(`  Design / Plan:  ${env.designPath}`);
  }
  if (env.specPath) {
    console.log(`  Spec Target:    ${env.specPath}`);
  }
  console.log('');
}

export async function executeSddProposeCommand(options: SddProposeCliOptions): Promise<void> {
  let inputPath = options.input;
  if (!inputPath) {
    inputPath = resolveLatestFindingsJson(process.cwd());
    if (!inputPath) {
      console.error('[sdd propose error]: Missing required --input argument and no findings.json was found in workspace.');
      process.exit(1);
    }
  }

  let rawJson: string;
  if (inputPath === '-') {
    rawJson = fs.readFileSync(0, 'utf8');
  } else {
    if (!fs.existsSync(inputPath)) {
      console.error(`[sdd propose error]: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    rawJson = fs.readFileSync(inputPath, 'utf8');
  }

  let findings: FindingItem[];
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      findings = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.findings)) {
      findings = parsed.findings;
    } else {
      throw new Error('Invalid JSON. Expected array of findings or findings report object.');
    }
  } catch (err: any) {
    console.error(`[sdd propose error]: Failed to parse findings JSON: ${err.message}`);
    process.exit(1);
  }

  if (findings.length === 0) {
    console.log('No security findings found in input. Nothing to propose.');
    return;
  }

  const framework = (options.framework || 'auto') as SDDFramework | 'auto';
  const result = provisionSddChange({
    findings,
    framework,
    changeName: options.name,
    targetDir: options.target,
  });

  console.log(`\n🚀 SDD Proposal Created successfully!`);
  console.log(`  Framework:   ${result.framework.toUpperCase()}`);
  console.log(`  Change Name: ${result.changeName}`);
  console.log(`  Location:    ${result.changePath}`);
  console.log(`  Files Created:`);
  result.filesCreated.forEach((f) => {
    console.log(`    ✓ ${path.relative(process.cwd(), f)}`);
  });
  console.log('');
}
