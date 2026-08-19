import fs from 'node:fs';
import path from 'node:path';

export type SDDFramework = 'openspec' | 'speckit' | 'generic';

export interface SDDEnvironment {
  framework: SDDFramework;
  workspaceDir: string;
  activeChange?: string;
  changeDir?: string;
  tasksPath?: string;
  designPath?: string;
  specPath?: string;
}

export function detectSDDEnvironment(workspaceDir: string): SDDEnvironment {
  const absDir = path.resolve(workspaceDir);

  // 1. OpenSpec Check
  const openSpecDir = path.join(absDir, 'openspec');
  if (fs.existsSync(openSpecDir) && fs.statSync(openSpecDir).isDirectory()) {
    const changesDir = path.join(openSpecDir, 'changes');
    let activeChange: string | undefined;
    let changeDir: string | undefined;
    let tasksPath: string | undefined;
    let designPath: string | undefined;
    let specPath: string | undefined;

    if (fs.existsSync(changesDir) && fs.statSync(changesDir).isDirectory()) {
      const entries = fs.readdirSync(changesDir);
      for (const entry of entries) {
        if (entry === 'archive' || entry.startsWith('.')) continue;
        const candidateDir = path.join(changesDir, entry);
        if (fs.statSync(candidateDir).isDirectory()) {
          activeChange = entry;
          changeDir = candidateDir;

          const candidateTasks = path.join(candidateDir, 'tasks.md');
          if (fs.existsSync(candidateTasks)) tasksPath = candidateTasks;

          const candidateDesign = path.join(candidateDir, 'design.md');
          if (fs.existsSync(candidateDesign)) designPath = candidateDesign;

          const candidateProposal = path.join(candidateDir, 'proposal.md');
          if (fs.existsSync(candidateProposal)) specPath = candidateProposal;

          // Pick the first active change
          break;
        }
      }
    }

    return {
      framework: 'openspec',
      workspaceDir: absDir,
      activeChange,
      changeDir,
      tasksPath,
      designPath,
      specPath,
    };
  }

  // 2. Spec-Kit Check
  const specifyDir = path.join(absDir, '.specify');
  if (fs.existsSync(specifyDir) && fs.statSync(specifyDir).isDirectory()) {
    const tasksPath = path.join(specifyDir, 'tasks.md');
    const designPath = path.join(specifyDir, 'plan.md');
    const specPath = path.join(specifyDir, 'spec.md');

    return {
      framework: 'speckit',
      workspaceDir: absDir,
      tasksPath: fs.existsSync(tasksPath) ? tasksPath : undefined,
      designPath: fs.existsSync(designPath) ? designPath : undefined,
      specPath: fs.existsSync(specPath) ? specPath : undefined,
    };
  }

  // 3. Generic Fallback
  const rootTasks = path.join(absDir, 'tasks.md');
  return {
    framework: 'generic',
    workspaceDir: absDir,
    tasksPath: fs.existsSync(rootTasks) ? rootTasks : undefined,
  };
}

export function resolveActiveTasksFile(workspaceDir: string): string {
  const env = detectSDDEnvironment(workspaceDir);
  if (env.tasksPath) {
    return env.tasksPath;
  }
  if (env.framework === 'openspec' && env.changeDir) {
    return path.join(env.changeDir, 'tasks.md');
  }
  if (env.framework === 'speckit') {
    return path.join(env.workspaceDir, '.specify', 'tasks.md');
  }
  return path.join(env.workspaceDir, 'tasks.md');
}
