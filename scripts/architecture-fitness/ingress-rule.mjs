import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, propertyName, sourceFiles } from './source.mjs';

function isStaticResponseJson(expression) {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'Response' &&
    expression.name.text === 'json'
  );
}

function isJsonParse(expression) {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'JSON' &&
    expression.name.text === 'parse'
  );
}

function isConstAssertion(node) {
  return (
    ts.isAsExpression(node) &&
    ts.isTypeReferenceNode(node.type) &&
    ts.isIdentifier(node.type.typeName) &&
    node.type.typeName.text === 'const'
  );
}

const UNKNOWN_JSON_ADMISSIONS = new Set(['readUnknownJson', 'parseUnknownJson']);

function admissionBindings(source) {
  const bindings = new Set();
  for (const statement of source.statements.filter(ts.isImportDeclaration)) {
    if (!statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings))
      continue;
    for (const element of statement.importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (UNKNOWN_JSON_ADMISSIONS.has(imported)) bindings.add(element.name.text);
    }
  }
  return bindings;
}

function isUnknownJsonAdmission(node, bindings) {
  if (!ts.isCallExpression(node)) return false;
  return ts.isIdentifier(node.expression)
    ? bindings.has(node.expression.text)
    : UNKNOWN_JSON_ADMISSIONS.has(propertyName(node.expression));
}

function isImmediatelyConsumed(node) {
  let parent = node.parent;
  while (
    parent &&
    (ts.isAwaitExpression(parent) ||
      ts.isParenthesizedExpression(parent) ||
      ts.isNonNullExpression(parent))
  ) {
    parent = parent.parent;
  }
  return Boolean(parent && ts.isCallExpression(parent));
}

function checkBoundaryFile(projectRoot, absolute, violations) {
  const source = parseSource(absolute);
  const admissions = admissionBindings(source);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      if (isUnknownJsonAdmission(node, admissions) && !isImmediatelyConsumed(node)) {
        violations.push({
          file: normalize(path.relative(projectRoot, absolute)),
          message:
            'Raw unknown JSON cannot escape an ingress boundary; pass it directly to a runtime decoder or structural narrowing function.',
        });
      }
      if (propertyName(node.expression) === 'json' && !isStaticResponseJson(node.expression)) {
        violations.push({
          file: normalize(path.relative(projectRoot, absolute)),
          message:
            'External JSON must enter through readUnknownJson(), remain unknown, and pass a runtime codec.',
        });
      }
      if (isJsonParse(node.expression)) {
        violations.push({
          file: normalize(path.relative(projectRoot, absolute)),
          message:
            'External JSON text must enter through parseUnknownJson(), remain unknown, and pass a runtime codec.',
        });
      }
    }
    if (
      (ts.isAsExpression(node) && !isConstAssertion(node)) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isNonNullExpression(node)
    ) {
      violations.push({
        file: normalize(path.relative(projectRoot, absolute)),
        message:
          'Ingress code cannot assert external data into a trusted type; narrow it structurally or use a codec.',
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

export function checkExternalInputBoundaries(projectRoot, packages, violations) {
  const boundaryRoots = [path.join(projectRoot, 'edge-functions', 'api')];
  for (const packageInfo of packages.values()) {
    if (packageInfo.role === 'adapters' || packageInfo.role === 'application') {
      boundaryRoots.push(path.join(packageInfo.directory, 'src'));
    }
  }
  for (const root of boundaryRoots) {
    for (const absolute of sourceFiles(root)) checkBoundaryFile(projectRoot, absolute, violations);
  }
}
