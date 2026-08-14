import { existsSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, sourceFiles } from './source.mjs';

function importsBrowserAdapters(sourceFile) {
  return sourceFile.statements.some(
    (statement) =>
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      (statement.moduleSpecifier.text === '@sightplay/browser-adapters' ||
        statement.moduleSpecifier.text.startsWith('@sightplay/browser-adapters/'))
  );
}

export function checkApplicationComposition(projectRoot, violations) {
  for (const relativeRoot of ['app', 'components', 'features']) {
    const root = path.join(projectRoot, relativeRoot);
    if (!existsSync(root)) continue;
    for (const absolute of sourceFiles(root)) {
      if (!importsBrowserAdapters(parseSource(absolute))) continue;
      violations.push({
        file: normalize(path.relative(projectRoot, absolute)),
        message:
          'UI and application modules cannot construct browser adapters; inject them once from App.tsx.',
      });
    }
  }
}
