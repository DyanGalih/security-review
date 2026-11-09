import fs from 'node:fs';
import path from 'node:path';
import { detectSDDEnvironment, resolveActiveTasksFile, SDDFramework } from '../../core/detector.js';
import { provisionSddChange } from '../../core/sdd-bridge.js';
import { loadFindingsForCli } from '../loader.js';

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
  const parsed = loadFindingsForCli(options.input, 'sdd propose');
  const findings = parsed.report.findings;

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
