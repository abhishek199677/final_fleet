module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./packages/*/tsconfig.json'],
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
  ignorePatterns: ['dist/', 'node_modules/', '.next/', '*.js', '!*.cjs'],
};
