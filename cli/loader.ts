import fs from 'node:fs';
import { resolveLatestFindingsJson } from '../core/detector.js';
import { FindingsValidationError, parseFindingsReport, ParsedFindings } from '../core/findings.js';

/**
 * Common findings-loader for CLI commands (`report`, `tasks`, `sdd propose`).
 * Resolves input, reads file/stdin, validates findings JSON, logs warnings/errors, and exits 1 on error.
 */
export function loadFindingsForCli(input: string | undefined, commandLabel: string): ParsedFindings {
  let inputPath = input;
  if (!inputPath) {
    inputPath = resolveLatestFindingsJson(process.cwd());
    if (!inputPath) {
      console.error(`[${commandLabel} error]: Missing required --input argument and no findings.json was found in workspace.`);
      process.exit(1);
    }
  }

  let rawJson: string;
  if (inputPath === '-') {
    rawJson = fs.readFileSync(0, 'utf8');
  } else {
    if (!fs.existsSync(inputPath)) {
      console.error(`[${commandLabel} error]: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    rawJson = fs.readFileSync(inputPath, 'utf8');
  }

  try {
    const parsed = parseFindingsReport(rawJson);
    for (const warning of parsed.warnings) {
      console.error(`[${commandLabel} warning]: ${warning}`);
    }
    return parsed;
  } catch (err: unknown) {
    if (err instanceof FindingsValidationError) {
      for (const error of err.errors) {
        console.error(`[${commandLabel} error]: ${error}`);
      }
    } else {
      console.error(`[${commandLabel} error]: Failed to parse findings JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }
}
