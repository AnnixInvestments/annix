# Cross-Platform Development Setup

## Problem
The `yarn.lock` file contains platform-specific dependencies (e.g., `@img/sharp-darwin-arm64` on Mac vs `@img/sharp-win32-x64` on Windows), causing merge conflicts.

## Solution Implemented

### Automatic Lock File Regeneration

We've set up **automatic lock file regeneration** after pulling changes. This works on both Mac and Windows.

### How It Works

1. **`.gitattributes`** - Configured to use custom merge strategies for lock files
2. **Post-merge hook** - Automatically regenerates lock files after `git pull`
3. **Platform-specific packages** - Each developer gets the correct binaries for their platform

### For Your Brother (Windows Setup)

The hooks are **already configured** and will work automatically with Git Bash (which comes with Git for Windows).

#### If using PowerShell exclusively:
1. Enable PowerShell scripts in Git:
   ```powershell
   git config --global core.hooksPath .git/hooks
   ```

2. Run this after pulling:
   ```powershell
   .git/hooks/post-merge.ps1
   ```

### What This Means

✅ **No more yarn.lock conflicts!**
- Pull changes normally with `git pull`
- Lock files automatically regenerate for your platform
- Commit your work without worrying about platform-specific packages

✅ **How to use:**
1. Pull changes: `git pull`
2. The hook runs automatically
3. Lock file is regenerated for your platform
4. Continue working!

### Manual Regeneration (if needed)

If you need to manually regenerate the lock files:

**Frontend:**
```bash
cd annix-frontend
yarn install --check-files
```

**Backend:**
```bash
cd annix-backend
npm install
```

### Important Notes

- ⚠️ Always commit the regenerated lock files after pulling
- ⚠️ Don't manually edit lock files
- ⚠️ If you see lock file changes, they're expected - just commit them

## Testing the Setup

After pulling this change:
1. Run `git pull`
2. You should see: "📦 Regenerating yarn.lock for your platform..."
3. Lock files will be updated for your platform
4. Commit the changes and push

Both Mac and Windows developers can now work together without conflicts! 🎉
