/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
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
      name: 'domain-no-ui',
      severity: 'error',
      comment: 'domain/ 禁止依赖 UI 层',
      from: { path: '^domain/' },
      to: { path: '^(components|features|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'services-no-ui',
      severity: 'error',
      comment: 'services/ 禁止依赖 UI 层',
      from: { path: '^services/' },
      to: { path: '^(components|features|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'store-no-ui',
      severity: 'error',
      comment: 'store/ 禁止依赖 UI 层',
      from: { path: '^store/' },
      to: { path: '^(components|features|App\\.tsx|index\\.tsx)' },
    },
    {
      name: 'hooks-no-ui',
      severity: 'error',
      comment: 'hooks/ 禁止依赖 UI 层',
      from: { path: '^hooks/' },
      to: { path: '^(components|features|App\\.tsx|index\\.tsx)' },
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
