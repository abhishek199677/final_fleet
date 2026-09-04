module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.eslint.json',
      './packages/api/tsconfig.eslint.json',
      './packages/shared/tsconfig.eslint.json',
      './packages/web/tsconfig.json',
      './packages/db/tsconfig.json',
      './packages/infra/tsconfig.json',
    ],
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    // eslint-plugin-react-hooks is not installed; the rule ID fires as a
    // config error on every useEffect. Off until the plugin lands.
    'react-hooks/exhaustive-deps': 'off',
    // Baseline debt (typed-pg-rows follow-up): pg returns any[] rows, so the
    // type-aware unsafe/* + stringification rules fire ~400x across the
    // pre-existing baseline. Warn (not error) until the typed query layer
    // lands; true bug rules below stay errors and CI fails on them.
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-base-to-string': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './packages/web/app/(ops)',
            from: './packages/shared/src',
            except: ['./ops'],
            message:
              'Ops routes must not import finance modules. Use @fleetos/shared/ops instead.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', '.next/', '*.js', '!*.cjs', 'packages/web/next-env.d.ts'],
};
