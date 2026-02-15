# How to Copy This Template

## ⚠️ CRITICAL: Exclude These Folders

When copying this template to create a new MCP app, you **MUST EXCLUDE** the following:

```
❌ node_modules/    # Dependencies (50-100MB) - install fresh
❌ dist/            # Build output - regenerate for new app
❌ .DS_Store        # macOS system file
```

## Recommended Copy Commands

### For AI Agents / Scripts

```bash
# Using rsync (best option)
rsync -av \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  templates/base-template-sdk/ new-template-name/

cd new-template-name
npm install
npm run build
```

### For Manual Copying

```bash
# Copy entire directory
cp -r templates/base-template-sdk new-template-name

# Enter and clean up
cd new-template-name
rm -rf node_modules dist .DS_Store

# Fresh install
npm install
npm run build

# Optional but recommended for local preview in Template Lab
cp /path/to/sample/response.json ./response.json
```

## Files to ALWAYS Copy

✅ **Source Files:**
- `src/` - All source TypeScript and CSS files
- `mcp-app.html` - HTML shell

✅ **Recommended for local preview tooling:**
- `response.json` - Template-specific mock payload for `tools/template-lab` (optional for runtime)

✅ **Configuration:**
- `package.json` - Dependencies manifest
- `package-lock.json` - Lock file for consistent installs
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build configuration
- `.gitignore` - Git ignore rules

✅ **Documentation:**
- `README.md` - User guide
- `AGENTS.md` - AI agent guide
- `CSP_GUIDE.md` - Content Security Policy guide
- `COPY-TEMPLATE.md` - This file

## Why Exclude These Folders?

### node_modules/
- **Size**: 50-100MB with thousands of files
- **Problem**: Can cause conflicts between different template versions
- **Solution**: Fresh `npm install` ensures correct dependencies for new template

### dist/
- **Content**: Built HTML file specific to base template
- **Problem**: Contains bundled code from base template, not your new app
- **Solution**: Fresh `npm run build` generates correct bundle for your app

## Verification

After copying, verify you have a clean setup:

```bash
cd new-template-name

# Should NOT exist initially
ls dist/         # Should fail (doesn't exist yet)
ls node_modules/ # Should fail (doesn't exist yet)

# Install and build
npm install      # Creates node_modules/
npm run build    # Creates dist/

# Now these should exist
ls dist/mcp-app.html          # ✓ Your new app's bundle
ls node_modules/@modelcontextprotocol/  # ✓ Fresh dependencies
```

## For AI Agents

When programmatically copying this template:

1. **Read the exclude list** from this file or `.gitignore`
2. **Use rsync or similar** that supports exclusion patterns
3. **Always run** `npm install` after copying
4. **Always run** `npm run build` to generate fresh dist
5. **Never copy** the built `dist/mcp-app.html` from base template

## Quick Reference

```bash
# ✅ CORRECT: Exclude build artifacts
rsync -av --exclude='node_modules' --exclude='dist' templates/base-template-sdk/ new-app/

# ❌ WRONG: Copy everything including build artifacts
cp -r templates/base-template-sdk new-app
```

---

**Last Updated**: 2025-02-11
