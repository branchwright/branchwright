#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';

import { Branchwright } from './branchwright.js';
import { loadConfigWithMeta } from './utils.js';

const program = new Command();

program
  .name('brw')
  .description('Git branch name linting and interactive branch creation (alias: branchwright)')
  .version('1.0.0');

program.addHelpText('after', '\nAlias: branchwright');

program
  .command('create')
  .alias('c')
  .description('Create a new branch interactively')
  .option('-t, --type <type>', 'Branch type (feat, fix, chore, etc.)')
  .option('--ticket <id>', 'Ticket/issue ID')
  .option('-d, --desc <description>', 'Branch description')
  .option('-y, --yes', 'Skip proceed confirmation')
  .option('--push', 'Push branch to remote after creation')
  .option('-b, --base <branch>', 'Base branch to create from')
  .option('-n, --no-checkout', "Don't checkout to the new branch after creation")
  .option('--dry-run', 'Show what would be done without actually creating the branch')
  .addHelpText(
    'after',
    `

Examples:
  # Interactive mode (default)
  $ brw create

  # Fully non-interactive
  $ brw create -t feat -d user-authentication

  # With ticket ID
  $ brw create -t fix -d login-bug --ticket PROJ-123

  # Create and push to remote
  $ brw create -t feat -d api-endpoint --push

  # From specific base branch
  $ brw create -t feat -d new-feature -b main

  # Preview without creating
  $ brw create -t chore -d cleanup --dry-run
`,
  )
  .action(async (options) => {
    try {
      const branchwright = await Branchwright.create({ cwd: process.cwd() });

      const branchName = await branchwright.create({
        type: options.type,
        ticketId: options.ticket,
        description: options.desc,
        skipProceed: !options.proceed,
        pushToRemote: options.push,
        baseBranch: options.base,
        checkout: options.checkout,
        dryRun: options.dryRun,
      });

      if (branchName && !options.dryRun) {
        console.log(chalk.green(`\n✓ Branch "${branchName}" created successfully!`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program
  .command('lint')
  .alias('l')
  .description('Validate branch names')
  .argument('[branch-names...]', 'Branch names to validate (defaults to current branch)')
  .option('--all', 'Validate all local branches')
  .action(async (branchNames: string[], options) => {
    try {
      const branchwright = await Branchwright.create({ cwd: process.cwd() });

      if (options.all) {
        const { simpleGit } = await import('simple-git');
        const git = simpleGit(process.cwd());
        const branches = await git.branchLocal();
        branchNames = branches.all.filter((branch) => branch !== 'HEAD');
      } else if (branchNames.length === 0) {
        const { simpleGit } = await import('simple-git');
        const git = simpleGit(process.cwd());
        const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
        branchNames = [currentBranch];
      }

      let hasErrors = false;

      for (const branchName of branchNames) {
        const validation = await branchwright.validate(branchName);

        if (validation.valid) {
          console.log(chalk.green(`✓ ${branchName}`));
        } else {
          console.log(chalk.red(`✗ ${branchName}`));
          console.log(chalk.red(`  ${validation.message}`));

          if (validation.suggestions) {
            console.log(chalk.yellow('  Suggestions:'));
            validation.suggestions.forEach((suggestion) => {
              console.log(chalk.yellow(`    - ${suggestion}`));
            });
          }
          hasErrors = true;
        }
      }

      if (hasErrors) {
        process.exit(1);
      } else {
        console.log(chalk.green(`\n✓ All ${branchNames.length} branch name(s) are valid!`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize branchwright configuration')
  .option('-f, --format <format>', 'Configuration format (json)', 'json')
  .action(async () => {
    try {
      const configPath = '.branchwright.json';

      if (fs.existsSync(configPath)) {
        console.log(chalk.yellow(`Configuration file ${configPath} already exists`));
        return;
      }

      const defaultConfig = {
        config: {
          patterns: ['^(feature|bugfix|hotfix|release|chore)/.+$', '^(feat|fix|docs|style|refactor|test|chore)/.+$'],
          maxLength: 100,
          minLength: 3,
          lowercase: true,
          disallowed: [' ', '..', '~', '^', ':', '[', ']', '?', '*', '\\'],
          template: '{{type}}/{{desc}}',
        },
        types: [
          {
            type: 'feature',
            name: 'Feature',
            description: 'A new feature or enhancement',
            pattern: 'feature/{description}',
          },
          {
            type: 'bugfix',
            name: 'Bug Fix',
            description: 'A bug fix',
            pattern: 'bugfix/{description}',
          },
          {
            type: 'hotfix',
            name: 'Hotfix',
            description: 'An urgent fix for production',
            pattern: 'hotfix/{description}',
          },
          {
            type: 'release',
            name: 'Release',
            description: 'A release branch',
            pattern: 'release/{description}',
          },
          {
            type: 'chore',
            name: 'Chore',
            description: 'Maintenance tasks, refactoring, etc.',
            pattern: 'chore/{description}',
          },
        ],
      };

      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green(`✓ Created ${configPath}`));
      console.log(chalk.blue('You can customize the configuration by editing this file.'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const { config, filepath } = await loadConfigWithMeta({ cwd: process.cwd() });
      if (filepath) {
        console.log(chalk.blue(`Loaded configuration (${filepath}):`));
      } else {
        console.log(chalk.blue('Using default configuration:'));
      }
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
