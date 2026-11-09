import fs from 'node:fs';
import path from 'node:path';
import { generateMarkdownReport } from '../../core/generator.js';
import { loadFindingsForCli } from '../loader.js';
import { FindingsReport } from '../../core/types.js';

export interface ReportCommandOptions {
  input?: string;
  output?: string;
  format?: 'markdown' | 'json';
}

export async function executeReportCommand(options: ReportCommandOptions): Promise<void> {
  const parsed = loadFindingsForCli(options.input, 'report');
  const reportData: FindingsReport = {
    ...parsed.report,
    document_type: parsed.report.document_type || 'security-review',
    review_type: parsed.report.review_type || 'audit',
  };

  const format = options.format || 'markdown';
  let outputContent: string;

  if (format === 'json') {
    outputContent = JSON.stringify(reportData, null, 2);
  } else {
    outputContent = generateMarkdownReport(reportData);
  }

  if (options.output === '-') {
    console.log(outputContent);
    return;
  }

  const dateStr = reportData.assessment_date || new Date().toISOString().split('T')[0];
  const targetPath = options.output ? path.resolve(options.output) : path.resolve('docs', 'security-reviews', `${dateStr}-security-report.md`);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, outputContent, 'utf8');
  console.log(`✓ Report generated at ${path.relative(process.cwd(), targetPath)} (${reportData.findings.length} findings)`);
}
