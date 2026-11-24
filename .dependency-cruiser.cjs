/** Architecture rules, enforced in CI (npm run deps:check). */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Modules and files must not form import cycles. A cycle means the boundary is wrong; do not paper over it with forwardRef.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-cross-module-internals',
      comment: 'Another module is reached only through its public API: src/<module>/index.ts (its exports).',
      severity: 'error',
      from: { path: '^src/([^/]+)/', pathNot: '^src/(database|bootstrap)/' },
      to: {
        path: '^src/([^/]+)/',
        pathNot: ['^src/$1/', '^src/[^/]+/index\\.ts$', '^src/common/'],
      },
    },
    {
      name: 'common-knows-no-domain',
      comment: 'common/ is general infrastructure: it must not import any domain module.',
      severity: 'error',
      from: { path: '^src/common/' },
      to: { path: '^src/', pathNot: '^src/common/' },
    },
    {
      name: 'no-test-code-in-src',
      severity: 'error',
      from: { pathNot: '\\.spec\\.ts$' },
      to: { path: '\\.spec\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Type-only imports (entity relations by name) are erased at compile time and are not runtime dependencies.
    tsPreCompilationDeps: false,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '\\.spec\\.ts$' },
  },
};
