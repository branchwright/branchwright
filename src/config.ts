import type { BranchConfig } from './types.js';

export const DEFAULT_CONFIG: BranchConfig = {
  branchTypes: [
    { name: 'feat', label: 'Feature' },
    { name: 'fix', label: 'Bug Fix' },
    { name: 'chore', label: 'Chore' },
  ],
  maxDescriptionLength: 24,
  ticketIdPrompt: 'optional',
  ticketIdPrefix: undefined,
  ignoredBranches: ['main', 'master', 'next', 'dev', 'develop', 'release/*'],
  descriptionStyle: 'kebab-case',
  template: '{{type}}/{{desc}}',
};

export function defineConfig(config: Partial<BranchConfig>): BranchConfig {
  return {
    branchTypes: config.branchTypes ?? DEFAULT_CONFIG.branchTypes,
    maxDescriptionLength: config.maxDescriptionLength ?? DEFAULT_CONFIG.maxDescriptionLength,
    ticketIdPrompt: config.ticketIdPrompt ?? DEFAULT_CONFIG.ticketIdPrompt,
    ticketIdPrefix: config.ticketIdPrefix ?? DEFAULT_CONFIG.ticketIdPrefix,
    ignoredBranches: config.ignoredBranches ?? DEFAULT_CONFIG.ignoredBranches,
    descriptionStyle: config.descriptionStyle ?? DEFAULT_CONFIG.descriptionStyle,
    template: config.template ?? DEFAULT_CONFIG.template,
  };
}