import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { FindingItem, FindingsReport, FindingSeverity } from './types.js';

export function computeReportStats(findings: FindingItem[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  overallRisk: FindingSeverity | 'NONE';
  owaspCategories: string[];
  cweIds: string[];
} {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let informational = 0;

  const owaspSet = new Set<string>();
  const cweSet = new Set<string>();

  for (const f of findings) {
    const sev = f.severity?.toUpperCase() as FindingSeverity;
    if (sev === 'CRITICAL') critical++;
    else if (sev === 'HIGH') high++;
    else if (sev === 'MEDIUM') medium++;
    else if (sev === 'LOW') low++;
    else informational++;

    if (f.category) {
      const match = f.category.match(/^(A0[1-9]|A10)/i);
      if (match) owaspSet.add(match[1].toUpperCase());
    }
    if (f.cwe) {
      const match = f.cwe.match(/CWE-\d+/i);
      if (match) cweSet.add(match[0].toUpperCase());
    }
  }

  let overallRisk: FindingSeverity | 'NONE' = 'NONE';
  if (critical > 0) overallRisk = 'CRITICAL';
  else if (high > 0) overallRisk = 'HIGH';
  else if (medium > 0) overallRisk = 'MEDIUM';
  else if (low > 0) overallRisk = 'LOW';
  else if (informational > 0) overallRisk = 'INFORMATIONAL';

  return {
    total: findings.length,
    critical,
    high,
    medium,
    low,
    informational,
    overallRisk,
    owaspCategories: Array.from(owaspSet),
    cweIds: Array.from(cweSet),
  };
}

export function generateMarkdownReport(report: FindingsReport): string {
  const stats = computeReportStats(report.findings);
  const dateStr = report.assessment_date || new Date().toISOString().split('T')[0];
  const codebase = report.codebase_analyzed || 'src/';
  const filesCount = report.total_files_analyzed ?? 0;
  const reviewType = report.review_type || 'audit';

  const frontmatterObj: Record<string, unknown> = {
    document_type: 'security-review',
    review_type: reviewType,
    assessment_date: dateStr,
    codebase_analyzed: codebase,
    total_files_analyzed: filesCount,
    total_findings: stats.total,
    overall_risk: report.overall_risk || stats.overallRisk,
    critical_count: stats.critical,
    high_count: stats.high,
    medium_count: stats.medium,
    low_count: stats.low,
    informational_count: stats.informational,
    owasp_categories: stats.owaspCategories,
    cwe_ids: stats.cweIds,
  };

  if (report.findings.length > 0 && report.findings[0].id) {
    frontmatterObj.security_task = report.findings[0].id;
  }

  const frontmatterYaml = yaml.dump(frontmatterObj, { lineWidth: -1 }).trim();

  let md = `---\n${frontmatterYaml}\n---\n\n`;
  md += `# Security Assessment Report\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Scope:** \`${codebase}\`  \n`;
  md += `**Overall Risk Posture:** **${stats.overallRisk}**\n\n`;

  // Executive Summary
  md += `## 1. Executive Summary\n\n`;
  md += `This assessment evaluated the target codebase for security vulnerabilities, architectural trust boundaries, and OWASP compliance.\n\n`;
  md += `### Risk Posture Overview\n\n`;
  md += `| Severity | Count | Primary Categories |\n`;
  md += `|---|---|---|\n`;
  md += `| 🔴 Critical | ${stats.critical} | ${stats.critical > 0 ? stats.owaspCategories.join(', ') : 'None'} |\n`;
  md += `| 🟠 High | ${stats.high} | ${stats.high > 0 ? stats.owaspCategories.join(', ') : 'None'} |\n`;
  md += `| 🟡 Medium | ${stats.medium} | ${stats.medium > 0 ? stats.owaspCategories.join(', ') : 'None'} |\n`;
  md += `| 🟢 Low | ${stats.low} | ${stats.low > 0 ? stats.owaspCategories.join(', ') : 'None'} |\n`;
  md += `| ⚪ Info | ${stats.informational} | Hardening opportunities |\n\n`;

  // Technical Findings
  md += `## 2. Technical Findings\n\n`;
  if (report.findings.length === 0) {
    md += `*No vulnerabilities identified during this review.*\n\n`;
  } else {
    report.findings.forEach((finding, idx) => {
      const fid = finding.id || `SEC-${String(idx + 1).padStart(3, '0')}`;
      md += `### ${fid}: ${finding.title}\n\n`;
      md += `- **Severity:** ${finding.severity}\n`;
      md += `- **Category:** ${finding.category}\n`;
      if (finding.cwe) md += `- **CWE:** ${finding.cwe}\n`;
      if (finding.file) md += `- **Location:** \`${finding.file}${finding.lineRange ? `:${finding.lineRange}` : ''}\`\n`;
      if (finding.verificationStatus) md += `- **Verification Status:** \`${finding.verificationStatus}\`\n`;
      md += `\n`;

      md += `#### Description\n${finding.description}\n\n`;

      if (finding.exploitScenario) {
        md += `#### Exploit Scenario\n${finding.exploitScenario}\n\n`;
      }

      if (finding.impact) {
        md += `#### Impact\n${finding.impact}\n\n`;
      }

      if (finding.remediation) {
        md += `#### Remediation\n${finding.remediation}\n\n`;
      }

      if (finding.proposedFix) {
        md += `#### Proposed Fix\n\`\`\`\n${finding.proposedFix}\n\`\`\`\n\n`;
      }

      if (finding.poc) {
        md += `#### Proof of Concept (PoC)\n\`\`\`${finding.poc.type || ''}\n${finding.poc.code}\n\`\`\`\n\n`;
        if (finding.poc.reproductionSteps && finding.poc.reproductionSteps.length > 0) {
          md += `**Reproduction Steps:**\n`;
          finding.poc.reproductionSteps.forEach((step, sIdx) => {
            md += `${sIdx + 1}. ${step}\n`;
          });
          md += `\n`;
        }
      }

      md += `---\n\n`;
    });
  }

  // Architectural Risks
  if (report.architectural_risks && report.architectural_risks.length > 0) {
    md += `## 3. Architectural Drift & Systemic Risks\n\n`;
    report.architectural_risks.forEach((risk) => {
      md += `- **${risk.pattern}:** ${risk.description}\n`;
    });
    md += `\n`;
  }

  return md;
}

export function generateTasksMarkdown(findings: FindingItem[]): string {
  if (findings.length === 0) {
    return '<!-- No security tasks to add -->\n';
  }

  let md = `## Security Remediation Tasks\n\n`;

  findings.forEach((f, idx) => {
    const taskId = f.id || `TASK-SEC-${String(idx + 1).padStart(3, '0')}`;
    md += `- [ ] **${taskId}: ${f.title}**\n`;
    md += `  - **Severity:** ${f.severity}\n`;
    md += `  - **Category:** ${f.category}${f.cwe ? ` (${f.cwe})` : ''}\n`;
    if (f.file) {
      md += `  - **Target File:** \`${f.file}${f.lineRange ? `:${f.lineRange}` : ''}\`\n`;
    }
    md += `  - **Description:** ${f.description}\n`;
    if (f.remediation) {
      md += `  - **Remediation:** ${f.remediation}\n`;
    }
    md += `  - **Acceptance Criteria:** Verify vulnerability is resolved and test passes.\n\n`;
  });

  return md;
}

export function appendTasksToFile(targetPath: string, tasksMarkdown: string): { created: boolean; updated: boolean } {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, tasksMarkdown, 'utf8');
    return { created: true, updated: false };
  }

  const existingContent = fs.readFileSync(targetPath, 'utf8');
  const separator = existingContent.endsWith('\n\n') ? '' : existingContent.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(targetPath, `${existingContent}${separator}${tasksMarkdown}`, 'utf8');
  return { created: false, updated: true };
}
