---
name: codebase-stats
description: Regenerate the codebase evolution stats report (codebase-evolution-stats.html). Run this on demand to update the interactive HTML dashboard that shows LOC growth, commit activity, contributor breakdown, and productivity metrics. The generated file is committed to git and served as a static page in production.
---

# Codebase Evolution Stats

Regenerate the interactive codebase evolution report at `annix-frontend/public/codebase-evolution-stats.html`.

## What this does

Runs `scripts/generate-evolution-report.js` which analyses git history and the codebase to produce an interactive HTML dashboard showing:

- Total lines of TypeScript code (frontend vs backend split)
- Commit activity and weekly trends
- Contributor breakdown
- File type distribution
- Cumulative LOC growth over time
- Productivity comparison (team+AI vs vendor baseline)

## Steps

1. Run the generator script:
   ```bash
   node scripts/generate-evolution-report.js
   ```

2. Verify the output file was created:
   ```bash
   ls -la annix-frontend/public/codebase-evolution-stats.html
   ```

3. Stage the updated report:
   ```bash
   git add annix-frontend/public/codebase-evolution-stats.html
   ```

4. Tell the user the report has been regenerated and is staged for commit. Do NOT commit or push automatically -- let the user decide when to include it in a commit.

## Notes

- The report is committed to git so it deploys to production as a static file
- It is served at `/codebase-evolution-stats.html` on the production site
- The admin dashboard links to it from the "Codebase Evolution" button
- Run this skill whenever the user wants to update the production stats page
