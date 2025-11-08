import pluginJs from '@eslint/js';
import { flatConfigs } from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// mimic CommonJS variables -- not needed if using CommonJS

export default defineConfig([
  {
    files: ['eslint.config.ts'],
    settings: {
      'import/core-modules': ['typescript-eslint'],
    },
  },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  flatConfigs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts'],
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      semi: 0,
      'no-undef': 'off',
      'class-methods-use-this': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-empty-pattern': 'off',
      'object-curly-newline': 'off',
      '@typescript-eslint/no-namespace': 'off',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'off',

      'max-len': [
        'warn',
        {
          code: 120,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
        },
      ],

      'import/no-mutable-exports': 'error',
      'import/no-extraneous-dependencies': 'warn',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-named-as-default-member': 'off',

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },
]);
