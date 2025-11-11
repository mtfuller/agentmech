# GitHub Actions Workflows

This directory contains the CI/CD workflows for the agentmech project.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger**: Push to `main` branch or Pull Requests to `main`

**Purpose**: Continuous Integration - ensures code quality and compatibility

**Jobs**:
- **test**: Runs tests on multiple Node.js versions (14.x, 16.x, 18.x, 20.x)
  - Installs dependencies
  - Builds the project
  - Runs test suite
  - Uploads coverage reports (Node 20.x only)

- **build-check**: Verifies the package can be built and packed
  - Builds the project
  - Packs the package (simulates npm publish)
  - Lists package contents
  - Uploads the tarball as artifact

**When to use**: Runs automatically on every push and PR. No manual action needed.

### 2. Publish Workflow (`publish.yml`)

**Trigger**: When a new GitHub Release is created

**Purpose**: Automated publishing to NPM

**Prerequisites**:
1. NPM_TOKEN secret must be configured in repository settings
   - Go to Settings → Secrets and variables → Actions
   - Add secret named `NPM_TOKEN` with your NPM automation token

**Jobs**:
- **publish**: Publishes the package to NPM
  - Runs tests
  - Builds the project
  - Verifies package contents
  - Publishes to NPM with provenance

**How to use**:
1. Update version: `npm version patch|minor|major`
2. Push changes: `git push origin main --follow-tags`
3. Create a GitHub Release:
   - Go to Releases → Draft a new release
   - Choose the tag that was just created
   - Fill in release notes
   - Click "Publish release"
4. Workflow runs automatically and publishes to NPM

### 3. Version Check Workflow (`version-check.yml`)

**Trigger**: Pull Requests that modify `package.json`

**Purpose**: Ensures version has been bumped before merging to main

**Jobs**:
- **check-version**: Compares PR version with base branch version
  - Fails if version hasn't been updated
  - Passes if version has been incremented

**When to use**: Runs automatically on PRs that change package.json

## Setup Instructions

### First-Time Setup

1. **Generate NPM Token**:
   ```bash
   # Login to npmjs.com
   # Go to Access Tokens → Generate New Token
   # Choose "Automation" token type
   # Copy the token
   ```

2. **Add GitHub Secret**:
   - Go to repository Settings
   - Navigate to Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your NPM token)
   - Click "Add secret"

3. **Verify CI Workflow**:
   - Make a small change and create a PR
   - Verify CI workflow runs and passes

### Publishing a New Version

```bash
# 1. Ensure you're on main branch
git checkout main
git pull

# 2. Update version (this also creates a git tag)
npm version patch   # for bug fixes (1.0.0 → 1.0.1)
npm version minor   # for new features (1.0.0 → 1.1.0)
npm version major   # for breaking changes (1.0.0 → 2.0.0)

# 3. Push changes and tags
git push origin main --follow-tags

# 4. Create GitHub Release
# Go to: https://github.com/mtfuller/agentmech/releases/new
# - Select the tag that was just created (e.g., v1.0.1)
# - Add release title and notes
# - Click "Publish release"

# 5. Monitor workflow
# Go to: Actions tab
# Watch the "Publish to NPM" workflow
# Verify it completes successfully
```

### Troubleshooting

**CI workflow fails**:
- Check the error in Actions tab
- Common issues: test failures, build errors
- Fix the issue and push again

**Publish workflow fails**:
- Check Actions tab for detailed error
- Verify NPM_TOKEN secret is set correctly
- Ensure version hasn't been published before
- Check NPM account has publish permissions

**Version check fails**:
- Update version in package.json: `npm version patch`
- Or manually update version field in package.json

## Best Practices

1. **Always test locally** before pushing:
   ```bash
   npm test
   npm run build
   npm pack --dry-run
   ```

2. **Write meaningful release notes** in GitHub Releases

3. **Follow semantic versioning**:
   - PATCH: Bug fixes
   - MINOR: New features (backward compatible)
   - MAJOR: Breaking changes

4. **Keep dependencies updated**:
   ```bash
   npm audit
   npm update
   ```

5. **Monitor published package**:
   - Check npmjs.com/package/agentmech
   - Verify installation works: `npm install -g agentmech`
   - Test the CLI: `agentmech --version`

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Full Publishing Guide](../../docs/PUBLISHING.md)
