#!/usr/bin/env node

import { Command } from 'commander';
import { Branchwright } from './branchwright.js';
import { BranchConfig, BranchType } from './types.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const program = new Command();

// Load configuration from package.json or .branchwright config file
function loadConfig(): { config?: BranchConfig; types?: BranchType[] } {
  const configPaths = [
    '.branchwright.json',
    '.branchwright.js',
    'branchwright.config.json',
    'branchwright.config.js',
  ];

  // Check for config in package.json
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageJson.branchwright) {
        return packageJson.branchwright;
      }
    }
  } catch (error) {
    // Ignore package.json parsing errors
  }

  // Check for standalone config files
  for (const configPath of configPaths) {
    const fullPath = path.join(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      try {
        if (configPath.endsWith('.json')) {
          const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          return config;
        } else {
          // For .js files, we'd need dynamic import, for now just support JSON
          console.warn(chalk.yellow(`JavaScript config files not yet supported: ${configPath}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error loading config from ${configPath}: ${error}`));
      }
    }
  }

  return {};
}

program
  .name('branchwright')
  .description('Git branch name linting and interactive branch creation')
  .version('1.0.0');

program
  .command('create')
  .alias('c')
  .description('Create a new branch interactively')
  .option('-b, --base <branch>', 'Base branch to create from')
  .option('-n, --no-checkout', "Don't checkout to the new branch after creation")
  .option('--dry-run', 'Show what would be done without actually creating the branch')
  .action(async options => {
    try {
      const config = loadConfig();
      const branchwright = new Branchwright(config);

      const branchName = await branchwright.create({
        baseBranch: options.base,
        checkout: options.checkout,
        dryRun: options.dryRun,
      });

      if (branchName && !options.dryRun) {
        console.log(chalk.green(`\n✓ Branch "${branchName}" created successfully!`));
      }
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
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
      const config = loadConfig();
      const branchwright = new Branchwright(config);

      if (options.all) {
        const { simpleGit } = await import('simple-git');
        const git = simpleGit(process.cwd());
        const branches = await git.branchLocal();
        branchNames = branches.all.filter(branch => branch !== 'HEAD');
      } else if (branchNames.length === 0) {
        const { simpleGit } = await import('simple-git');
        const git = simpleGit(process.cwd());
        const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
        branchNames = [currentBranch];
      }

      let hasErrors = false;

      for (const branchName of branchNames) {
        const validation = branchwright.validate(branchName);

        if (validation.valid) {
          console.log(chalk.green(`✓ ${branchName}`));
        } else {
          console.log(chalk.red(`✗ ${branchName}`));
          console.log(chalk.red(`  ${validation.message}`));

          if (validation.suggestions) {
            console.log(chalk.yellow('  Suggestions:'));
            validation.suggestions.forEach(suggestion => {
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
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
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
          patterns: [
            '^(feature|bugfix|hotfix|release|chore)/.+$',
            '^(feat|fix|docs|style|refactor|test|chore)/.+$',
          ],
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
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = loadConfig();
      console.log(chalk.blue('Current configuration:'));
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
