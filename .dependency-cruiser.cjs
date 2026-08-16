const { readdirSync } = require('node:fs');
const path = require('node:path');

const packageNames = readdirSync(path.join(__dirname, 'packages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const capabilityPrivateRules = packageNames.map((packageName) => {
  const packagePath = `packages/${escapeRegex(packageName)}`;
  return {
    name: `${packageName}-internals-private`,
    severity: 'error',
    comment: 'Capability internals are private; consumers import the package public API only',
    from: { pathNot: `^${packagePath}/` },
    to: {
      path: `^${packagePath}/src/`,
      dependencyTypes: ['local', 'aliased', 'aliased-tsconfig', 'aliased-tsconfig-base-url'],
    },
  };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...capabilityPrivateRules,
    {
      name: 'capability-model-is-pure',
      severity: 'error',
      comment:
        'Capability models cannot depend on UI, adapters, stores, or application composition',
      from: { path: '^packages/[^/]+/src/(model|domain)/' },
      to: {
        path: '^(packages/[^/]+/src/(adapters?|react|runtime|services?|store|ui|views?)/|app|components|domain|edge-functions|features|functions|hooks|services|store|views|App\.tsx|index\.tsx)',
      },
    },
    {
      name: 'capability-model-no-runtime-dependencies',
      severity: 'error',
      comment:
        'Production models receive runtime capabilities through ports, never runtime modules',
      from: {
        path: '^packages/[^/]+/src/(model|domain)/',
        pathNot: '\\.(test|spec)\\.[cm]?[jt]sx?$',
      },
      to: {
        dependencyTypes: [
          'core',
          'npm',
          'npm-bundled',
          'npm-dev',
          'npm-no-pkg',
          'npm-optional',
          'npm-peer',
          'npm-unknown',
        ],
      },
    },
    {
      name: 'shared-no-upper',
      severity: 'error',
      comment: 'shared 文件禁止依赖上层模块',
      from: { path: '^(constants|types|i18n)\\.ts$' },
      to: { path: '^(components|features|hooks|services|store|domain|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'config-no-upper',
      severity: 'error',
      comment: 'config/ 只允许依赖 shared',
      from: { path: '^config/' },
      to: { path: '^(components|features|hooks|services|store|domain|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'components-no-features',
      severity: 'error',
      comment: 'components/ 禁止依赖 features/app',
      from: { path: '^components/' },
      to: { path: '^(features|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'features-no-app',
      severity: 'error',
      comment: 'features/ 禁止依赖 App 入口',
      from: { path: '^features/' },
      to: { path: '^(App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: '禁止循环依赖',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|dist|coverage|\\.github|scripts',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
