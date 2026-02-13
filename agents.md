# Agent Guidelines

This document provides guidance for AI code assistants working in this repository.

## CRITICAL RULES - READ FIRST

These rules MUST be followed in EVERY session without exception:

### 1. NO CODE COMMENTS
- **NEVER add comments to code** - use self-documenting method names instead
- This includes `//`, `/* */`, and any explanatory text in code
- Avoid sprinkling comments into the source. Favor self-documenting functions, descriptive names, and clean structure.
- When additional context is needed, update this file (or other prompt infrastructure) instead of writing comments directly in code.

### 2. NO AI ATTRIBUTION IN COMMITS
- **NEVER add AI attribution to commit messages**
- This means NO:
    - `Generated with [Claude Code](https://claude.ai/code)`
    - `Co-Authored-By: Claude <noreply@anthropic.com>`
    - Any similar AI tool attribution lines
- Commits should appear as if written by a human developer

## Deployment (Temporary Cutover Arrangement)

GitHub Actions is disabled on `AnnixInvestments/annix` because the org owner account (`AnnixApp`) has been deleted and no remaining member has org-owner permissions. A GitHub Support ticket is pending to transfer ownership.

Until resolved, deployments use a mirror repo:

### Push Flow
1. All development happens on `AnnixInvestments/annix` (origin)
2. The `.githooks/pre-push` hook automatically mirrors `main` to `nbarrett/Annix-sync` (remote: `sync`)
3. GitHub Actions on `nbarrett/Annix-sync` handles Fly.io deployment

### Remotes
- `origin` — `https://github.com/AnnixInvestments/annix.git` (primary repo)
- `sync` — `https://github.com/nbarrett/Annix-sync.git` (deployment mirror)

### What Gets Synced
- Only `main` branch (force push)
- Tags (force push)
- No feature branches

### When This Can Be Removed
Once GitHub Support transfers org ownership to an active account:
1. Enable GitHub Actions on `AnnixInvestments/annix`
2. Copy workflow files from `nbarrett/Annix-sync` if needed
3. Remove the sync lines from `.githooks/pre-push`
4. Remove the `sync` remote: `git remote remove sync`
5. Archive or delete `nbarrett/Annix-sync`
