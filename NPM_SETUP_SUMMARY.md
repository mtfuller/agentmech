# NPM Publishing Setup - Complete Summary

This document provides a complete overview of the CI/CD pipeline setup for publishing `agentmech` to NPM.

## 🎯 What Was Done

A production-ready CI/CD pipeline has been configured to automate the testing, building, and publishing of the agentmech package to NPM, following industry best practices and security standards.

## 📦 Files Added/Modified

### New Files
- `.github/workflows/ci.yml` - Continuous Integration workflow
- `.github/workflows/publish.yml` - NPM publishing workflow  
- `.github/workflows/version-check.yml` - Version bump verification
- `.github/workflows/README.md` - Workflow documentation
- `.npmignore` - Package content control
- `LICENSE` - ISC license file
- `CHANGELOG.md` - Version history tracker
- `docs/PUBLISHING.md` - Comprehensive publishing guide

### Modified Files
- `package.json` - Added NPM metadata and publishing configuration
- `README.md` - Added NPM installation instructions
- `.gitignore` - Added actionlint exclusion

## 🚀 Quick Start - How to Publish

### First-Time Setup (One-time)

1. **Create NPM Account** (if you don't have one)
   - Go to [npmjs.com](https://www.npmjs.com/signup)
   - Verify your email

2. **Generate NPM Token**
   - Login to npmjs.com
   - Go to Profile → Access Tokens
   - Click "Generate New Token"
   - Choose "Automation" type
   - Copy the token (starts with `npm_...`)

3. **Add Token to GitHub**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your NPM token
   - Click "Add secret"

### Publishing a New Version (Semantic Versioning with Tags)

```bash
# 1. Ensure code is ready
git checkout main
git pull
npm test  # Verify all tests pass

# 2. Create semantic version tag and update package.json (choose one)
npm version patch   # Bug fixes: 1.0.0 → 1.0.1, creates v1.0.1 tag
npm version minor   # New features: 1.0.0 → 1.1.0, creates v1.1.0 tag
npm version major   # Breaking changes: 1.0.0 → 2.0.0, creates v2.0.0 tag
# This automatically updates package.json, creates a commit, and creates a tag

# 3. Push version commit and tags to GitHub
git push origin main --follow-tags

# 4. MANUALLY create and publish GitHub Release for the tag
# ⚠️ IMPORTANT: Publishing to NPM only happens when you manually publish a release
#
# Option A: Via GitHub UI (Recommended)
#   - Go to https://github.com/mtfuller/agentmech/releases/new
#   - Select the tag that was just pushed (e.g., v1.0.1)
#   - Add release title: "Release 1.0.1" (or similar)
#   - Add release notes describing changes
#   - Click "Publish release" ← This triggers NPM publishing
#
# Option B: Via gh CLI
gh release create v1.0.1 --title "Release 1.0.1" --notes "Release notes here"

# 5. Monitor the automated workflow
# Go to Actions tab and watch the "Publish to NPM" workflow
# It will verify version matches tag, run tests, and publish to NPM
```

**Key Points**:
- Tags follow semantic versioning (vX.Y.Z format)
- Package.json is automatically bumped by `npm version`
- **You must manually create and publish the GitHub Release** - this gives you control
- NPM publishing is triggered only when you publish the release

## 🔄 How the Workflows Work

### CI Workflow (Runs on every push and PR)
```
Push to main / Create PR
    ↓
Run tests on Node 14.x, 16.x, 18.x, 20.x
    ↓
Build the project
    ↓
Verify package can be packed
    ↓
Upload coverage reports and package artifact
```

### Publish Workflow (Runs on release creation)
```
Create GitHub Release
    ↓
Checkout code
    ↓
Install dependencies
    ↓
Run all tests (must pass)
    ↓
Build the project
    ↓
Verify package contents
    ↓
Publish to NPM with provenance
```

### Version Check Workflow (Runs on PRs modifying package.json)
```
PR with package.json changes
    ↓
Compare version in PR vs main branch
    ↓
Pass if version increased, Fail if same
```

## 📊 Package Information

- **Package Name**: `agentmech`
- **Current Version**: `1.0.0`
- **Package Size**: ~114.5 kB (compressed)
- **Unpacked Size**: ~534.3 kB
- **Files Included**: 134 files
- **Node.js Version**: >=14.0.0

### What Gets Published
✅ `dist/` - Compiled JavaScript and type definitions  
✅ `docs/` - Documentation files  
✅ `README.md` - Package documentation  
✅ `LICENSE` - License file  

### What Gets Excluded
❌ `src/` - Source TypeScript files  
❌ `tests/` - Test files  
❌ `examples/` - Example workflows  
❌ Configuration files (tsconfig.json, jest.config.js, etc.)  
❌ Development dependencies  

## 🔒 Security Features

- ✅ **Explicit Permissions**: All workflows use least-privilege permissions
- ✅ **Script Injection Prevention**: Environment variables used for GitHub context
- ✅ **NPM Provenance**: Supply chain transparency and verification
- ✅ **CodeQL Verified**: Zero security vulnerabilities detected
- ✅ **Secret Management**: NPM token stored securely in GitHub Secrets
- ✅ **Automated Testing**: All tests must pass before publishing

## 📚 Documentation

Complete guides are available in:

1. **`docs/PUBLISHING.md`** - Comprehensive publishing guide with:
   - Detailed prerequisites
   - Step-by-step workflows
   - Version management
   - Troubleshooting
   - Best practices

2. **`.github/workflows/README.md`** - Workflow-specific documentation with:
   - Workflow descriptions
   - Usage instructions
   - Setup guide
   - Troubleshooting

3. **`CHANGELOG.md`** - Version history and change tracking

## 🧪 Validation & Testing

All components have been validated:

- ✅ **Actionlint**: All workflows pass validation
- ✅ **CodeQL**: Zero security alerts
- ✅ **Tests**: 168/169 tests passing (1 intentionally skipped)
- ✅ **Build**: Successful compilation
- ✅ **Package**: Valid structure and contents

## ⚠️ Important Notes

### Before First Publish
1. Ensure NPM_TOKEN secret is configured in GitHub
2. Verify you have publish rights to the `agentmech` package name
3. If package name is taken, update `name` field in package.json

### Version Management
- Always use `npm version` command to bump versions
- Never manually edit version in package.json
- Follow semantic versioning: MAJOR.MINOR.PATCH

### Testing Locally
Before publishing, you can test the package locally:
```bash
# Create a local package
npm pack

# Install in another project to test
cd /path/to/test-project
npm install /path/to/agentmech-1.0.0.tgz

# Test the CLI
npx agentmech --version
```

## 🐛 Troubleshooting

### Workflow Fails
- Check the Actions tab for detailed error logs
- Most common: Missing NPM_TOKEN secret
- Verify all tests pass locally first

### Package Name Already Taken
If `agentmech` is already taken on NPM:
1. Choose a different name (e.g., `@yourorg/agentmech`)
2. Update `name` field in `package.json`
3. Re-run the publishing process

### Version Conflict
```bash
# Check current published version
npm view agentmech version

# Bump to a higher version
npm version patch  # (or minor/major)
```

### Can't Login to NPM
- Ensure 2FA is set up on your NPM account
- Use automation token (not classic token)
- Verify token has publish permissions

## 📈 Next Steps

### Immediate
1. ✅ Set up NPM token in GitHub secrets
2. ✅ Test the workflow by creating a test release
3. ✅ Verify package appears on npmjs.com

### Ongoing
- Update CHANGELOG.md with each release
- Write meaningful release notes
- Monitor npm downloads and issues
- Keep dependencies updated (`npm audit`, `npm update`)

## 🤝 Contributing

When contributors make PRs:
- CI workflow runs automatically
- Version check runs if package.json is modified
- All tests must pass before merge
- Version must be bumped if merging to main

## 📞 Support

- **Documentation**: See `docs/PUBLISHING.md` for full details
- **Workflow Help**: See `.github/workflows/README.md`
- **Issues**: https://github.com/mtfuller/agentmech/issues

## ✅ Setup Complete

The repository is now ready for NPM publishing! Once you add the NPM_TOKEN secret, you can publish by creating a GitHub release.

To verify the setup:
```bash
# Check that package builds
npm run build

# Check that tests pass
npm test

# Check what will be published
npm pack --dry-run
```

Good luck with your NPM package! 🚀
