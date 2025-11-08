import { type BranchConfig } from './types.js';
import { lintBranchName, loadConfig } from './utils.js';

export interface ValidationResult {
  /** Whether the branch name is valid */
  valid: boolean;
  /** Error message if invalid */
  message?: string | undefined;
  /** Suggestions for fixing the issue */
  suggestions?: string[] | undefined;
}

export class BranchValidator {
  private config: BranchConfig;

  constructor(config?: BranchConfig) {
    this.config = config || {
      branchTypes: [
        { name: 'feat', label: 'Feature' },
        { name: 'fix', label: 'Bug Fix' },
        { name: 'chore', label: 'Chore' },
      ],
      maxDescriptionLength: 24,
      ticketIdPrompt: 'optional',
      ticketIdPrefix: undefined,
      ignoredBranches: ['main', 'master', 'next', 'dev', 'develop'],
      descriptionStyle: 'kebab-case',
    };
  }

  /**
   * Validate a branch name against the configured rules
   */
  validate(branchName: string): ValidationResult {
    const lintResult = lintBranchName(branchName, this.config);

    const result: ValidationResult = {
      valid: lintResult.isValid,
    };

    if (lintResult.errors.length > 0) {
      result.message = lintResult.errors.join('; ');
      result.suggestions = [
        'Try using one of the configured branch types',
        'Ensure description follows the configured style',
        'Check maximum description length',
      ];
    }

    return result;
  }

  /**
   * Load configuration from file
   */
  async loadConfigFromFile(): Promise<void> {
    this.config = await loadConfig();
  }

  /**
   * Get the current configuration
   */
  getConfig(): BranchConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<BranchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
