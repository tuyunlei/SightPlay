import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkCloudflareWrapper } from './architecture-fitness/cloudflare-rule.mjs';
import { checkApplicationComposition } from './architecture-fitness/composition-rule.mjs';
import { checkExternalInputBoundaries } from './architecture-fitness/ingress-rule.mjs';
import { checkRuntimeLifecycle } from './architecture-fitness/lifecycle-rule.mjs';
import { checkPackageDependencies, loadPackages } from './architecture-fitness/package-rules.mjs';

export function checkArchitectureFitness(projectRoot) {
  const violations = [];
  const packages = loadPackages(projectRoot, violations);
  checkPackageDependencies(projectRoot, packages, violations);
  checkExternalInputBoundaries(projectRoot, packages, violations);
  checkRuntimeLifecycle(projectRoot, packages, violations);
  checkApplicationComposition(projectRoot, violations);
  checkCloudflareWrapper(projectRoot, violations);
  return violations;
}

function runCli() {
  const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
  const violations = checkArchitectureFitness(projectRoot);
  if (violations.length === 0) {
    console.log('Architecture fitness checks passed.');
    return;
  }
  console.error('Architecture fitness checks failed:');
  for (const violation of violations) console.error(`- ${violation.file}: ${violation.message}`);
  process.exitCode = 1;
}

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
