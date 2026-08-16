import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const SOURCE_PATTERN = /\.[cm]?[jt]sx?$/;
export const TEST_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

export const normalize = (value) => value.split(path.sep).join('/');

export function sourceFiles(directory, includeTests = false) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute, includeTests);
    if (!SOURCE_PATTERN.test(entry.name) || entry.name.endsWith('.d.ts')) return [];
    return includeTests || !TEST_PATTERN.test(entry.name) ? [absolute] : [];
  });
}

export function parseSource(absolutePath) {
  return ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

export function propertyName(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    ts.isStringLiteral(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text;
  }
  return null;
}
