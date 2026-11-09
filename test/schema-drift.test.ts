import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  COVERAGE_FIELDS,
  COVERAGE_OUTCOMES,
  CONFIDENCE_LEVELS,
  FINDING_FIELDS,
  REQUIRED_FRONTMATTER_FIELDS,
  REVIEW_TYPES,
  VERIFICATION_STATUSES,
} from '../core/schema.js';
import type { ConfidenceLevel, CoverageOutcome, ReviewType, VerificationStatus } from '../core/types.js';
import { generateMarkdownReport } from '../core/generator.js';

/**
 * Report-schema drift test (ARCH-P0-3). `docs/field-registry.md` is the contract; `schema.ts`
 * is its one code owner. Everything else must agree with both. Every extraction asserts a
 * non-empty result so a reformatted table fails loudly instead of passing vacuously.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const registry = read('docs/field-registry.md');
const promptFiles = fs
  .readdirSync(path.join(ROOT, 'commands'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ name: f, text: read(`commands/${f}`) }));

const REVIEW_PROMPTS = ['security-audit.md', 'security-review-staged.md', 'security-review-branch.md', 'security-verify.md'];
const DIFF_PROMPTS = ['security-review-branch.md', 'security-review-staged.md'];

const sorted = (list: readonly string[]) => [...list].sort();
const backticked = (cell: string) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

/** Table rows (cells split on `|`) of the section whose heading matches, up to the next heading. */
function sectionRows(heading: string): string[][] {
  const start = registry.indexOf(`\n${heading}\n`);
  expect(start, `registry section "${heading}"`).toBeGreaterThan(-1);
  const rest = registry.slice(start + heading.length + 2);
  const end = rest.search(/\n#{2,3} /);
  const section = end === -1 ? rest : rest.slice(0, end);
  return section
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => line.slice(1, -1).split('|').map((c) => c.trim()));
}

function firstField(row: string[]): string {
  return backticked(row[0])[0];
}

/**
 * The text of one prompt section: from `heading` to the next heading of the same or a higher level.
 * Scoping each assertion to the section that owns the rule keeps a phrase elsewhere in the file from
 * masking its removal.
 */
