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

export function resolveLatestSecurityReport(workspaceDir: string = process.cwd()): string | undefined {
  const absDir = path.resolve(workspaceDir);
  const searchDirs = [
    path.join(absDir, 'docs', 'security-reviews'),
    path.join(absDir, 'docs', 'security'),
    path.join(absDir, '.specify'),
  ];

  const candidateFiles: { filePath: string; mtime: number; datePrefix?: string }[] = [];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
            candidateFiles.push({
              filePath,
              mtime: stat.mtimeMs,
              datePrefix: match ? match[1] : undefined,
            });
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (candidateFiles.length === 0) return undefined;

  candidateFiles.sort((a, b) => {
    if (a.datePrefix && b.datePrefix && a.datePrefix !== b.datePrefix) {
      return b.datePrefix.localeCompare(a.datePrefix);
    }
    return b.mtime - a.mtime;
  });

  return candidateFiles[0].filePath;
}

export function resolveLatestFindingsJson(workspaceDir: string = process.cwd()): string | undefined {
  const absDir = path.resolve(workspaceDir);
  const candidates = [
    path.join(absDir, '.security-review', 'findings.json'),
    path.join(absDir, 'findings.json'),
    path.join(absDir, 'docs', 'security-reviews', 'findings.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

export function resolveSecurityReviewConfig(workspaceDir: string = process.cwd()): string | undefined {
  const absDir = path.resolve(workspaceDir);
  const candidates = [
    path.join(absDir, '.security-review', 'security-review.yml'),
    path.join(absDir, '.security-review', 'security-review.yaml'),
    path.join(absDir, '.security-review', 'config.yml'),
    path.join(absDir, '.security-review', 'config.yaml'),
    path.join(absDir, 'security-review.yml'),
    path.join(absDir, 'security-review.yaml'),
    path.join(absDir, '.security-review.yml'),
    path.join(absDir, '.security-review.yaml'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}
