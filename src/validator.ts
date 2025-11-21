import path from 'node:path';

import { DEFAULT_CONFIG } from './config.js';
import { coreRuleRegistry } from './rules/core.js';
import { loadRuleDefinitionSets, loadRulePresetConfigs } from './rules/extensions.js';
import { type RuleRegistry, createRegistry } from './rules/index.js';
import { type BranchConfig } from './types.js';
import { lintBranchName, loadConfigWithMeta } from './utils.js';

export interface ValidationResult {
  /** Whether the branch name is valid */
  valid: boolean;
  /** Error message if invalid */
  message?: string | undefined;
  /** Suggestions for fixing the issue */
  suggestions?: string[] | undefined;
}

export interface BranchValidatorOptions {
  cwd?: string;
  configPath?: string;
}

export class BranchValidator {
  private config: BranchConfig;
  private effectiveConfig: BranchConfig;
  private registry: RuleRegistry = createRegistry(...coreRuleRegistry.entries());
  private options: BranchValidatorOptions;
  private environmentPromise: Promise<void> | undefined;

  constructor(config?: BranchConfig, options: BranchValidatorOptions = {}) {
    this.options = { ...options };
    this.config = this.cloneConfig(config ?? DEFAULT_CONFIG);
    this.effectiveConfig = this.config;
    this.resetEnvironment();
  }

  /**
   * Validate a branch name against the configured rules
   */
  async validate(branchName: string): Promise<ValidationResult> {
    await this.ensureEnvironment();
    const lintResult = await lintBranchName(branchName, this.effectiveConfig, this.registry);

    const result: ValidationResult = {
      valid: lintResult.isValid,
    };

    if (lintResult.errors.length > 0) {
      result.message = lintResult.errors.join('; ');
      const ruleSuggestions = lintResult.violations?.flatMap((violation) => violation.suggestions ?? []) ?? [];

      result.suggestions = ruleSuggestions.length
        ? ruleSuggestions
        : [
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
    const result = await loadConfigWithMeta(this.options.cwd ? { cwd: this.options.cwd } : {});
    this.config = this.cloneConfig(result.config);
    if (result.filepath) {
      this.options = { ...this.options, configPath: result.filepath };
    }
    this.resetEnvironment();
  }

  /**
   * Get the current configuration
   */
  getConfig(): BranchConfig {
    return this.cloneConfig(this.effectiveConfig);
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<BranchConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig);
    this.resetEnvironment();
  }

  private cloneConfig(config: BranchConfig): BranchConfig {
    return this.mergeConfig(
      {
        ...config,
        rules: { ...(config.rules ?? {}) },
      },
      {},
    );
  }

  private mergeConfig(base: BranchConfig, patch: Partial<BranchConfig>): BranchConfig {
    const mergedRules = { ...(base.rules ?? {}) };
    if (patch.rules) {
      Object.assign(mergedRules, patch.rules);
    }

    const merged: BranchConfig = {
      ...base,
      ...patch,
      branchTypes: patch.branchTypes ? [...patch.branchTypes] : [...base.branchTypes],
      ignoredBranches: patch.ignoredBranches ? [...patch.ignoredBranches] : [...base.ignoredBranches],
      plugins: patch.plugins ? [...patch.plugins] : [...(base.plugins ?? [])],
      presets: patch.presets ? [...patch.presets] : [...(base.presets ?? [])],
      rules: mergedRules,
    };

    if (patch.template !== undefined) {
      merged.template = patch.template;
    }

    if (patch.ticketIdPrompt !== undefined) {
      merged.ticketIdPrompt = patch.ticketIdPrompt;
    }

    if (patch.ticketIdPrefix !== undefined) {
      merged.ticketIdPrefix = patch.ticketIdPrefix;
    }

    return merged;
  }

  private async ensureEnvironment(): Promise<void> {
    if (!this.environmentPromise) {
      this.environmentPromise = this.buildEnvironment();
    }

    await this.environmentPromise;
  }

  private async buildEnvironment(): Promise<void> {
    const baseDir = this.getBaseDir();
    const pluginDefinitions = await loadRuleDefinitionSets(this.config.plugins, { baseDir });
    const presetRules = await loadRulePresetConfigs(this.config.presets, { baseDir });

    const mergedConfig: BranchConfig = {
      ...this.config,
      branchTypes: [...this.config.branchTypes],
      ignoredBranches: [...this.config.ignoredBranches],
      plugins: this.config.plugins ? [...this.config.plugins] : [],
      presets: this.config.presets ? [...this.config.presets] : [],
      rules: {
        ...presetRules,
        ...(this.config.rules ?? {}),
      },
    };

    const registry = createRegistry(...coreRuleRegistry.entries());
    for (const definition of pluginDefinitions) {
      registry.register(definition);
    }

    this.registry = registry;
    this.effectiveConfig = mergedConfig;
  }

  private getBaseDir(): string {
    if (this.options.configPath) {
      return path.dirname(this.options.configPath);
    }

    return this.options.cwd ?? process.cwd();
  }

  private resetEnvironment(): void {
    this.effectiveConfig = this.config;
    this.registry = createRegistry(...coreRuleRegistry.entries());
    this.environmentPromise = undefined;
  }
}
