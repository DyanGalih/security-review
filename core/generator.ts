import fs from 'node:fs';
import path from 'node:path';
import { isLegacyFinding, resolveCompleteness } from './findings.js';
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
  asvsRequirements: string[];
  mitreTechniques: string[];
} {
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let informational = 0;

  const owaspSet = new Set<string>();
  const cweSet = new Set<string>();
  const asvsSet = new Set<string>();
  const mitreSet = new Set<string>();

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
    if (f.asvs) asvsSet.add(f.asvs);
    if (f.mitre) mitreSet.add(f.mitre);
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
    asvsRequirements: Array.from(asvsSet),
    mitreTechniques: Array.from(mitreSet),
  };
}

// ---------------------------------------------------------------------------
// Containment helpers. Finding text is untrusted; nothing it contains may open
// a heading, close a fence, or start a new block outside its own field.
// ---------------------------------------------------------------------------

// CommonMark treats \r, \r\n, and \n as line endings; every helper normalizes to \n first.
const LINE_ENDING = /\r\n?|\n/g;
// A whole line that is a thematic break (same marker three or more times, spaces allowed) or a setext
// underline (any run of = or -). Both are checked before container prefixes are stripped.
// Leading whitespace of any width is skipped: indented four or more spaces, the run is still a break or
// underline when it continues an enclosing list item.
const THEMATIC_BREAK = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_UNDERLINE = /^[ \t]*[-=]+[ \t]*$/;
// Leading whitespace plus any run of blockquote or list markers (`>`, `-`, `*`, `+`, `1.`), each optionally
// followed by spaces or tabs. A heading behind them still renders as a heading inside the container, and
// a marker indented four or more spaces still continues an enclosing list item.
const CONTAINER_PREFIX = /^((?:[ \t]*(?:>|[*+-]|\d{1,9}[.)]))*[ \t]*)/;
// What is left after the prefix: an ATX heading, a fence, or a thematic-break or setext run.
const BLOCK_STARTER = /^(#|`{3,}|~{3,}|\*{3,}|_{3,}|[-=]+\s*$)/;
const NOT_RECORDED = 'not recorded';

// ponytail: line-level escaping neutralizes every CommonMark block starter (ATX and setext headings,
// fenced-code openers, thematic breaks) at line start, behind container markers, and under indentation.
// Ceiling: raw HTML blocks are not neutralized, and emphasis markers at line start may be over-escaped.
// Upgrade path: render finding text through a CommonMark parser instead of escaping it.
function escapeLine(line: string): string {
  if (THEMATIC_BREAK.test(line) || SETEXT_UNDERLINE.test(line)) {
    return line.replace(/^([ \t]*)(\S)/, '$1\\$2');
  }
  const prefix = CONTAINER_PREFIX.exec(line)?.[1] ?? '';
  const rest = line.slice(prefix.length);
  return BLOCK_STARTER.test(rest) ? `${prefix}\\${rest}` : line;
}

/** Backslash-escapes any line that would start a heading, fence, thematic break, or setext underline. */
export function escapeBlockStarters(text: string): string {
  return text.replace(LINE_ENDING, '\n').split('\n').map(escapeLine).join('\n');
}

/** Collapses line breaks so text rendered inside a heading or list item stays on its line. */
export function inline(text: string): string {
  return text.replace(LINE_ENDING, ' ');
}

/** Table cell: no line breaks, no unescaped pipes; backslashes are escaped first so `\|` cannot re-arm a pipe. */
function cell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(LINE_ENDING, '<br>');
}

