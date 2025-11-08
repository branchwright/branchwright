# Branchwright 🌳

> Git branch name linting and interactive branch creation - the commitizen/commitlint for branches

[![npm version](https://badge.fury.io/js/branchwright.svg)](https://badge.fury.io/js/branchwright)
[![Node.js CI](https://github.com/yourusername/branchwright/workflows/Node.js%20CI/badge.svg)](https://github.com/yourusername/branchwright/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Branchwright helps teams maintain consistent Git branch naming conventions by providing:
- 🔍 **Branch name linting** - Validate existing branch names
- ✨ **Interactive branch creation** - Guided branch creation workflow
- ⚙️ **Configurable rules** - Customize patterns and validation rules
- 🚀 **CLI & API** - Use as a command-line tool or integrate programmatically
- 📦 **TypeScript support** - Full TypeScript definitions included

## Features

- **Dual Package Support**: Works with both ESM and CommonJS (Node.js 12+)
- **Interactive Prompts**: User-friendly branch creation with inquirer
- **Flexible Validation**: Configurable patterns, length limits, and custom rules
- **Git Integration**: Seamlessly works with your existing Git workflow
- **Zero Dependencies in Production**: Lightweight with minimal runtime dependencies

## Installation

```bash
# Install globally for CLI usage
npm install -g branchwright

# Or install locally in your project
npm install --save-dev branchwright
```

## Quick Start

### CLI Usage

```bash
# Create a new branch interactively
branchwright create

# Validate current branch
branchwright lint

# Validate specific branches
branchwright lint feature/user-auth bugfix/login-error

# Validate all local branches
branchwright lint --all

# Initialize configuration
branchwright init

# View current configuration
branchwright config
```

### Programmatic Usage

```typescript
import { Branchwright } from 'branchwright';

// Create an instance with default configuration
const branchwright = new Branchwright();

// Validate a branch name
const result = branchwright.validate('feature/user-authentication');
if (result.valid) {
  console.log('✓ Branch name is valid');
} else {
  console.log(`✗ Invalid: ${result.message}`);
}

// Create a branch interactively
const newBranch = await branchwright.create();
console.log(`Created branch: ${newBranch}`);
```

## Configuration

Branchwright can be configured through several methods:

### 1. Package.json

Add a `branchwright` section to your `package.json`:

```json
{
  "branchwright": {
    "config": {
      "patterns": [
        "^(feature|bugfix|hotfix|release|chore)/.+$"
      ],
      "maxLength": 100,
      "lowercase": true
    }
  }
}
```

### 2. Configuration File

Create a `.branchwright.json` file in your project root:

```json
{
  "config": {
    "patterns": [
      "^(feature|bugfix|hotfix|release|chore)/.+$",
      "^(feat|fix|docs|style|refactor|test)/.+$"
    ],
    "maxLength": 100,
    "minLength": 5,
    "lowercase": true,
    "disallowed": [" ", "..", "~", "^", ":", "?", "*", "\\\\"]
  },
  "types": [
    {
      "type": "feature",
      "name": "Feature",
      "description": "A new feature or enhancement",
      "pattern": "feature/{description}"
    },
    {
      "type": "bugfix", 
      "name": "Bug Fix",
      "description": "A bug fix",
      "pattern": "bugfix/{description}"
    }
  ]
}
```

### 3. Initialize Default Config

```bash
branchwright init
```

## Configuration Options

### Branch Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `patterns` | `string[]` | `['^(feature\\|bugfix\\|hotfix\\|release\\|chore)/.+$']` | Allowed branch name patterns (regex) |
| `maxLength` | `number` | `100` | Maximum branch name length |
| `minLength` | `number` | `3` | Minimum branch name length |
| `lowercase` | `boolean` | `true` | Enforce lowercase branch names |
| `disallowed` | `string[]` | `[' ', '..', '~', '^', ':', '[', ']', '?', '*', '\\\\']` | Disallowed characters |
| `customValidation` | `function` | `undefined` | Custom validation function |

### Branch Types

Define the types of branches available during interactive creation:

```typescript
interface BranchType {
  type: string;           // Unique identifier
  name: string;           // Display name
  description: string;    // Description shown to user
  pattern: string;        // Template pattern (use {description} placeholder)
}
```

## Default Branch Types

- **feature**: `feature/{description}` - New features or enhancements
- **bugfix**: `bugfix/{description}` - Bug fixes
- **hotfix**: `hotfix/{description}` - Urgent production fixes
- **release**: `release/{description}` - Release branches
- **chore**: `chore/{description}` - Maintenance tasks, refactoring
- **docs**: `docs/{description}` - Documentation updates

## CLI Commands

### `branchwright create`

Create a new branch interactively.

**Options:**
- `-b, --base <branch>` - Base branch to create from (default: current branch)
- `-n, --no-checkout` - Don't checkout to the new branch after creation
- `--dry-run` - Show what would be done without creating the branch

**Examples:**
```bash
# Interactive creation from current branch
branchwright create

# Create from specific base branch
branchwright create --base main

# Create without checking out
branchwright create --no-checkout

# Dry run to see what would happen
branchwright create --dry-run
```

### `branchwright lint`

Validate branch names against configured rules.

**Options:**
- `--all` - Validate all local branches

**Examples:**
```bash
# Validate current branch
branchwright lint

# Validate specific branches
branchwright lint feature/auth bugfix/header-styling

# Validate all local branches
branchwright lint --all
```

### `branchwright init`

Initialize a configuration file with default settings.

**Options:**
- `-f, --format <format>` - Configuration format (currently supports 'json')

### `branchwright config`

Display the current configuration being used.

## API Reference

### Class: `Branchwright`

```typescript
import { Branchwright, BranchwrightOptions } from 'branchwright';

const options: BranchwrightOptions = {
  config: { /* BranchConfig */ },
  types: [ /* BranchType[] */ ],
  cwd: '/path/to/repo' // Optional: specify git repository path
};

const branchwright = new Branchwright(options);
```

#### Methods

##### `validate(branchName: string): ValidationResult`

Validate a branch name against the configured rules.

```typescript
const result = branchwright.validate('feature/user-auth');
// Returns: { valid: boolean, message?: string, suggestions?: string[] }
```

##### `create(options?: CreateBranchOptions): Promise<string | null>`

Start interactive branch creation workflow.

```typescript
const branchName = await branchwright.create({
  baseBranch: 'main',
  checkout: true,
  dryRun: false
});
```

##### `getValidator(): BranchValidator`

Get the underlying validator instance for advanced usage.

##### `getCreator(): BranchCreator`

Get the underlying creator instance for advanced usage.

### Class: `BranchValidator`

```typescript
import { BranchValidator, BranchConfig } from 'branchwright';

const validator = new BranchValidator(config);
```

#### Methods

##### `validate(branchName: string): ValidationResult`

Validate a single branch name.

##### `getConfig(): Required<BranchConfig>`

Get the current validator configuration.

##### `updateConfig(newConfig: Partial<BranchConfig>): void`

Update the validator configuration.

### Class: `BranchCreator`

```typescript
import { BranchCreator, BranchwrightOptions } from 'branchwright';

const creator = new BranchCreator(options);
```

#### Methods

##### `createInteractive(options?: CreateBranchOptions): Promise<string | null>`

Start the interactive branch creation workflow.

##### `validateBranch(branchName: string): void`

Validate and display the result of a branch name.

##### `getTypes(): BranchType[]`

Get available branch types.

##### `addType(type: BranchType): void`

Add a custom branch type.

## Integration Examples

### Pre-commit Hook

Add branch name validation to your git hooks:

```bash
#!/bin/sh
# .git/hooks/pre-push
branchwright lint
if [ $? -ne 0 ]; then
  echo "Branch name validation failed. Aborting push."
  exit 1
fi
```

### GitHub Actions

```yaml
name: Branch Name Lint
on: [pull_request]
jobs:
  lint-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install -g branchwright
      - run: branchwright lint ${{ github.head_ref }}
```

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "branch:create": "branchwright create",
    "branch:lint": "branchwright lint",
    "branch:lint-all": "branchwright lint --all"
  }
}
```

## Migration from Other Tools

### From Git Flow

If you're using git-flow, you can configure similar branch types:

```json
{
  "types": [
    {
      "type": "feature",
      "name": "Feature",
      "description": "New feature development",
      "pattern": "feature/{description}"
    },
    {
      "type": "release",
      "name": "Release",
      "description": "Release preparation",
      "pattern": "release/{description}"
    },
    {
      "type": "hotfix",
      "name": "Hotfix", 
      "description": "Production hotfix",
      "pattern": "hotfix/{description}"
    }
  ]
}
```

### From Conventional Commits

Map conventional commit types to branch types:

```json
{
  "types": [
    {"type": "feat", "name": "Feature", "description": "New feature", "pattern": "feat/{description}"},
    {"type": "fix", "name": "Fix", "description": "Bug fix", "pattern": "fix/{description}"},
    {"type": "docs", "name": "Documentation", "description": "Documentation changes", "pattern": "docs/{description}"},
    {"type": "style", "name": "Style", "description": "Code style changes", "pattern": "style/{description}"},
    {"type": "refactor", "name": "Refactor", "description": "Code refactoring", "pattern": "refactor/{description}"},
    {"type": "test", "name": "Test", "description": "Test changes", "pattern": "test/{description}"},
    {"type": "chore", "name": "Chore", "description": "Maintenance", "pattern": "chore/{description}"}
  ]
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/branchwright.git
cd branchwright

# Install dependencies  
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Test CLI locally
npm run dev create
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT © [Branchwright Contributors](LICENSE)

## Credits

Inspired by:
- [commitizen](https://github.com/commitizen/cz-cli) - Interactive commit message generation
- [commitlint](https://github.com/conventional-changelog/commitlint) - Commit message linting
- [husky](https://github.com/typicode/husky) - Git hooks management

---

**Made with ❤️ by the Branchwright team**