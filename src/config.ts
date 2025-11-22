import type { BranchConfig } from './types.js';

export const DEFAULT_CONFIG: BranchConfig = {
  branchTypes: [
    { name: 'feat', label: 'Feature' },
    { name: 'fix', label: 'Bug Fix' },
    { name: 'chore', label: 'Chore' },
  ],
  maxDescriptionLength: 24,
  ignoredBranches: ['main', 'master', 'next', 'dev', 'develop', 'release/*'],
  descriptionStyle: 'kebab-case',
  template: '{{type}}/{{desc}}',
  plugins: [],
  presets: ['recommended'],
  rules: {},
  extraQuestions: {
    baseBranch: false,
    checkout: false,
    pushToRemote: false,
  },
  questions: {},
  // Legacy support - will be overridden by rules.ticketId if present
  ticketIdPrompt: 'optional',
  ticketIdPrefix: undefined,
};

export function defineConfig(config: Partial<BranchConfig>): BranchConfig {
  const result: BranchConfig = {
    branchTypes: config.branchTypes ?? DEFAULT_CONFIG.branchTypes,
    maxDescriptionLength: config.maxDescriptionLength ?? DEFAULT_CONFIG.maxDescriptionLength,
    ignoredBranches: config.ignoredBranches ?? DEFAULT_CONFIG.ignoredBranches,
    descriptionStyle: config.descriptionStyle ?? DEFAULT_CONFIG.descriptionStyle,
    template: config.template ?? DEFAULT_CONFIG.template,
    plugins: config.plugins ?? DEFAULT_CONFIG.plugins,
    presets: config.presets ?? DEFAULT_CONFIG.presets,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...config.rules,
    },
    extraQuestions: {
      ...DEFAULT_CONFIG.extraQuestions,
      ...config.extraQuestions,
    },
    questions: {
      ...DEFAULT_CONFIG.questions,
      ...config.questions,
    },
  };

  // Handle legacy properties for backward compatibility
  if (config.ticketIdPrompt !== undefined) {
    result.ticketIdPrompt = config.ticketIdPrompt;
  }
  if (config.ticketIdPrefix !== undefined) {
    result.ticketIdPrefix = config.ticketIdPrefix;
  }

  return result;
}
