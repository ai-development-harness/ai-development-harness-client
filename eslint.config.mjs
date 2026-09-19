import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['node:*', 'fs', 'fs/*', 'child_process', 'child_process/*', 'process'], message: 'Web domain не получает Node.js access.' },
          { group: ['@org/local-service', 'apps/local-service/**'], message: 'Web обращается только к ClientApi.' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: 'ImportExpression',
        message: 'Web domain не выполняет dynamic imports privileged modules.',
      }, {
        selector: "CallExpression[callee.name='require']",
        message: 'Web domain не использует CommonJS require.',
      }, {
        selector: "MemberExpression[object.name='globalThis'][property.name='process']",
        message: 'Web domain не получает process через globalThis.',
      }, {
        selector: "MemberExpression[object.name='window'][property.name='process']",
        message: 'Web domain не получает process через window.',
      }],
    },
  },
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:service',
              onlyDependOnLibsWithTags: ['scope:service', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
