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
- The `run-dev.sh` / `run-dev.ps1` scripts handle everything
- Commit your work without worrying about platform-specific packages

✅ **Workflow (it's automatic!):**
1. Pull changes: `git pull`
2. Start the app: `./run-dev.sh` (Mac/Linux) or `./run-dev.ps1` (Windows)
3. If lock files changed, commit them: `git commit -am "Update lock files"`
4. That's it!

### Important Notes

- ✅ **The run-dev scripts handle everything** - dependency installation, platform-specific packages, etc.
- ✅ Lock files auto-regenerate when you pull (via git hook)
- ✅ If you see lock file changes after pulling, just commit them - they're expected
- ⚠️ Never manually edit lock files

## Testing the Setup

After pulling this change:
1. Run `git pull`
2. You should see: "📦 Regenerating yarn.lock for your platform..."
3. Lock files will be updated for your platform
4. Commit the changes and push

Both Mac and Windows developers can now work together without conflicts! 🎉