function promptSection(name: string, heading: string): string {
  const text = promptFiles.find((p) => p.name === name)?.text ?? '';
  const marker = `\n${heading}\n`;
  const start = text.indexOf(marker);
  expect(start, `${name} has ${heading}`).toBeGreaterThan(-1);
  const level = heading.match(/^#+/)![0].length;
  const rest = text.slice(start + marker.length);
  const end = rest.search(new RegExp(`\\n#{1,${level}} `));
  return end === -1 ? rest : rest.slice(0, end);
}

function expectPhrases(name: string, heading: string, phrases: readonly string[]): void {
  const body = promptSection(name, heading);
  for (const phrase of phrases) expect(body, `${name} ${heading} contains "${phrase}"`).toContain(phrase);
}

describe('report schema drift', () => {
  it('registry review_type enum matches REVIEW_TYPES', () => {
    const row = sectionRows('## Document-Level Fields').find((r) => firstField(r) === 'review_type');
    expect(row).toBeDefined();
    expect(sorted(backticked(row![2]))).toEqual(sorted(REVIEW_TYPES));
    const indexRow = sectionRows('### Column Definitions').find((r) => firstField(r) === 'review_type');
    expect(indexRow).toBeDefined();
    expect(sorted(backticked(indexRow![2]))).toEqual(sorted(REVIEW_TYPES));
  });

  it('field-summaries.yml review_type enum matches REVIEW_TYPES', () => {
    const summaries = yaml.load(read('docs/field-summaries.yml')) as {
      document_fields: { review_type: { enum: string[] } };
      coverage_entry_fields: { outcome: { enum: string[] } };
      finding_level_fields: { confidence: { enum: string[] } };
    };
    expect(sorted(summaries.document_fields.review_type.enum)).toEqual(sorted(REVIEW_TYPES));
    expect(sorted(summaries.coverage_entry_fields.outcome.enum)).toEqual(sorted(COVERAGE_OUTCOMES));
    expect(sorted(summaries.finding_level_fields.confidence.enum)).toEqual(sorted(CONFIDENCE_LEVELS));
  });

  it('registry required frontmatter fields match REQUIRED_FRONTMATTER_FIELDS', () => {
    const rows = [
      ...sectionRows('## Document-Level Fields'),
      ...sectionRows('## Risk and Severity Fields'),
      ...sectionRows('## Classification Fields'),
    ];
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) expect(row, `row ${firstField(row)} has a Required cell`).toHaveLength(6);
    const required = rows.filter((r) => r[5] === 'Yes').map(firstField);
    expect(sorted(required)).toEqual(sorted(REQUIRED_FRONTMATTER_FIELDS));
    const conditional = rows.find((r) => firstField(r) === 'coverage_caveats');
    expect(conditional?.[5]).toBe('When false');
  });

  it('registry finding and coverage fields match FINDING_FIELDS and COVERAGE_FIELDS', () => {
    const findingFields = sectionRows('## Finding-Level Fields').map(firstField);
    expect(sorted(findingFields)).toEqual(sorted(FINDING_FIELDS));
    const coverageFields = sectionRows('## Coverage Entry Fields').map(firstField);
    expect(sorted(coverageFields)).toEqual(sorted(COVERAGE_FIELDS));
    const outcomeRow = sectionRows('## Coverage Entry Fields').find((r) => firstField(r) === 'outcome');
    expect(sorted(backticked(outcomeRow![2]))).toEqual(sorted(COVERAGE_OUTCOMES));
    const statusRow = sectionRows('## Finding-Level Fields').find((r) => firstField(r) === 'verificationStatus');
    expect(sorted(backticked(statusRow![2]))).toEqual(sorted(VERIFICATION_STATUSES));
  });

  it('every prompt document header uses an allowed review_type and states coverage_complete', () => {
    const headers = promptFiles.flatMap(({ name, text }) =>
      [...text.matchAll(/^review_type: (\S+)$/gm)].map((m) => ({ name, value: m[1] }))
    );
    expect(headers.length).toBeGreaterThanOrEqual(8);
    for (const { name, value } of headers) {
      expect(REVIEW_TYPES, `${name} header review_type ${value}`).toContain(value);
    }
    const withHeader = new Set(headers.map((h) => h.name));
    for (const name of withHeader) {
      const text = promptFiles.find((p) => p.name === name)!.text;
      expect(/^coverage_complete: /m.test(text), `${name} header has coverage_complete`).toBe(true);
      for (const field of REQUIRED_FRONTMATTER_FIELDS) {
        expect(new RegExp(`^${field}: `, 'm').test(text), `${name} header has ${field}`).toBe(true);
      }
    }
  });

  it('every prompt review_type description line names every REVIEW_TYPES member', () => {
    const lines = promptFiles.flatMap(({ name, text }) =>
      [...text.matchAll(/^\s+review_type: "Which command generated this document: ([^"]+)"/gm)].map((m) => ({
        name,
        value: m[1],
      }))
    );
    expect(lines.length).toBeGreaterThanOrEqual(6);
    for (const { name, value } of lines) {
      for (const type of REVIEW_TYPES) expect(value, `${name} description lists ${type}`).toContain(type);
    }
  });

  it('a rendered report carries every required frontmatter key', () => {
    const markdown = generateMarkdownReport({ findings: [] });
    const frontmatter = yaml.load(markdown.split('\n---\n')[0].replace(/^---\n/, '')) as Record<string, unknown>;
    for (const key of REQUIRED_FRONTMATTER_FIELDS) expect(frontmatter, `frontmatter has ${key}`).toHaveProperty(key);
  });

  it('review prompts carry the closure and coverage sections; diff prompts carry Diff Scope', () => {
    for (const name of REVIEW_PROMPTS) {
      const text = promptFiles.find((p) => p.name === name)?.text ?? '';
      expect(text, `${name} has ## Candidate Closure`).toContain('\n## Candidate Closure\n');
      expect(text, `${name} has ## Coverage Ledger`).toContain('\n## Coverage Ledger\n');
      expect(text, `${name} has ## Coverage section in output format`).toContain('## Coverage');
      const closure = text.split('\n## Candidate Closure\n')[1];
      for (const state of ['`confirmed`', '`ruled_out`', '`open_proof_gap`', 'does not rule out']) {
        expect(closure, `${name} closure section mentions ${state}`).toContain(state);
      }
      for (const field of ['`counterevidence`', '`confidence`', '`confidenceRationale`', '`severityChangeConditions`']) {
        expect(closure, `${name} closure section names ${field}`).toContain(field);
      }
      for (const outcome of COVERAGE_OUTCOMES) expect(text, `${name} lists outcome ${outcome}`).toContain(`\`${outcome}\``);
    }
    for (const name of DIFF_PROMPTS) {
      const text = promptFiles.find((p) => p.name === name)?.text ?? '';
      expect(text, `${name} has ## Diff Scope`).toContain('\n## Diff Scope\n');
      expect(text).not.toContain('Confirmed Secure Patterns');
    }
  });

  it('review prompts carry the finding bar, and audit and verify carry their execution and focus rules', () => {
    const elements = [
      'lower-trust principal',
      'accepted input or action',
      'intended control',
      'crossed boundary',
      'affected principal or resource',
      'observed or owner-observable result',
    ];
    for (const name of REVIEW_PROMPTS) {
      expectPhrases(name, '## Finding Bar', [
        ...elements,
        'not yet established',
        'needs_follow_up',
        'shown absent in source',
        'not_applicable',
        'only narrows the principal',
        'Only `/sr-verify` executes target code',
      ]);
      expectPhrases(name, '### Not a finding', ['checklist', 'defense-in-depth', 'guessed', 'self-impact', 'stronger than', 'hardening note']);
      expectPhrases(name, '## Candidate Closure', [
        '`high` only for an executed reproduction',
        'meets the Finding Bar',
        'shown absent in source',
        'only narrows the principal',
      ]);
      expectPhrases(name, '## Coverage Ledger', ['per surface and risk area']);
    }

    expectPhrases('security-audit.md', '## Determine Review Scope', ['ask one question']);
    expectPhrases('security-audit.md', '## Focus Selection', ['not from a dependency or language name', 'not_applicable']);

    expectPhrases('security-verify.md', '### Execution Sandbox', [
      'no external network',
      'empty allow-listed environment',
      'read-only target and toolchain',
      'writes limited to a scratch directory',
      'CPU, memory, process, disk, and time limits',
      'no host paths visible beyond the target, toolchain, and scratch directory',
      'Never copy secret values',
      'scratch directory',
      'local instance started inside the sandbox',
      'Execution Environment',
    ]);
    expectPhrases('security-verify.md', '### Without a Sandbox', ['confidenceRationale', 'reported', 'coverage_complete: false', 'decline']);
    expectPhrases('security-verify.md', '### Independent Verification', ['Verification was not independent']);

    const verify = promptFiles.find((p) => p.name === 'security-verify.md')!.text;
    const mitigated = verify.split('\n').find((line) => line.includes('**`MITIGATED`**'));
    expect(mitigated, 'security-verify.md defines MITIGATED').toBeDefined();
    expect(mitigated, 'MITIGATED records the control as counterevidence').toContain('counterevidence');
    expect(mitigated, 'MITIGATED applies only while the bar is met on another path').toContain('another path');
    expect(mitigated, 'a control on every path is FALSE_POSITIVE with ruled_out coverage').toContain('`ruled_out` coverage');
    expect(mitigated, 'MITIGATED does not recommend hardening').not.toContain('hardening is recommended');
    const verdictLine = (status: string) => verify.split('\n').find((line) => line.includes(`**\`${status}\`**`)) ?? '';
    expect(verdictLine('CONFIRMED'), 'CONFIRMED requires the Finding Bar').toContain('Finding Bar');
    expect(verdictLine('FALSE_POSITIVE'), 'FALSE_POSITIVE maps to ruled_out').toContain('`ruled_out` coverage');
    expect(verdictLine('FALSE_POSITIVE'), 'FALSE_POSITIVE covers absent bar elements').toContain('`not_applicable` coverage');
    expect(verdictLine('FALSE_POSITIVE'), 'generic trust needs confirmation for that call').toContain('confirmed for that call');
    expect(promptSection('security-verify.md', '### Classification Taxonomy:'), 'open proof gap has no status').toContain('leave it out of the verification-status counts');
    expect(verdictLine('FIX_SUGGESTION'), 'FIX_SUGGESTION applies only to a previously reported finding').toContain('previously reported finding');
    expect(verdictLine('FIX_SUGGESTION'), 'new defense-in-depth advice stays below the bar').toContain('Not a finding');
    expect(promptSection('security-verify.md', '### Execution Sandbox'), 'E2E is limited to the confirmed origin').toContain('confirmed under Target URL Resolution');
    expect(promptSection('security-verify.md', '### Mandatory PoC Safety Floor'), 'specs are proposed, not written into the target').toContain('do not write it into the target repository');
    const header = promptSection('security-verify.md', '## Document Header');
    const confidenceRow = registry.split('\n').find((line) => line.startsWith('| `confidence` |')) ?? '';
    expect(confidenceRow, 'registry reserves high for an executed reproduction').toContain('`high`: executed reproduction only');
    expect(confidenceRow, 'registry no longer allows high for an unexecuted trace').not.toContain('complete reachable trace');
    expect(header, 'counts use the current severity').toContain('at their current severity');
    expect(header, 'MITIGATED counts at its lowered severity').toContain('`MITIGATED`, which counts at its lowered severity');
    expect(header, 'no blanket original-severity count').not.toContain('findings) at their original severity');
    expect(promptSection('security-verify.md', '## 2. Detailed Finding Verifications & PoC Reproductions'), 'template exposes the current rating').toContain('**Current Severity**');
    expect(promptSection('security-verify.md', '## 1. Executive Verification Summary'), 'summary table shows the counted rating').toContain('| Original Severity | Current Severity |');
    const numbered = verify.split('\n').map((line) => line.match(/^## (\d+)\. /)?.[1]).filter(Boolean);
    expect(numbered, 'verify output sections are numbered once each, in order').toEqual(numbered.map((_, i) => String(i + 1)));
    expect(promptSection('security-verify.md', '### 1. Target URL Resolution'), 'logins use a generated dummy account').toContain('never pass credentials through the environment, hardcode them in a spec');
    expect(read('examples/example-verify-e2e.md'), 'the E2E example passes no environment credentials').not.toMatch(/process\.env\.\w*(PASSWORD|TOKEN|SECRET|USERNAME)/);
    const literalCredential = /(password|passwd|secret|token|username|user)\]?['"]?\s*[:=,]\s*['"`]/i;
    for (const rel of ['examples/example-verify-e2e.md', 'commands/security-verify.md']) {
      expect(read(rel), `${rel} hardcodes no credential`).not.toMatch(literalCredential);
    }
    for (const heading of ['## 1. Executive Verification Summary', '## 2. Detailed Finding Verifications & PoC Reproductions']) {
      const body = promptSection('security-verify.md', heading);
      expect(body, `security-verify.md ${heading} shows confidence as a label, not a percentage`).not.toMatch(/\d+\s*%/);
    }
  });

  it('types.ts unions derive from the schema constants (compile-time)', () => {
    REVIEW_TYPES satisfies readonly ReviewType[];
    CONFIDENCE_LEVELS satisfies readonly ConfidenceLevel[];
    COVERAGE_OUTCOMES satisfies readonly CoverageOutcome[];
    VERIFICATION_STATUSES satisfies readonly VerificationStatus[];
    const exhaustive: Record<ReviewType, true> = {
      audit: true, branch: true, staged: true, plan: true, tasks: true, followup: true, export: true, verify: true,
    };
    expect(Object.keys(exhaustive)).toHaveLength(REVIEW_TYPES.length);
  });
});
