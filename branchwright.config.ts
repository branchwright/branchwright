import { defineConfig } from '@branchwright/cli';

export default defineConfig({
  branchTypes: [
    { name: 'feat', label: 'feat:     A new feature' },
    { name: 'chore', label: 'chore:    Routine task or maintenance' },
    { name: 'ci', label: 'ci:       Continuous Integration / Deployment change' },
    { name: 'docs', label: 'docs:     Documentation update or addition' },
    { name: 'fix', label: 'fix:      A bug fix or test correction' },
    { name: 'hotfix', label: 'hotfix:   Critical bug fix or hotfix' },
    { name: 'perf', label: 'perf:     Performance improvement' },
    { name: 'refactor', label: 'refactor: Code restructuring without behavior change' },
    { name: 'revert', label: 'revert:   Revert a previous commit' },
  ],
  maxDescriptionLength: 30,
  ignoredBranches: ['main', 'next', 'dev'],
  descriptionStyle: 'kebab-case',
  template: '{{type}}/{{ticket}}-{{desc}}',
  presets: ['recommended'],
  rules: {
    ticketId: 'off',
  },
  extraQuestions: {
    pushToRemote: true,
  },
});
