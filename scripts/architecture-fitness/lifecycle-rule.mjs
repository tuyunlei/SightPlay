import { existsSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { normalize, parseSource, sourceFiles, TEST_PATTERN } from './source.mjs';

function memberName(member) {
  return member.name && ts.isIdentifier(member.name) ? member.name.text : null;
}

function resolveDeclaredFile(projectRoot, packageInfo, relative, label, violations) {
  if (typeof relative !== 'string' || relative.length === 0) {
    violations.push({
      file: normalize(path.relative(projectRoot, path.join(packageInfo.directory, 'package.json'))),
      message: `A managed runtime must declare its ${label} path.`,
    });
    return null;
  }
  const absolute = path.resolve(packageInfo.directory, relative);
  const packageRelative = path.relative(packageInfo.directory, absolute);
  if (
    packageRelative.startsWith('..') ||
    path.isAbsolute(packageRelative) ||
    !existsSync(absolute)
  ) {
    violations.push({
      file: normalize(path.relative(projectRoot, path.join(packageInfo.directory, 'package.json'))),
      message: `Managed runtime ${label} must resolve to a file inside its package.`,
    });
    return null;
  }
  return absolute;
}

function implementedInterfaceNames(node) {
  return new Set(
    (node.heritageClauses ?? [])
      .filter((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword)
      .flatMap((clause) => clause.types)
      .map((type) => (ts.isIdentifier(type.expression) ? type.expression.text : null))
      .filter(Boolean)
  );
}

function managedRuntimeContracts(packageInfo) {
  const contracts = new Set();
  for (const file of sourceFiles(path.join(packageInfo.directory, 'src'))) {
    const source = parseSource(file);
    for (const declaration of source.statements.filter(ts.isInterfaceDeclaration)) {
      const methods = new Set(declaration.members.map(memberName));
      if (methods.has('start') && methods.has('dispose')) contracts.add(declaration.name.text);
    }
  }
  return contracts;
}

function checkManagedRuntimes(projectRoot, packages, violations) {
  for (const [name, packageInfo] of packages) {
    if (packageInfo.role !== 'capability') continue;
    const lifecycle = packageInfo.manifest.sightplayArchitecture?.lifecycle;
    if (lifecycle?.kind !== 'managed-runtime') continue;
    const entry = resolveDeclaredFile(
      projectRoot,
      packageInfo,
      lifecycle.entry,
      'entry',
      violations
    );
    const test = resolveDeclaredFile(projectRoot, packageInfo, lifecycle.test, 'test', violations);
    if (entry) {
      const contracts = managedRuntimeContracts(packageInfo);
      const source = parseSource(entry);
      const implementations = source.statements.filter(ts.isClassDeclaration).filter((node) => {
        const implemented = implementedInterfaceNames(node);
        return [...implemented].some((contract) => contracts.has(contract));
      });
      if (implementations.length === 0) {
        violations.push({
          file: normalize(path.relative(projectRoot, entry)),
          message: `Managed runtime package ${name} needs a concrete class implementing a start()/dispose() lifecycle contract.`,
        });
      }
      for (const implementation of implementations) {
        const dispose = implementation.members.find((member) => memberName(member) === 'dispose');
        if (!dispose) {
          violations.push({
            file: normalize(path.relative(projectRoot, entry)),
            message: `Managed runtime implementation ${implementation.name?.text ?? '<anonymous>'} must implement dispose().`,
          });
        }
      }
    }
    if (test && !TEST_PATTERN.test(test)) {
      violations.push({
        file: normalize(path.relative(projectRoot, test)),
        message: `Managed runtime package ${name} must name a test file for its lifecycle behavior.`,
      });
    }
  }
}

function checkResourcePorts(projectRoot, packages, violations) {
  for (const packageInfo of packages.values()) {
    const portFiles = sourceFiles(path.join(packageInfo.directory, 'src')).filter((file) =>
      /(?:^|[/\\])ports\.ts$/.test(file)
    );
    for (const portsPath of portFiles) {
      const source = parseSource(portsPath);
      for (const statement of source.statements.filter(ts.isInterfaceDeclaration)) {
        const methods = new Map(statement.members.map((member) => [memberName(member), member]));
        if (methods.has('start') && !methods.has('dispose')) {
          violations.push({
            file: normalize(path.relative(projectRoot, portsPath)),
            message: `Effectful port ${statement.name.text} starts resources but has no dispose() contract.`,
          });
        }
        const schedule = methods.get('schedule');
        if (
          schedule &&
          ts.isMethodSignature(schedule) &&
          schedule.type &&
          !ts.isFunctionTypeNode(schedule.type)
        ) {
          violations.push({
            file: normalize(path.relative(projectRoot, portsPath)),
            message: `Scheduler port ${statement.name.text} must return a cancellation function.`,
          });
        }
      }
    }
  }
}

export function checkRuntimeLifecycle(projectRoot, packages, violations) {
  checkManagedRuntimes(projectRoot, packages, violations);
  checkResourcePorts(projectRoot, packages, violations);
}
