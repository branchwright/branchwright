import { BranchCreator } from './creator.js';
import { type BranchConfig } from './types.js';
import { loadConfigWithMeta } from './utils.js';
import { BranchValidator, type BranchValidatorOptions } from './validator.js';

export interface BranchwrightOptions {
  config?: BranchConfig;
  cwd?: string;
  configPath?: string;
}

/**
 * Main Branchwright class that combines validation and creation functionality
 */
export class Branchwright {
  private validator: BranchValidator;
  private creator: BranchCreator;

  constructor(options: BranchwrightOptions = {}) {
    const validatorOptions: BranchValidatorOptions = {};
    if (options.cwd) {
      validatorOptions.cwd = options.cwd;
    }
    if (options.configPath) {
      validatorOptions.configPath = options.configPath;
    }

    this.validator = new BranchValidator(options.config, validatorOptions);
    this.creator = new BranchCreator(options.config, options.cwd);
  }

  /**
   * Initialize with config from file
   */
  static async create(options: BranchwrightOptions = {}): Promise<Branchwright> {
    if (options.config) {
      return new Branchwright(options);
    }

    const { config, filepath } = await loadConfigWithMeta(options.cwd ? { cwd: options.cwd } : {});
    const branchwrightOptions: BranchwrightOptions = { ...options, config };
    if (filepath) {
      branchwrightOptions.configPath = filepath;
    }

    return new Branchwright(branchwrightOptions);
  }

  /**
   * Validate a branch name
   */
  async validate(branchName: string) {
    return this.validator.validate(branchName);
  }

  /**
   * Start interactive branch creation
   */
  async create(options = {}) {
    return this.creator.createInteractive(options);
  }

  /**
   * Get the validator instance
   */
  getValidator() {
    return this.validator;
  }

  /**
   * Get the creator instance
   */
  getCreator() {
    return this.creator;
  }
}
