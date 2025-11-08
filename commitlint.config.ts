import { defineConfig } from 'cz-git';

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  ignores: [(commit) => commit.includes('Merge branch') || commit.includes('Merge remote-tracking branch')],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'chore', 'refactor', 'test', 'docs', 'build', 'ci', 'perf', 'revert']],
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'cli',
        'config',
        'creator',
        'validator',
        'utils',
        'types',
        'templates',
        'tests',
        'build',
        'docs',
        'release',
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // do not enforce scope since many commits do not have a scope
    'scope-empty': [0],
    'header-max-length': [2, 'always', 100],
  },
  prompt: {
    types: [
      { value: 'feat', name: 'feat:     A new feature for branch management or CLI' },
      { value: 'fix', name: 'fix:      A bug fix in branch validation, creation, or CLI' },
      { value: 'chore', name: 'chore:    Maintenance tasks (deps, build, tooling)' },
      { value: 'refactor', name: 'refactor: Code restructuring without behavior change' },
      { value: 'test', name: 'test:     Adding or updating tests' },
      { value: 'docs', name: 'docs:     Documentation updates (README, API docs, examples)' },
      { value: 'build', name: 'build:    Build system or dependency changes' },
      { value: 'ci', name: 'ci:       CI/CD pipeline or release automation changes' },
      { value: 'perf', name: 'perf:     Performance improvements' },
      { value: 'revert', name: 'revert:   Undo a previous commit' },
    ],
    scopes: [
      { value: 'core', name: 'core:      Main Branchwright class and core functionality' },
      { value: 'cli', name: 'cli:       Command-line interface and CLI commands' },
      { value: 'config', name: 'config:    Configuration system and default configs' },
      { value: 'creator', name: 'creator:   Interactive branch creation workflow' },
      { value: 'validator', name: 'validator: Branch name validation and linting' },
      { value: 'utils', name: 'utils:     Utility functions and helpers' },
      { value: 'types', name: 'types:     TypeScript type definitions and interfaces' },
      { value: 'templates', name: 'templates: Branch name template system' },
      { value: 'tests', name: 'tests:     Test files and testing infrastructure' },
      { value: 'build', name: 'build:     Build configuration (TypeScript, bundling)' },
      { value: 'docs', name: 'docs:      Documentation, README, and examples' },
      { value: 'release', name: 'release:   Release configuration and automation' },
    ],
  },
});
