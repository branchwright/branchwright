import chalk from 'chalk';
import inquirer from 'inquirer';
import { type SimpleGit, simpleGit } from 'simple-git';

import { coreRules } from './rules/core.js';
import { resolveRuleConfig } from './rules/index.js';
import type { BranchConfig, BranchTypeOption, TicketIdPromptMode } from './types.js';
import { type ParsedDescription, buildBranchName, loadConfig, parseUserDescription } from './utils.js';

export interface CreateBranchOptions {
  /** Whether to create and switch to the branch */
  checkout?: boolean;
  /** Base branch to create from */
  baseBranch?: string;
  /** Dry run - don't actually create the branch */
  dryRun?: boolean;
}

export class BranchCreator {
  private git: SimpleGit;
  private config: BranchConfig;

  constructor(config?: BranchConfig, cwd?: string) {
    this.git = simpleGit(cwd || process.cwd());
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

  async promptForBranchType(branchTypes: BranchTypeOption[]): Promise<BranchTypeOption> {
    if (!branchTypes.length) {
      throw new Error('No branch types configured. Please update branchwright config.');
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedName',
        message: 'Select branch type',
        choices: branchTypes.map((type) => ({ name: type.label, value: type.name })),
      },
    ]);

    const selected = branchTypes.find((type) => type.name === answers.selectedName);

    if (!selected) {
      throw new Error(`Unable to resolve branch type for selection: ${answers.selectedName}`);
    }

    return selected;
  }

  async promptForTicketId(mode: TicketIdPromptMode, prefix = ''): Promise<string> {
    if (mode === 'skip') {
      return '';
    }

    const promptMessage =
      mode === 'required' ? 'Enter ticket ID (required)' : 'Enter ticket ID (optional, leave blank to skip)';

    while (true) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'ticketId',
          message: promptMessage,
          default: '',
          validate: (value: string) => {
            if (mode !== 'required') {
              return true;
            }
            return value.trim() ? true : 'Ticket ID is required.';
          },
        },
      ]);

      const answer = answers.ticketId.trim();

      if (!answer) {
        return '';
      }

      if (prefix && !answer.startsWith(prefix)) {
        const withPrefix = `${prefix}${answer}`;
        const confirmAnswers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'usePrefix',
            message: `Did you mean "${withPrefix}"?`,
            default: true,
          },
        ]);

        if (confirmAnswers.usePrefix) {
          return withPrefix;
        }

        continue;
      }

      return answer;
    }
  }

  async promptForDescription(config: BranchConfig, ticketId: string): Promise<ParsedDescription> {
    const hasTicketPrefix = Boolean(ticketId);
    const promptMessage = hasTicketPrefix
      ? 'Enter branch description'
      : 'Enter branch description (or "TICKET-123 description" format)';

    while (true) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: promptMessage,
          validate: (value: string) => {
            return value.trim() ? true : 'Branch description is required.';
          },
        },
      ]);

      const result = parseUserDescription(answers.description, config);

      if (result.ticketError) {
        console.error(chalk.red(`Error: ${result.ticketError}`));
        continue;
      }

      return result;
    }
  }

  /**
   * Interactive branch creation workflow
   */
  async createInteractive(options: CreateBranchOptions = {}): Promise<string | null> {
    try {
      // Check if we're in a git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        console.error(chalk.red('Error: Not in a git repository'));
        return null;
      }

      // Load configuration
      const config = await loadConfig();

      // Get current branch for base branch default
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      const defaultBaseBranch = options.baseBranch || currentBranch;

      // Step 1: Select branch type
      const branchType = await this.promptForBranchType(config.branchTypes);

      // Step 2: Get ticket ID if configured
      const ticketIdRule = resolveRuleConfig(config, coreRules.ticketId);
      const ticketId = await this.promptForTicketId(
        ticketIdRule.severity === 'off' ? 'skip' : ticketIdRule.severity,
        ticketIdRule.options?.prefix || '',
      );

      // Step 3: Get description
      const descriptionResult = await this.promptForDescription(config, ticketId);

      // Build final branch name
      let finalTicketId = ticketId;
      if (!ticketId && descriptionResult.hasTicket && config.ticketIdPrefix) {
        // Extract ticket ID from description
        const ticketPattern = new RegExp(`^(${config.ticketIdPrefix}\\d+)`);
        const match = ticketPattern.exec(descriptionResult.description);
        if (match) {
          finalTicketId = match[1];
        }
      }

      const branchName = buildBranchName(
        branchType.name,
        descriptionResult.description,
        finalTicketId,
        config.template,
      );

      console.log(chalk.green(`Generated branch name: ${branchName}`));

      // Ask for confirmation and additional options
      const proceedAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Create this branch?',
          default: true,
        },
      ]);

      if (!proceedAnswers.proceed) {
        console.log(chalk.yellow('Branch creation cancelled'));
        return null;
      }

      const confirmAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseBranch',
          message: 'Base branch:',
          default: defaultBaseBranch,
        },
        {
          type: 'confirm',
          name: 'checkout',
          message: 'Switch to the new branch after creation?',
          default: options.checkout ?? true,
        },
      ]);

      // Check if branch already exists
      const branches = await this.git.branchLocal();
      if (branches.all.includes(branchName)) {
        console.error(chalk.red(`Branch "${branchName}" already exists`));
        return null;
      }

      // Create the branch
      if (options.dryRun) {
        console.log(chalk.blue(`[DRY RUN] Would create branch: ${branchName} from ${confirmAnswers.baseBranch}`));
        if (confirmAnswers.checkout) {
          console.log(chalk.blue(`[DRY RUN] Would checkout to: ${branchName}`));
        }
        return branchName;
      }

      // Ensure we're on the base branch
      await this.git.checkout(confirmAnswers.baseBranch);

      // Create and optionally checkout the new branch
      if (confirmAnswers.checkout) {
        await this.git.checkoutLocalBranch(branchName);
        console.log(chalk.green(`✓ Created and switched to branch: ${branchName}`));
      } else {
        await this.git.branch([branchName]);
        console.log(chalk.green(`✓ Created branch: ${branchName}`));
      }

      return branchName;
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }

  /**
   * Set configuration
   */
  setConfig(config: BranchConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): BranchConfig {
    return this.config;
  }
}
