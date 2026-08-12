import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const legacyRoots = ['hooks', 'services', 'store', 'views'];
const allowlistPath = path.join(projectRoot, 'architecture/legacy-business-files.txt');

function isProductionSource(relativePath) {
  return (
    /\.(ts|tsx)$/.test(relativePath) &&
    !relativePath.includes('/__tests__/') &&
    !/\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
    !relativePath.endsWith('/testHelpers.ts')
  );
}

function findSourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(projectRoot, relativeDirectory);
  if (!existsSync(absoluteDirectory)) return [];

  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    return entry.isDirectory()
      ? findSourceFiles(relativePath)
      : isProductionSource(relativePath)
        ? [relativePath]
        : [];
  });
}

const allowlist = readFileSync(allowlistPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const sortedAllowlist = [...new Set(allowlist)].sort();

if (allowlist.join('\n') !== sortedAllowlist.join('\n')) {
  console.error('architecture/legacy-business-files.txt must be sorted and contain no duplicates.');
  process.exitCode = 1;
} else {
  const allowed = new Set(allowlist);
  const unexpected = legacyRoots.flatMap(findSourceFiles).sort().filter((file) => !allowed.has(file));

  if (unexpected.length > 0) {
    console.error('New production files cannot be added to legacy business directories:');
    for (const file of unexpected) console.error(`- ${file}`);
    console.error('Create or extend a capability package instead; the allowlist may only shrink.');
    process.exitCode = 1;
  }
}
