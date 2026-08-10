import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

type FailureRecord = {
  title: string;
  project: string;
  location: { file: string; line: number; column: number };
  retry: number;
  status: string;
  errors: string[];
  annotations: Array<{ type: string; description?: string }>;
  attachments: Array<{ name: string; path?: string; contentType: string }>;
  reproduce: string;
};

export default class AiFailureReporter implements Reporter {
  private rootDir = process.cwd();
  private failures: FailureRecord[] = [];

  onBegin(config: FullConfig): void {
    this.rootDir = config.rootDir;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === test.expectedStatus) return;
    const relativeFile = path.relative(this.rootDir, test.location.file);
    this.failures.push({
      title: test.titlePath().join(' › '),
      project: test.parent.project()?.name ?? 'unknown',
      location: { ...test.location, file: relativeFile },
      retry: result.retry,
      status: result.status,
      errors: result.errors.map((error) => error.message ?? error.value ?? String(error)),
      annotations: test.annotations,
      attachments: result.attachments.map((attachment) => ({
        name: attachment.name,
        path: attachment.path,
        contentType: attachment.contentType,
      })),
      reproduce: `pnpm exec playwright test ${JSON.stringify(`${relativeFile}:${test.location.line}`)} --project=${JSON.stringify(test.parent.project()?.name ?? '')} --retries=0`,
    });
  }

  onEnd(result: FullResult): void {
    const outputDirectory = path.resolve('test-results');
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      path.join(outputDirectory, 'ai-failures.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          status: result.status,
          generatedAt: new Date().toISOString(),
          failures: this.failures,
        },
        null,
        2
      )
    );
  }
}
