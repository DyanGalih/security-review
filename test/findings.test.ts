import { describe, it, expect } from 'vitest';
import { FindingsValidationError, parseFindingsReport, resolveCompleteness } from '../core/findings.js';
import { COMPLETENESS_NOT_RECORDED } from '../core/schema.js';

const fullFinding = {
  id: 'SEC-001',
  title: 'SQL injection in search',
  severity: 'HIGH',
  category: 'A05:Injection',
  description: 'Concatenated query.',
  confidence: 'medium',
  confidenceRationale: 'static-only trace; service could not be run',
  counterevidence: 'No parameterisation or allow-list found on this path.',
  severityChangeConditions: 'Proof the route is unauthenticated would raise this to critical.',
};

const legacyFinding = {
  id: 'SEC-002',
  title: 'Missing auth header check',
  severity: 'HIGH',
  category: 'A01:Broken Access Control',
  description: 'Admin route without middleware.',
};

function errorsOf(raw: unknown): string[] {
  try {
    parseFindingsReport(JSON.stringify(raw));
  } catch (err: unknown) {
    if (err instanceof FindingsValidationError) return err.errors;
    throw err;
  }
  return [];
}

describe('parseFindingsReport', () => {
  it('accepts a full finding and an array input', () => {
    const { report, warnings } = parseFindingsReport(JSON.stringify([fullFinding]));
    expect(report.findings).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it('rejects medium confidence without a rationale, naming the finding and field', () => {
    const errors = errorsOf({ findings: [{ ...fullFinding, confidenceRationale: undefined }] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('SEC-001');
    expect(errors[0]).toContain('confidenceRationale');
  });

  it('accepts high confidence without a rationale', () => {
    const { report } = parseFindingsReport(
      JSON.stringify([{ ...fullFinding, confidence: 'high', confidenceRationale: undefined }])
    );
    expect(report.findings[0].confidence).toBe('high');
  });

  it('rejects missing or blank counterevidence', () => {
    expect(errorsOf([{ ...fullFinding, counterevidence: '   ' }])[0]).toContain('counterevidence');
    expect(errorsOf([{ ...fullFinding, counterevidence: undefined }])[0]).toContain('counterevidence');
  });

  it('treats a finding with none of the closure fields as legacy, with one warning per field class', () => {
    const { report, warnings } = parseFindingsReport(JSON.stringify([legacyFinding, legacyFinding]));
    expect(report.findings).toHaveLength(2);
    expect(warnings).toHaveLength(4);
    expect(warnings.some((w) => w.startsWith('confidence '))).toBe(true);
    expect(warnings.some((w) => w.startsWith('counterevidence '))).toBe(true);
  });

  it('does not treat a partially filled finding as legacy', () => {
    const errors = errorsOf([{ ...legacyFinding, confidence: 'medium' }]);
    expect(errors.some((e) => e.includes('confidenceRationale'))).toBe(true);
    expect(errors.some((e) => e.includes('counterevidence'))).toBe(true);
    expect(errors.some((e) => e.includes('severityChangeConditions'))).toBe(true);
  });

  it('reports a null entry as an error instead of throwing a TypeError', () => {
    const errors = errorsOf({ findings: [null] });
    expect(errors).toEqual(['findings[0]: must be an object']);
  });

  it('rejects an invalid verificationStatus', () => {
    expect(errorsOf([{ ...fullFinding, verificationStatus: 'MAYBE' }])[0]).toContain('verificationStatus');
  });

  it('validates coverage entries', () => {
    const ruledOut = errorsOf({
      findings: [],
      coverage: [{ surface: 'POST /login', riskArea: 'auth bypass', outcome: 'ruled_out' }],
    });
    expect(ruledOut).toHaveLength(1);
    expect(ruledOut[0]).toContain('POST /login');
    expect(ruledOut[0]).toContain('evidence');

    const unknown = errorsOf({
      findings: [],
      coverage: [{ surface: 'x', riskArea: 'y', outcome: 'skipped' }],
    });
    expect(unknown[0]).toContain('reported, ruled_out, no_issue_found, not_applicable, needs_follow_up');
  });

  it('defaults absent completeness to false with the standard caveat', () => {
    const { report } = parseFindingsReport(JSON.stringify({ findings: [] }));
    expect(report.coverage_complete).toBe(false);
    expect(report.coverage_caveats).toEqual([COMPLETENESS_NOT_RECORDED]);
  });

  it('rejects coverage_complete false with empty caveats', () => {
    const errors = errorsOf({ findings: [], coverage_complete: false, coverage_caveats: [] });
    expect(errors[0]).toContain('coverage_caveats');
  });

  it('rejects an unknown report-level review_type', () => {
    expect(errorsOf({ findings: [], review_type: 'remediation' })[0]).toContain('review_type');
    expect(parseFindingsReport(JSON.stringify({ findings: [], review_type: 'verify' })).report.review_type).toBe('verify');
  });

  it('rejects malformed JSON and non-report shapes', () => {
    expect(() => parseFindingsReport('{')).toThrow(FindingsValidationError);
    expect(() => parseFindingsReport('42')).toThrow(FindingsValidationError);
    expect(errorsOf({ findings: 'nope' })).toEqual(['findings: must be an array']);
  });
});

describe('resolveCompleteness', () => {
  it('passes through a complete report', () => {
    expect(resolveCompleteness({ coverage_complete: true })).toEqual({ complete: true, caveats: [] });
  });

  it('flags a non-boolean value', () => {
    expect(resolveCompleteness({ coverage_complete: 'yes' }).error).toContain('coverage_complete');
  });
});
