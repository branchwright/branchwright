import { BranchCreator } from './creator.js';
import { type BranchConfig } from './types.js';
import { loadConfig } from './utils.js';
import { BranchValidator } from './validator.js';

export interface BranchwrightOptions {
  config?: BranchConfig;
  cwd?: string;
}

/**
 * Main Branchwright class that combines validation and creation functionality
 */
export class Branchwright {
  private validator: BranchValidator;
  private creator: BranchCreator;

  constructor(options: BranchwrightOptions = {}) {
    this.validator = new BranchValidator(options.config);
    this.creator = new BranchCreator(options.config, options.cwd);
  }

  /**
   * Initialize with config from file
   */
  static async create(options: BranchwrightOptions = {}): Promise<Branchwright> {
    const config = options.config || (await loadConfig());
    return new Branchwright({ ...options, config });
  }

  /**
   * Validate a branch name
   */
  validate(branchName: string) {
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
