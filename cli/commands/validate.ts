import { validateReportFrontmatter } from '../../core/validator.js';

export interface ValidateCliOptions {
  file: string;
  json?: boolean;
}

export async function executeValidateCommand(options: ValidateCliOptions): Promise<void> {
  try {
    const result = await validateReportFrontmatter(options.file);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exit(1);
      return;
    }

    if (result.valid) {
      console.log(`✅ [VALID] ${options.file} matches frontmatter specifications.`);
      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          console.log(`   ⚠️ [${issue.severity}] ${issue.message}`);
        }
      }
    } else {
      console.error(`❌ [INVALID] ${options.file} failed frontmatter validation:`);
      for (const issue of result.issues) {
        console.error(`   - [${issue.severity}] ${issue.message}`);
      }
      process.exit(1);
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error(`[validate error]: ${error.message || String(err)}`);
    process.exit(1);
  }
}
