# Contributing to Branchwright

Thank you for your interest in contributing to Branchwright! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples** - include links to files, code snippets, or commands
* **Describe the behavior you observed** and what you expected to see
* **Include screenshots** if relevant
* **Note your environment** - OS, Node.js version, npm/yarn version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

* **Use a clear and descriptive title**
* **Provide a detailed description** of the suggested enhancement
* **Explain why this enhancement would be useful** to most users
* **List any similar features** in other projects if applicable

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Update documentation as needed
6. Write a clear commit message

## Development Setup

### Prerequisites

- Node.js 12 or higher
- npm, yarn, or pnpm

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/branchwright/branchwright.git
cd branchwright

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Project Structure

```
branchwright/
├── src/
│   ├── branchwright.ts    # Main entry point
│   ├── cli.ts             # CLI implementation
│   ├── config.ts          # Configuration handling
│   ├── creator.ts         # Interactive branch creation
│   ├── validator.ts       # Branch name validation
│   ├── rules/             # Validation rules
│   └── __tests__/         # Test files
├── assets/                # Static assets
└── ...                    # Config files
```

## Coding Guidelines

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for function parameters and return types
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow the existing code style
- Use ESLint and Prettier configurations provided
- Run `npm run lint` before committing
- Write meaningful variable and function names

### Testing

- Write tests for new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the existing test structure

### Commits

We use conventional commits for clear and structured commit history:

```
feat: add new validation rule
fix: correct branch name parsing
docs: update README with examples
test: add tests for creator module
chore: update dependencies
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/my-new-feature
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

## Pull Request Process

1. Update the README.md or documentation with details of changes if applicable
2. Update the CHANGELOG.md following the existing format
3. The PR will be merged once you have the sign-off of at least one maintainer
4. Ensure all CI checks pass

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Building

```bash
# Build for production
npm run build

# Build in watch mode
npm run build:watch
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## License

By contributing to Branchwright, you agree that your contributions will be licensed under its MIT License.

## Recognition

Contributors who make significant contributions will be recognized in the project's README and release notes.

Thank you for contributing! 🎉
