import fs from 'node:fs';
import path from 'node:path';
import { generateMarkdownReport } from '../../core/generator.js';
import { FindingsReport } from '../../core/types.js';

export interface ReportCommandOptions {
  input?: string;
  output?: string;
  format?: 'markdown' | 'json';
}

export async function executeReportCommand(options: ReportCommandOptions): Promise<void> {
  const inputPath = options.input;
  if (!inputPath) {
    console.error('[report error]: Missing required --input argument (path to findings JSON file)');
    process.exit(1);
  }

  let rawJson: string;
  if (inputPath === '-') {
    rawJson = fs.readFileSync(0, 'utf8');
  } else {
    if (!fs.existsSync(inputPath)) {
      console.error(`[report error]: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    rawJson = fs.readFileSync(inputPath, 'utf8');
  }

  let reportData: FindingsReport;
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      reportData = { findings: parsed };
    } else if (parsed && typeof parsed === 'object') {
      reportData = {
        document_type: parsed.document_type || 'security-review',
        review_type: parsed.review_type || 'audit',
        assessment_date: parsed.assessment_date,
        codebase_analyzed: parsed.codebase_analyzed,
        total_files_analyzed: parsed.total_files_analyzed,
        overall_risk: parsed.overall_risk,
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        architectural_risks: parsed.architectural_risks,
      };
    } else {
      throw new Error('Invalid JSON structure. Expected array or findings report object.');
    }
  } catch (err: any) {
    console.error(`[report error]: Failed to parse findings JSON: ${err.message}`);
    process.exit(1);
  }

  const format = options.format || 'markdown';
  let outputContent: string;

  if (format === 'json') {
    outputContent = JSON.stringify(reportData, null, 2);
  } else {
    outputContent = generateMarkdownReport(reportData);
  }

  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, outputContent, 'utf8');
    console.log(`✓ Report generated at ${options.output} (${reportData.findings.length} findings)`);
  } else {
    console.log(outputContent);
  }
}
