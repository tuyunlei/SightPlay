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
    if (
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== '@sightplay/api-contracts'
    ) {
      continue;
    }
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
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    bindings.has(node.expression.text)
  );
}

function unwrap(node) {
  let current = node;
  while (
    ts.isAwaitExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function admissionVariables(source, bindings) {
  const variables = new Set();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      containsAdmission(node.initializer, bindings)
    ) {
      variables.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return variables;
}

function containsAdmission(node, bindings) {
  let found = false;
  const visit = (child) => {
    if (isUnknownJsonAdmission(child, bindings)) found = true;
    if (!found) ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function isRawAdmissionValue(node, bindings, variables) {
  const value = unwrap(node);
  return (
    isUnknownJsonAdmission(value, bindings) ||
    (ts.isIdentifier(value) && variables.has(value.text))
  );
}

function checkBoundaryFile(projectRoot, absolute, violations) {
  const source = parseSource(absolute);
  const admissions = admissionBindings(source);
  const variables = admissionVariables(source, admissions);
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
      ((ts.isAsExpression(node) && !isConstAssertion(node)) ||
        ts.isTypeAssertionExpression(node) ||
        ts.isNonNullExpression(node)) &&
      isRawAdmissionValue(node.expression, admissions, variables)
    ) {
      violations.push({
        file: normalize(path.relative(projectRoot, absolute)),
        message:
          'Ingress code cannot assert admitted JSON into a trusted type; narrow it structurally or use a codec.',
      });
    }
    if (
      ts.isReturnStatement(node) &&
      node.expression &&
      isRawAdmissionValue(node.expression, admissions, variables)
    ) {
      violations.push({
        file: normalize(path.relative(projectRoot, absolute)),
        message: 'Raw admitted JSON cannot be returned from an ingress boundary.',
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
