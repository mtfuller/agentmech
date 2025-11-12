# Publishing Guide

This document describes the process for publishing agentmech to NPM.

## Prerequisites

Before publishing, ensure you have:

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **NPM Access Token**: Generate a token with publish permissions
   - Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/~/tokens)
   - Create a new "Automation" token
3. **GitHub Secret**: Add the NPM token to GitHub repository secrets
   - Go to repository Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN` with your NPM automation token

## Publishing Workflow

The project uses GitHub Actions for automated publishing. **Publishing is only triggered when a human manually creates and publishes a GitHub Release for a specific semantic version tag.**

### Semantic Versioning and Tag-Based Release Process

This project follows [Semantic Versioning](https://semver.org/) and uses **Conventional Commits** for automated versioning. Versions are automatically determined and tagged based on commit message prefixes.

#### Conventional Commit Format

When committing to the `main` branch, use these prefixes to control versioning:

- **`fix:`** - Bug fixes → **Patch** version bump (1.0.0 → 1.0.1)
  ```bash
  git commit -m "fix: resolve memory leak in workflow executor"
  ```

- **`feat:`** - New features → **Minor** version bump (1.0.0 → 1.1.0)
  ```bash
  git commit -m "feat: add support for custom MCP servers"
  ```

- **`BREAKING CHANGE:`** or **`feat!:`** / **`fix!:`** - Breaking changes → **Major** version bump (1.0.0 → 2.0.0)
  ```bash
  git commit -m "feat!: redesign workflow configuration schema"
  # or
  git commit -m "feat: redesign schema

  BREAKING CHANGE: workflow format is incompatible with v1.x"
  ```

- **Other prefixes** (e.g., `chore:`, `docs:`, `style:`, `refactor:`, `test:`) → No version bump

#### Automated Release Process

1. **Commit with conventional commit messages**:
   - Use appropriate prefixes (`fix:`, `feat:`, `feat!:`)
   - Include descriptive commit messages
   - Push changes to `main` branch

2. **Automated versioning**:
   - The CI workflow automatically analyzes commit messages
   - Determines the appropriate version bump (patch, minor, or major)
   - Creates a git tag (e.g., `v1.0.1`)
   - Updates `package.json` with the new version
   - Commits and pushes the version change

3. **Manually create a GitHub Release for the tag**:
   - Go to the repository's [Releases page](https://github.com/mtfuller/agentmech/releases)
   - Click "Draft a new release"
   - **Select the tag** that was just created (e.g., `v1.0.1`)
   - Fill in the release title (e.g., "Release 1.0.1")
   - Add release notes describing what changed
   - Click **"Publish release"** (this is the manual trigger)

4. **Automated NPM Publishing**:
   - Once you publish the release, the GitHub Actions workflow is triggered
   - The workflow verifies the package version matches the release tag
   - It runs tests, builds the package, and publishes to NPM
   - Package is published with provenance for supply chain security

**Important**: Publishing to NPM only happens when you manually publish a release. This gives you full control over when packages are published to NPM.

### Manual Publishing (Not Recommended)

If you need to publish manually:

```bash
# Ensure you're on the main branch
git checkout main
git pull

# Run tests
npm test

# Build the project
npm run build

# Login to NPM (one-time setup)
npm login

# Publish with provenance
npm publish --access public
```

## Semantic Versioning and Tags

This project strictly follows [Semantic Versioning](https://semver.org/) with automated versioning based on [Conventional Commits](https://www.conventionalcommits.org/):

- **Patch** (`1.0.x`): Bug fixes and minor changes
  - Triggered by commits starting with `fix:`
  - Example: `fix: resolve memory leak` → 1.0.0 → 1.0.1

- **Minor** (`1.x.0`): New features (backward compatible)
  - Triggered by commits starting with `feat:`
  - Example: `feat: add RAG support` → 1.0.0 → 1.1.0

- **Major** (`x.0.0`): Breaking changes
  - Triggered by commits with `BREAKING CHANGE:` in the body or `!` after type
  - Example: `feat!: redesign API` → 1.0.0 → 2.0.0

The CI workflow automatically:
- Analyzes commit messages since the last tag
- Determines the appropriate version bump
- Updates `package.json` and `package-lock.json`
- Creates a git commit with the version bump
- Creates a git tag (e.g., `v1.0.1`) following semantic versioning
- Pushes the tag to GitHub

**Tag Naming Convention**: All release tags follow the format `vX.Y.Z` where X, Y, and Z are numbers representing major, minor, and patch versions respectively.

## Package Contents

The published package includes:
- `dist/` - Compiled JavaScript and type definitions
- `README.md` - Package documentation
- `LICENSE` - License information
- `docs/` - Additional documentation

Excluded from the package (see `.npmignore`):
- Source TypeScript files (`src/`)
- Test files (`tests/`)
- Example files (`examples/`)
- Configuration files
- Development dependencies

## Pre-publish Checks

Before publishing, the following checks are performed:

1. **Tests**: All tests must pass
2. **Build**: Project must build successfully
3. **Version Check**: PRs to main must bump the version
4. **Package Verification**: Package contents are verified

## CI/CD Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on every push and pull request
- Tests on multiple Node.js versions (20.x, 22.x)
- Builds the project
- Uploads test coverage reports
- **Auto-tags releases** (on push to main):
  - Analyzes commit messages using Conventional Commits format
  - Automatically bumps version based on commit types
  - Creates and pushes semantic version tags
  - Updates package.json with new version

### Publish Workflow (`.github/workflows/publish.yml`)
- Runs when a new release is created
- Runs tests and builds
- Publishes to NPM with provenance
- Uses NPM automation token from GitHub secrets

### Version Check Workflow (`.github/workflows/version-check.yml`)
- Runs on PRs that modify `package.json`
- Ensures version has been bumped
- Prevents accidental same-version publishes

## Troubleshooting

### Publication Failed

If publication fails:
1. Check GitHub Actions logs for error details
2. Verify NPM_TOKEN secret is correctly set
3. Ensure version number hasn't been published before
4. Check NPM account has publish permissions

### Version Conflicts

If you get a version conflict:
```bash
# Check the current published version
npm view agentmech version

# Bump to a higher version
npm version <patch|minor|major>
```

### Testing Package Locally

Before publishing, you can test the package locally:

```bash
# Create a tarball
npm pack

# This creates agentmech-<version>.tgz
# Install it in another project to test
cd /path/to/test-project
npm install /path/to/agentmech-<version>.tgz
```

## Best Practices

1. **Always test before releasing**: Run `npm test` locally
2. **Write clear release notes**: Describe what changed in the release
3. **Follow semantic versioning**: Use appropriate version bumps
4. **Review package contents**: Run `npm pack --dry-run` before publishing
5. **Monitor after publishing**: Check that the package installs correctly
6. **Keep dependencies updated**: Regularly update dependencies for security

## Security

- NPM tokens should never be committed to the repository
- Use GitHub Secrets for sensitive credentials
- Enable 2FA on your NPM account
- Use `--provenance` flag for supply chain transparency
- Regularly audit dependencies with `npm audit`

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/mtfuller/agentmech/issues)
- Check existing documentation in the `docs/` directory
