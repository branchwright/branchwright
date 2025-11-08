import { defineConfig } from './src/config.js';

export default defineConfig({
  branchTypes: [
    { name: 'feat', label: 'feat:     A new feature or test implementation' },
    { name: 'chore', label: 'chore:    Routine task or maintenance' },
    { name: 'ci', label: 'ci:       Continuous Integration / Deployment change' },
    { name: 'docs', label: 'docs:     Documentation update or addition' },
    { name: 'fix', label: 'fix:      A bug fix or test correction' },
    { name: 'hotfix', label: 'hotfix:   Critical bug fix or hotfix' },
    { name: 'perf', label: 'perf:     Performance improvement' },
    { name: 'refactor', label: 'refactor: Code restructuring without behavior change' },
    { name: 'revert', label: 'revert:   Revert a previous commit' },
  ],
  maxDescriptionLength: 24,
  ticketIdPrompt: 'optional',
  ticketIdPrefix: 'NPXR-',
  ignoredBranches: ['main', 'next', 'dev'],
  descriptionStyle: 'kebab-case',
  
  // Template for branch name format using placeholders:
  // {{type}} - Branch type (feat, fix, etc.)
  // {{ticket}} - Ticket ID (optional, e.g. NPXR-123)
  // {{desc}} - Description
  template: '{{type}}/{{ticket}}-{{desc}}'
});
