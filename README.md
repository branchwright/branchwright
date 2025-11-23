<img src="./assets/logo.svg" alt="Branchwright" width="128" />

# Branchwright

> Git branch name linting and interactive branch creation - the commitizen/commitlint for branches

[![npm](https://img.shields.io/npm/v/%40branchwright%2Fcli)](https://www.npmjs.com/package/@branchwright/cli)
[![npm downloads](https://img.shields.io/npm/dm/%40branchwright%2Fcli)](https://www.npmjs.com/package/@branchwright/cli)
[![Release](https://github.com/branchwright/branchwright/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/branchwright/branchwright/actions/workflows/release.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6)](https://www.typescriptlang.org/)

**Branchwright** helps teams maintain consistent Git branch naming conventions with a streamlined, interactive workflow:

- ✨ **Frictionless branch creation** - Smart defaults, minimal prompts
- 🔍 **Branch name validation** - Lint existing branches against your rules
- 🎯 **Extensible rules system** - Built-in rules plus custom rule plugins
- ⚙️ **Template-based naming** - `{{type}}/{{ticket}}-{{desc}}` or any format you need
- 🚀 **CLI & API** - Use standalone or integrate programmatically
- 📦 **TypeScript-first** - Full type definitions included

## Installation

```bash
# Global installation (recommended)
npm install -g @branchwright/cli

# Project-local installation
npm install --save-dev @branchwright/cli

# Or use without installing
npx @branchwright/cli create
```

## Quick Start

### Interactive Branch Creation

```bash
# If installed globally or locally
brw create

# Without installing (using npx)
npx @branchwright/cli create
```

That's it! Branchwright will guide you through:
1. Selecting a branch type (feat, fix, chore, etc.)
2. Optionally entering a ticket ID
3. Describing your branch
4. Creating and switching to the new branch

The tool uses **smart defaults** to minimize friction:
- Base branch: current branch
- Auto-checkout: yes
- Push to remote: no (optional)

### Validate Branch Names

```bash
# Validate current branch
brw lint

# Validate specific branch
brw lint feature/user-auth

# Validate all branches
brw lint --all
```

## Configuration

Create `branchwright.config.ts` in your project root:

```typescript
import { defineConfig } from '@branchwright/cli';

export default defineConfig({
  // Define your branch types
  branchTypes: [
    { name: 'feat', label: 'Feature' },
    { name: 'fix', label: 'Bug Fix' },
    { name: 'chore', label: 'Chore' },
  ],
  
  // Customize branch name template
  template: '{{type}}/{{ticket}}-{{desc}}',
  
  // Configure rules
  rules: {
    ticketId: ['optional', { prefix: 'PROJ-' }],
  },
  
  // Control optional questions (all default to false)
  extraQuestions: {
    baseBranch: false,    // Ask which branch to base from
    checkout: false,      // Ask whether to switch to new branch
    pushToRemote: false,  // Ask whether to push to remote
  },
  
  // Customize prompts (optional)
  questions: {
    branchType: 'What type of branch?',
    description: 'Describe your change:',
    pushToRemote: 'Push to origin?',
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `branchTypes` | `BranchTypeOption[]` | `[feat, fix, chore]` | Available branch types for selection |
| `template` | `string` | `'{{type}}/{{desc}}'` | Branch name template with placeholders |
| `maxDescriptionLength` | `number` | `24` | Maximum description length |
| `descriptionStyle` | `string` | `'kebab-case'` | Enforce case style: `kebab-case`, `snake_case`, `PascalCase`, `camelCase` |
| `ignoredBranches` | `string[]` | `['main', 'master', 'next', 'dev']` | Branches to skip during validation |
| `rules` | `Rules` | `{}` | Rule configuration (see Rules section) |
| `extraQuestions` | `InteractiveQuestions` | All `false` | Enable optional prompts |
| `questions` | `QuestionConfig` | `{}` | Customize prompt text |

### Template System

Use placeholders in your branch name template:

- `{{type}}` - Branch type (feat, fix, etc.)
- `{{ticket}}` - Ticket ID (if provided)
- `{{desc}}` - Description

**Examples:**
```typescript
// Simple format
template: '{{type}}/{{desc}}'
// Output: feat/user-authentication

// With ticket
template: '{{type}}/{{ticket}}-{{desc}}'
// Output: feat/PROJ-123-user-authentication

// Custom format
template: '{{ticket}}/{{type}}-{{desc}}'
// Output: PROJ-123/feat-user-authentication
```

### Interactive Questions

Control which optional questions are shown during `brw create`:

```typescript
extraQuestions: {
  baseBranch: true,    // Ask "Base branch?" (default: uses current branch)
  checkout: true,      // Ask "Switch to new branch?" (default: yes)
  pushToRemote: true,  // Ask "Push to remote?" (default: no)
}
```

By default, all are `false` for a streamlined experience. The tool:
- Uses your current branch as the base
- Automatically switches to the new branch
- Doesn't push to remote

Enable questions only when you need that flexibility.

### Customizing Prompts

Override the default prompt text:

```typescript
questions: {
  branchType: 'Select the type of work:',
  ticketId: 'Ticket/issue number (optional):',
  ticketIdRequired: 'Ticket/issue number:',
  description: 'Brief description:',
  descriptionWithTicket: 'Describe your changes:',
  baseBranch: 'Create from which branch?',
  checkout: 'Switch to this branch now?',
  proceed: 'Create this branch?',
  pushToRemote: 'Push to origin now?',
}
```

## Rules System

Branchwright includes a powerful, extensible rules engine for validation.

### Built-in Rules

**`ticketId`** - Validate ticket ID format and requirements

```typescript
rules: {
  // Off: No ticket ID validation
  ticketId: 'off',
  
  // Optional: Allow but don't require ticket IDs
  ticketId: 'optional',
  
  // Required: Ticket ID must be present
  ticketId: 'required',
  
  // With prefix validation
  ticketId: ['optional', { prefix: 'PROJ-' }],
  ticketId: ['required', { prefix: 'TEAM-' }],
}
```

### Rule Configuration

Rules accept three severity levels:
- `'off'` - Rule is disabled
- `'optional'` - Rule runs but doesn't block
- `'required'` - Rule must pass

Configuration formats:
```typescript
rules: {
  myRule: true,                           // Boolean (true = required, false = off)
  myRule: 'optional',                     // String severity
  myRule: ['required', { option: 'val' }], // Tuple with options
}
```

### Custom Rules

Define your own validation rules:

```typescript
import { defineRule, coreRuleRegistry, createRegistry } from '@branchwright/cli';

const noWipRule = defineRule(
  {
    id: 'no-wip',
    meta: {
      title: 'Disallow WIP branches',
      description: 'Prevents work-in-progress markers from shipping.',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    if (context.branchName.includes('wip')) {
      return { 
        message: 'Remove "wip" from the branch name.',
        suggestions: [context.branchName.replace('wip', '')],
      };
    }
    return null; // Valid
  },
);

// Use with evaluateRules
const registry = createRegistry(...coreRuleRegistry.entries(), noWipRule);
```

### Rule Plugins

Load custom rules from external modules:

```typescript
// branchwright.config.ts
export default defineConfig({
  plugins: [
    './config/rules/company-rules.ts',  // Local file
    '@acme/branchwright-rules',         // NPM package
  ],
  rules: {
    'no-wip': 'required',
    'acme/ticket-format': ['required', { pattern: /^[A-Z]+-\d+$/ }],
  },
});
```

**Plugin format:**
```typescript
// company-rules.ts
import { defineRule } from '@branchwright/cli';

export default [
  defineRule(/* ... */),
  defineRule(/* ... */),
];
```

### Rule Presets

Combine multiple rule configurations:

```typescript
export default defineConfig({
  presets: [
    'recommended',              // Built-in preset
    '@acme/strict-preset',      // Package preset
  ],
  rules: {
    // Override preset defaults
    ticketId: 'required',
  },
});
```

Presets are merged in order, with explicit `rules` taking final precedence.

## CLI Reference

### `brw create`

Create a new branch interactively or with pre-specified values.

**Flags:**
- `-t, --type <type>` - Pre-specify branch type (e.g., feat, fix, chore)
- `--ticket <id>` - Pre-specify ticket ID (e.g., JIRA-123)
- `-d, --desc <description>` - Pre-specify branch description
- `-y, --yes` - Skip confirmation prompt
- `--push` - Push branch to remote after creation
- `--base <branch>` - Specify base branch (overrides config)
- `--dry-run` - Preview without creating the branch

**Examples:**
```bash
# Standard interactive creation
brw create

# Fully non-interactive - provide all values
brw create -t feat --ticket PROJ-123 -d "add-user-auth" -y

# Partial - skip some prompts
brw create -t fix -d "resolve-login-bug"

# Quick feature branch
brw create -t feat -d "new-dashboard" --push

# Create from specific base
brw create --base main

# Preview what would be created
brw create --dry-run
```

#### Non-Interactive Usage

Use flags to skip interactive prompts entirely - perfect for scripting and CI/CD:

**Quick Branch Creation:**
```bash
# Minimal - just type and description
brw create -t feat -d "add-oauth"

# With ticket ID
brw create -t fix --ticket BUG-456 -d "memory-leak"

# Skip confirmation
brw create -t chore -d "update-deps" -y
```

**Automation & Scripts:**
```bash
# CI/CD workflow
brw create -t release -d "v2.0.0" -y --push

# Batch creation script
for feature in auth payments dashboard; do
  brw create -t feat -d "$feature" -y
done

# Integration with ticket systems
TICKET=$(gh issue view 123 --json number -q .number)
brw create -t feat --ticket "GH-$TICKET" -d "implement-feature" --push
```

**Validation:**

Flags are validated just like interactive input:
- `--type` must match a configured branch type
- `--ticket` must match the configured prefix (if rules.ticketId is set)
- `--desc` must follow descriptionStyle and maxDescriptionLength rules

**Disabling Tips:**

To hide CLI tip messages globally (e.g., for experienced users):

```typescript
export default defineConfig({
  showCliTips: false,  // Disable "you can use flags" tip
  // ... rest of config
});
```

### `brw lint [branches...]`

Validate branch names against your rules.

**Flags:**
- `--all` - Check all local branches

**Examples:**
```bash
# Validate current branch
brw lint

# Validate specific branches
brw lint feature/auth fix/login-bug

# Check all branches
brw lint --all
```

### `brw init`

Generate a default `branchwright.config.ts` file.

### `brw config`

Display your current configuration.

## Programmatic API

Use Branchwright in your Node.js code:

```typescript
import { Branchwright } from '@branchwright/cli';

const branchwright = new Branchwright();

// Validate a branch name
const result = await branchwright.validate('feat/user-auth');
console.log(result.valid ? '✓ Valid' : `✗ ${result.message}`);

// Create a branch interactively
const branchName = await branchwright.create();

// Access underlying components
const validator = branchwright.getValidator();
const creator = branchwright.getCreator();
```

### Advanced: Rule Evaluation

```typescript
import { evaluateRules, coreRuleRegistry } from '@branchwright/cli';

const config = { /* your config */ };
const violations = await evaluateRules('feat/my-branch', config, coreRuleRegistry);

violations.forEach(v => console.error(v.message));
```

## Integration

### Git Hooks (Husky)

Validate branch names before pushing:

```bash
npm install --save-dev husky
npx husky init
```

**.husky/pre-push:**
```bash
#!/bin/sh
npx brw lint || exit 1
```

### CI/CD (GitHub Actions)

```yaml
name: Branch Lint
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @branchwright/cli
      - run: brw lint ${{ github.head_ref }}
```

### NPM Scripts

```json
{
  "scripts": {
    "branch": "brw create",
    "branch:lint": "brw lint"
  }
}
```

## Common Patterns

### Conventional Commits Style

```typescript
export default defineConfig({
  branchTypes: [
    { name: 'feat', label: 'feat: New feature' },
    { name: 'fix', label: 'fix: Bug fix' },
    { name: 'docs', label: 'docs: Documentation' },
    { name: 'refactor', label: 'refactor: Code refactoring' },
    { name: 'test', label: 'test: Testing' },
    { name: 'chore', label: 'chore: Maintenance' },
  ],
  template: '{{type}}/{{desc}}',
});
```

### Ticket-Required Workflow

```typescript
export default defineConfig({
  template: '{{type}}/{{ticket}}-{{desc}}',
  rules: {
    ticketId: ['required', { prefix: 'PROJ-' }],
  },
});
```

### Team with Optional Extras

```typescript
export default defineConfig({
  template: '{{type}}/{{ticket}}-{{desc}}',
  rules: {
    ticketId: ['optional', { prefix: 'TEAM-' }],
  },
  extraQuestions: {
    pushToRemote: true,  // Ask about pushing
  },
});
```

## Troubleshooting

### "Not in a git repository"

Ensure you're running commands inside a Git repository:
```bash
git init  # If needed
```

### Branch name validation fails

Check your configuration:
```bash
brw config
```

Verify your branch name matches the template and rules.

### Custom rules not loading

Ensure plugin paths are correct and exports match the expected format:
```typescript
// my-rules.ts
export default [defineRule(/* ... */)];
```

## License

MIT © [Branchwright Contributors](LICENSE)

---

**Developed and maintained by Noldaru.**