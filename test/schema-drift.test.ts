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