/** A fence long enough that no backtick run inside `content` can close it. */
export function fenceFor(content: string): string {
  const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

const FENCE_INFO = /^[A-Za-z0-9_-]+$/;

function fenced(content: string, info = ''): string {
  const fence = fenceFor(content);
  const safeInfo = FENCE_INFO.test(info) ? info : '';
  return `${fence}${safeInfo}\n${content}\n${fence}\n\n`;
}

function prose(title: string, text: string | undefined): string {
  if (!text) return '';
  return `#### ${title}\n${escapeBlockStarters(text)}\n\n`;
}

export function generateMarkdownReport(report: FindingsReport): string {
  const stats = computeReportStats(report.findings);
  const dateStr = report.assessment_date || new Date().toISOString().split('T')[0];
  const codebase = inline(report.codebase_analyzed || 'src/');
  const filesCount = report.total_files_analyzed ?? 0;
  const reviewType = report.review_type || 'audit';
  const cvssVersions = [...new Set(report.findings.flatMap(finding => finding.cvssVersion ? [finding.cvssVersion] : []))];
  const asvsRequirements = [...new Set([...(report.asvs_requirements ?? []), ...stats.asvsRequirements])];
  const completeness = resolveCompleteness(report);
  if (completeness.error) {
    throw new Error(completeness.error);
  }

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
    asvs_requirements: asvsRequirements,
    mitre_techniques: [...new Set([...(report.mitre_techniques ?? []), ...stats.mitreTechniques])],
    coverage_complete: completeness.complete,
  };
  const mappedAsvsVersions = [...new Set(asvsRequirements.flatMap(value => {
    const match = /^v(\d+\.\d+\.\d+)-/.exec(value);
    return match ? [match[1]] : [];
  }))];
  const hasLegacyAsvsRequirements = asvsRequirements.some(value => /^V\d+(?:\.\d+)*$/i.test(value));
  const asvsVersion = asvsRequirements.length > 0 && hasLegacyAsvsRequirements
    ? 'unknown'
    : report.asvs_version ?? (mappedAsvsVersions.length === 1
      ? mappedAsvsVersions[0]
      : asvsRequirements.length > 0 ? 'unknown' : undefined);
  if (asvsVersion) frontmatterObj.asvs_version = asvsVersion;
  if (!report.cvss_version && cvssVersions.length === 1) frontmatterObj.cvss_version = cvssVersions[0];
  for (const field of [
    'assessment_kind', 'source_artifacts', 'commit_or_branch', 'reviewed_commit', 'reviewed_branch',
    'working_tree_state', 'untracked_files_included', 'exclusions', 'unreadable_areas', 'cvss_version',
  ] as const) {
    const value = report[field];
    if (value !== undefined) frontmatterObj[field] = value;
  }
  if (report.assessment_narrative) frontmatterObj.assessment_narrative = report.assessment_narrative;
  if (!completeness.complete) {
    frontmatterObj.coverage_caveats = completeness.caveats;
  }

  if (report.findings.length > 0 && report.findings[0].id) {
    frontmatterObj.security_task = report.findings[0].id;
  }

  const frontmatterYaml = Object.entries(frontmatterObj)
    .map(([key, value]) => {
      const plainString = typeof value === 'string'
        && /^[A-Za-z][A-Za-z0-9_-]*$/.test(value)
        && !/^(?:true|false|null|yes|no|on|off)$/i.test(value);
      return `${key}: ${plainString ? value : JSON.stringify(value)}`;
    })
    .join('\n');

  let md = `---\n${frontmatterYaml}\n---\n\n`;
  md += `# Security Assessment Report\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Scope:** \`${codebase}\`  \n`;
  md += `**Overall Risk Posture:** **${stats.overallRisk}**\n\n`;

  // Executive Summary
  md += `## 1. Executive Summary\n\n`;
  const narrative = report.assessment_narrative ? escapeBlockStarters(report.assessment_narrative) : '';
  md += `${report.assessment_kind === 'report-synthesis'
    ? `This report synthesizes supplied assessment artifacts; no new source-code assessment was performed.${narrative ? ` ${narrative}` : ''}`
    : narrative || 'This assessment evaluated the target codebase for security vulnerabilities, architectural trust boundaries, and OWASP compliance.'}\n\n`;
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
      const fid = inline(finding.id || `SEC-${String(idx + 1).padStart(3, '0')}`);
      md += `### ${fid}: ${inline(finding.title)}\n\n`;
      md += `- **Severity:** ${inline(finding.severity)}\n`;
      md += `- **Category:** ${inline(finding.category)}\n`;
      if (finding.cwe) md += `- **CWE:** ${inline(finding.cwe)}\n`;
      if (finding.asvs) {
        const findingAsvsVersion = /^v(\d+\.\d+\.\d+)-/.exec(finding.asvs)?.[1];
        md += `- **ASVS Requirement:** ${inline(finding.asvs)}${findingAsvsVersion ? ` (ASVS ${findingAsvsVersion})` : ''}\n`;
      }
      if (finding.mitre) md += `- **MITRE ATT&CK:** ${inline(finding.mitre)}\n`;
      if (finding.cvssScore) md += `- **CVSS ${inline(finding.cvssVersion ?? 'unversioned')} Score:** ${inline(finding.cvssScore)}\n`;
      if (finding.file) {
        md += `- **Location:** \`${inline(finding.file)}${finding.lineRange ? `:${inline(finding.lineRange)}` : ''}\`\n`;
      }
      if (finding.verificationStatus) md += `- **Verification Status:** \`${inline(finding.verificationStatus)}\`\n`;
      md += `\n`;

      md += prose('Description', finding.description);
      md += prose('Exploit Scenario', finding.exploitScenario);
      md += prose('Impact', finding.impact);

      // Closure fields: a legacy finding states what it does not carry.
      const legacy = isLegacyFinding(finding);
      const confidence = legacy || !finding.confidence
        ? NOT_RECORDED
        : finding.confidence + (finding.confidenceRationale ? ` — ${escapeBlockStarters(finding.confidenceRationale)}` : '');
      md += `#### Confidence\n${confidence}\n\n`;
      md += `#### Counterevidence\n${finding.counterevidence ? escapeBlockStarters(finding.counterevidence) : NOT_RECORDED}\n\n`;
      md += `#### Severity Change Conditions\n${finding.severityChangeConditions ? escapeBlockStarters(finding.severityChangeConditions) : NOT_RECORDED}\n\n`;

      md += prose('Remediation', finding.remediation);

      if (finding.proposedFix) {
        md += `#### Proposed Fix\n${fenced(finding.proposedFix)}`;
      }

      if (finding.poc) {
        md += `#### Proof of Concept (PoC)\n${fenced(finding.poc.code, finding.poc.type || '')}`;
        if (finding.poc.reproductionSteps && finding.poc.reproductionSteps.length > 0) {
          md += `**Reproduction Steps:**\n`;
          finding.poc.reproductionSteps.forEach((step, sIdx) => {
            md += `${sIdx + 1}. ${inline(escapeBlockStarters(step))}\n`;
          });
          md += `\n`;
        }
      }

      md += `---\n\n`;
    });
  }

  // Coverage: what was reviewed and how each surface closed.
  md += `## 3. Coverage\n\n`;
  const coverage = report.coverage ?? [];
  if (coverage.length === 0) {
    md += `No coverage was recorded.\n\n`;
  } else {
    md += `| Surface | Risk Area | Outcome | Evidence |\n`;
    md += `|---|---|---|---|\n`;
    for (const entry of coverage) {
      md += `| ${cell(entry.surface)} | ${cell(entry.riskArea)} | ${cell(entry.outcome)} | ${cell(entry.evidence ?? '')} |\n`;
    }
    md += `\n`;
  }
  md += `**Completeness:** ${completeness.complete ? 'complete' : 'incomplete'}\n`;
  if (!completeness.complete) {
    for (const caveat of completeness.caveats) {
      md += `- ${inline(escapeBlockStarters(caveat))}\n`;
    }
  }
  md += `\n`;

  // Architectural Risks
  if (report.architectural_risks && report.architectural_risks.length > 0) {
    md += `## 4. Architectural Drift & Systemic Risks\n\n`;
    report.architectural_risks.forEach((risk) => {
      md += `- **${inline(escapeBlockStarters(risk.pattern))}:** ${inline(escapeBlockStarters(risk.description))}\n`;
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
    const taskId = inline(f.id || `TASK-SEC-${String(idx + 1).padStart(3, '0')}`);
    md += `- [ ] **${taskId}: ${inline(f.title)}**\n`;
    md += `  - **Severity:** ${inline(f.severity)}\n`;
    md += `  - **Category:** ${inline(f.category)}${f.cwe ? ` (${inline(f.cwe)})` : ''}\n`;
    if (f.file) {
      md += `  - **Target File:** \`${inline(f.file)}${f.lineRange ? `:${inline(f.lineRange)}` : ''}\`\n`;
    }
    md += `  - **Description:** ${inline(f.description)}\n`;
    if (f.remediation) {
      md += `  - **Remediation:** ${inline(f.remediation)}\n`;
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
