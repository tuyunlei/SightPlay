import { existsSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, sourceFiles } from './source.mjs';

export function checkCloudflareWrapper(projectRoot, violations) {
  const routesRoot = path.join(projectRoot, 'functions', 'api');
  if (!existsSync(routesRoot)) return;
  const routes = sourceFiles(routesRoot);
  const expected = path.join(routesRoot, '[[path]].ts');
  if (routes.length !== 1 || routes[0] !== expected) {
    violations.push({
      file: 'functions/api',
      message:
        'Cloudflare must expose exactly one /api/* catch-all so path and method policy stay in the server application.',
    });
    return;
  }
  const source = parseSource(expected);
  const statement = source.statements[0];
  const element =
    statement &&
    ts.isExportDeclaration(statement) &&
    statement.exportClause &&
    ts.isNamedExports(statement.exportClause) &&
    statement.exportClause.elements.length === 1
      ? statement.exportClause.elements[0]
      : null;
  const valid =
    source.statements.length === 1 &&
    statement &&
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    statement.moduleSpecifier.text === '../_handler' &&
    element?.propertyName?.text === 'handlePagesRequest' &&
    element.name.text === 'onRequest';
  if (!valid) {
    violations.push({
      file: normalize(path.relative(projectRoot, expected)),
      message:
        'The Cloudflare catch-all is a hosting adapter only and must re-export handlePagesRequest as onRequest.',
    });
  }
}
