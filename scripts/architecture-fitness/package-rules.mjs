import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, sourceFiles } from './source.mjs';

const ROLES = new Set(['application', 'capability', 'contracts', 'domain', 'adapters']);
const CAPABILITY_LIFECYCLES = new Set(['none', 'request-scoped', 'managed-runtime']);

export function loadPackages(projectRoot, violations) {
  const packagesRoot = path.join(projectRoot, 'packages');
  if (!existsSync(packagesRoot)) return new Map();
  const result = new Map();
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(packagesRoot, entry.name);
    const packagePath = path.join(directory, 'package.json');
    if (!existsSync(packagePath)) continue;
    const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
    const role = manifest.sightplayArchitecture?.role;
    if (!ROLES.has(role)) {
      violations.push({
        file: normalize(path.relative(projectRoot, packagePath)),
        message: 'Every workspace package must declare a valid sightplayArchitecture.role.',
      });
      continue;
    }
    if (
      role === 'capability' &&
      !CAPABILITY_LIFECYCLES.has(manifest.sightplayArchitecture?.lifecycle?.kind)
    ) {
      violations.push({
        file: normalize(path.relative(projectRoot, packagePath)),
        message:
          'Every capability package must declare lifecycle.kind as none, request-scoped, or managed-runtime.',
      });
    }
    result.set(entry.name, { directory, manifest, role });
  }
  return result;
}

function workspaceTarget(specifier) {
  const match = /^@sightplay\/([^/]+)(?:\/|$)/.exec(specifier);
  return match?.[1] ?? null;
}

function moduleSpecifiers(sourceFile) {
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

export function checkPackageDependencies(projectRoot, packages, violations) {
  for (const [name, sourcePackage] of packages) {
    if (sourcePackage.role === 'adapters') continue;
    for (const absolute of sourceFiles(path.join(sourcePackage.directory, 'src'))) {
      const source = parseSource(absolute);
      for (const specifier of moduleSpecifiers(source)) {
        const targetName = workspaceTarget(specifier);
        if (!targetName || targetName === name) continue;
        const target = packages.get(targetName);
        if (!target) continue;
        const forbidden =
          (sourcePackage.role === 'capability' && target.role === 'capability') ||
          ((sourcePackage.role === 'contracts' || sourcePackage.role === 'domain') &&
            target.role !== 'contracts' &&
            target.role !== 'domain');
        if (forbidden) {
          violations.push({
            file: normalize(path.relative(projectRoot, absolute)),
            message: `${sourcePackage.role} package ${name} cannot import ${target.role} package ${targetName}; map public outputs in an application or adapter boundary.`,
          });
        }
      }
    }
  }
}
