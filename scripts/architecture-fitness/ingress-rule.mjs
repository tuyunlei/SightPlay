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

function checkBoundaryFile(projectRoot, absolute, violations) {
  const source = parseSource(absolute);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
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
