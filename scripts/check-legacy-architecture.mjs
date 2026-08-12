import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const legacyRoots = ['hooks', 'services', 'store', 'views'];
const allowlistPath = path.join(projectRoot, 'architecture/legacy-business-files.txt');

function isProductionSource(relativePath) {
  return (
    /\.(?:[cm]?[jt]s|[jt]sx)$/.test(relativePath) &&
    !relativePath.includes('/__tests__/') &&
    !/\.(test|spec)\.(?:[cm]?[jt]s|[jt]sx)$/.test(relativePath) &&
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
  const currentFiles = legacyRoots.flatMap(findSourceFiles).sort();
  const current = new Set(currentFiles);
  const unexpected = currentFiles.filter((file) => !allowed.has(file));
  const stale = allowlist.filter((file) => !current.has(file));

  if (unexpected.length > 0) {
    console.error('New production files cannot be added to legacy business directories:');
    for (const file of unexpected) console.error(`- ${file}`);
    console.error('Create or extend a capability package instead; the allowlist may only shrink.');
    process.exitCode = 1;
  }

  if (stale.length > 0) {
    console.error('Deleted legacy files must also be removed from the migration baseline:');
    for (const file of stale) console.error(`- ${file}`);
    console.error('The manifest must exactly match the remaining legacy production sources.');
    process.exitCode = 1;
  }
}
