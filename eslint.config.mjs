// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

/**
 * @type {import("eslint").Linter.FlatConfig[]}
 */
export default tseslint.config(
  {
    ignores: ['dist', 'build', '**/*.js', 'node_modules'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettier,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Best Practices
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
      // Configuration is read in one place: src/common/config.
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Use AppConfig (src/common/config).' },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Nest resolves constructor dependencies from runtime type metadata, so type-only imports would break DI.
      '@typescript-eslint/no-extraneous-class': 'off',

      // Prettier
      'prettier/prettier': ['error'],
    },
  },
  {
    files: ['src/common/config/**', 'src/database/data-source.ts', 'src/database/seed/**', 'scripts/**', 'test/**'],
    rules: { 'no-restricted-properties': 'off' },
  },
);
