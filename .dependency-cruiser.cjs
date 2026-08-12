/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'capability-internals-private',
      severity: 'error',
      comment: 'Capability internals are private; consumers import the package public API only',
      from: { pathNot: '^packages/app-shell/' },
      to: { path: '^packages/app-shell/src/(?!public\.ts$)' },
    },
    {
      name: 'capability-model-is-pure',
      severity: 'error',
      comment:
        'Capability models cannot depend on UI, adapters, stores, or application composition',
      from: { path: '^packages/[^/]+/src/(model|domain)/' },
      to: {
        path: '^(app|components|domain|edge-functions|features|functions|hooks|services|store|views|App\.tsx|index\.tsx)',
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
      name: 'domain-no-ui',
      severity: 'error',
      comment: 'domain/ 只包含纯决策，不得依赖 UI、状态容器或运行时适配器',
      from: { path: '^domain/' },
      to: { path: '^(components|features|hooks|services|store|views|App\\.tsx|index\\.tsx)' },
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
      comment: 'store/ 只适配 domain state，不得依赖 UI、hooks 或具体服务',
      from: { path: '^store/' },
      to: { path: '^(components|features|hooks|services|views|App\\.tsx|index\\.tsx)' },
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
