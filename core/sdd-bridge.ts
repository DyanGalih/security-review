import fs from 'node:fs';
import path from 'node:path';
import { FindingItem, FindingSeverity } from './types.js';
import { generateTasksMarkdown, computeReportStats } from './generator.js';
import { detectSDDEnvironment, SDDFramework } from './detector.js';

export interface SddProposeOptions {
  findings: FindingItem[];
  workspaceDir?: string;
  framework?: SDDFramework | 'auto';
  changeName?: string;
  targetDir?: string;
}

export function sanitizeChangeName(rawName?: string, findings?: FindingItem[]): string {
  if (rawName && rawName.trim().length > 0) {
    return rawName
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  if (findings && findings.length > 0) {
    const topFinding = findings[0];
    const raw = `remediate-${topFinding.id || 'sec'}-${topFinding.title || 'vulnerabilities'}`;
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 50)
      .replace(/^-+|-+$/g, '');
  }

  return 'security-remediation';
}

export function buildOpenSpecProposal(findings: FindingItem[], changeName: string): {
  proposalMd: string;
  specMd: string;
  designMd: string;
  tasksMd: string;
} {
  const stats = computeReportStats(findings);

  // 1. proposal.md
  let proposalMd = `# Proposal: Security Remediation (${changeName})\n\n`;
  proposalMd += `## Problem Statement\n`;
  proposalMd += `A security assessment identified **${stats.total}** vulnerability findings (**${stats.critical}** Critical, **${stats.high}** High, **${stats.medium}** Medium, **${stats.low}** Low) requiring structured remediation.\n\n`;
  proposalMd += `### Identified Findings\n`;
  findings.forEach((f) => {
    proposalMd += `- **${f.id}: ${f.title}** (${f.severity}) — \`${f.file || 'General'}\`\n`;
  });
  proposalMd += `\n## Proposed Solution\n`;
  proposalMd += `Execute targeted security fixes across the affected components to eliminate trust boundary violations, patch injection flaws, enforce proper access controls, and establish automated regression test verification.\n`;

  // 2. specs/remediation/spec.md
  let specMd = `# Capability Specification: Security Remediation (${changeName})\n\n`;
  findings.forEach((f, idx) => {
    specMd += `## ${idx + 1}. Requirement: Remediate ${f.id} (${f.title})\n\n`;
    specMd += `- **Category:** ${f.category}${f.cwe ? ` / ${f.cwe}` : ''}\n`;
    specMd += `- **Severity:** ${f.severity}\n`;
    if (f.file) specMd += `- **Target File:** \`${f.file}${f.lineRange ? `:${f.lineRange}` : ''}\`\n`;
    specMd += `- **Description:** ${f.description}\n\n`;

    specMd += `### Acceptance Criteria\n`;
    if (f.poc) {
      specMd += `1. When verified against test payload:\n\`\`\`\n${f.poc.code}\n\`\`\`\n`;
      specMd += `2. The application MUST reject the unauthorized payload and return secure behavior.\n`;
    } else {
      specMd += `1. The vulnerability MUST be completely mitigated according to the remediation specification.\n`;
      specMd += `2. An automated unit/integration test MUST verify that malicious input is neutralized.\n`;
    }
    specMd += `\n`;
  });

  // 3. design.md
  let designMd = `# Technical Design: Security Remediation (${changeName})\n\n`;
  designMd += `## 1. Remediation Architecture\n\n`;
  designMd += `This design addresses the identified security defects while maintaining strict layer boundaries and backward compatibility.\n\n`;
  designMd += `## 2. Component Fixes\n\n`;
  findings.forEach((f) => {
    designMd += `### ${f.id} — ${f.title}\n`;
    if (f.file) designMd += `- **Affected File:** \`${f.file}\`\n`;
    if (f.remediation) designMd += `- **Remediation Strategy:** ${f.remediation}\n`;
    if (f.proposedFix) {
      designMd += `- **Proposed Code Patch:**\n\`\`\`\n${f.proposedFix}\n\`\`\`\n`;
    }
    designMd += `\n`;
  });

  // 4. tasks.md
  const tasksMd = generateTasksMarkdown(findings);

  return { proposalMd, specMd, designMd, tasksMd };
}

export function provisionSddChange(options: SddProposeOptions): {
  framework: SDDFramework;
  changeName: string;
  changePath: string;
  filesCreated: string[];
} {
  const workspaceDir = path.resolve(options.workspaceDir || '.');
  const detected = detectSDDEnvironment(workspaceDir);
  const framework: SDDFramework = (options.framework && options.framework !== 'auto') ? options.framework : detected.framework;
  const changeName = sanitizeChangeName(options.changeName, options.findings);

  const filesCreated: string[] = [];

  if (framework === 'openspec') {
    const changeDir = options.targetDir
      ? path.resolve(options.targetDir)
      : path.join(workspaceDir, 'openspec', 'changes', changeName);

    const { proposalMd, specMd, designMd, tasksMd } = buildOpenSpecProposal(options.findings, changeName);

    fs.mkdirSync(path.join(changeDir, 'specs', 'remediation'), { recursive: true });

    const propPath = path.join(changeDir, 'proposal.md');
    fs.writeFileSync(propPath, proposalMd, 'utf8');
    filesCreated.push(propPath);

    const specPath = path.join(changeDir, 'specs', 'remediation', 'spec.md');
    fs.writeFileSync(specPath, specMd, 'utf8');
    filesCreated.push(specPath);

    const designPath = path.join(changeDir, 'design.md');
    fs.writeFileSync(designPath, designMd, 'utf8');
    filesCreated.push(designPath);

    const tasksPath = path.join(changeDir, 'tasks.md');
    fs.writeFileSync(tasksPath, tasksMd, 'utf8');
    filesCreated.push(tasksPath);

    return {
      framework: 'openspec',
      changeName,
      changePath: changeDir,
      filesCreated,
    };
  }

  if (framework === 'speckit') {
    const specifyDir = path.join(workspaceDir, '.specify');
    fs.mkdirSync(path.join(specifyDir, 'specs', changeName), { recursive: true });

    const { specMd, designMd, tasksMd } = buildOpenSpecProposal(options.findings, changeName);

    const specPath = path.join(specifyDir, 'specs', changeName, 'spec.md');
    fs.writeFileSync(specPath, specMd, 'utf8');
    filesCreated.push(specPath);

    const planPath = path.join(specifyDir, 'plan.md');
    fs.writeFileSync(planPath, designMd, 'utf8');
    filesCreated.push(planPath);

    const tasksPath = path.join(specifyDir, 'tasks.md');
    fs.writeFileSync(tasksPath, tasksMd, 'utf8');
    filesCreated.push(tasksPath);

    return {
      framework: 'speckit',
      changeName,
      changePath: specifyDir,
      filesCreated,
    };
  }

  // Generic
  const outDir = options.targetDir ? path.resolve(options.targetDir) : workspaceDir;
  fs.mkdirSync(outDir, { recursive: true });
  const { proposalMd, tasksMd } = buildOpenSpecProposal(options.findings, changeName);

  const propPath = path.join(outDir, `proposal-${changeName}.md`);
  fs.writeFileSync(propPath, proposalMd, 'utf8');
  filesCreated.push(propPath);

  const tasksPath = path.join(outDir, `tasks-${changeName}.md`);
  fs.writeFileSync(tasksPath, tasksMd, 'utf8');
  filesCreated.push(tasksPath);

  return {
    framework: 'generic',
    changeName,
    changePath: outDir,
    filesCreated,
  };
}
