import { existsSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, sourceFiles } from './source.mjs';

function directReExport(statement) {
  if (
    !ts.isExportDeclaration(statement) ||
    !statement.moduleSpecifier ||
    !ts.isStringLiteral(statement.moduleSpecifier) ||
    statement.moduleSpecifier.text !== '../_handler' ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause) ||
    statement.exportClause.elements.length !== 1
  ) {
    return false;
  }
  const element = statement.exportClause.elements[0];
  return element.propertyName?.text === 'handlePagesRequest' && element.name.text === 'onRequest';
}

function importedHandler(statement) {
  if (
    !ts.isImportDeclaration(statement) ||
    !ts.isStringLiteral(statement.moduleSpecifier) ||
    statement.moduleSpecifier.text !== '../_handler' ||
    !statement.importClause?.namedBindings ||
    !ts.isNamedImports(statement.importClause.namedBindings) ||
    statement.importClause.namedBindings.elements.length !== 1
  ) {
    return null;
  }
  const element = statement.importClause.namedBindings.elements[0];
  return (element.propertyName?.text ?? element.name.text) === 'handlePagesRequest'
    ? element.name.text
    : null;
}

function exportedHandler(statement, localName) {
  if (
    !ts.isVariableStatement(statement) ||
    !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
    statement.declarationList.declarations.length !== 1
  ) {
    return false;
  }
  const declaration = statement.declarationList.declarations[0];
  return (
    Boolean(statement.declarationList.flags & ts.NodeFlags.Const) &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === 'onRequest' &&
    declaration.initializer &&
    ts.isIdentifier(declaration.initializer) &&
    declaration.initializer.text === localName
  );
}

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
  const direct = source.statements.length === 1 && directReExport(source.statements[0]);
  const localName = source.statements.length === 2 ? importedHandler(source.statements[0]) : null;
  const assigned = Boolean(localName && exportedHandler(source.statements[1], localName));
  const valid = direct || assigned;
  if (!valid) {
    violations.push({
      file: normalize(path.relative(projectRoot, expected)),
      message:
        'The Cloudflare catch-all is a hosting adapter only and must re-export handlePagesRequest as onRequest.',
    });
  }
}
