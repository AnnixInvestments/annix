# Feedback Automation Ops

This runbook covers the operational side of the feedback-to-fix pipeline.

## Tracker Issue Overrides

Use these labels on a consolidated feedback tracker issue when you need to override the normal Claude trigger rules for new incoming feedback comments on that tracker:

- `force-claude`
  - Triggers `@claude` even when the feedback is classified as `question` or `feature-request`
  - Use this when the classifier is under-calling a class of clearly fixable issues

- `skip-claude`
  - Prevents `@claude` from being added even for `bug`, `ui-issue`, or `data-issue`
  - Use this when a tracker is noisy, a subsystem is unstable, or human review is temporarily required

If both labels are present, `skip-claude` wins.

These labels affect new feedback comments posted after the label is added. They do not rewrite old comments.

## Common Failure Modes

### Claude workflow quota or auth failure

Symptoms:

- `Claude Automation Failed` comment appears on the tracker issue
- workflow log mentions auth failure or quota exhaustion

What to do:

1. Open the workflow run linked in the failure comment
2. Confirm whether the root cause is quota, auth, or a real repo problem
3. If it is quota or auth, resolve that first and rerun the workflow
4. If the issue is urgent, handle it manually or add `skip-claude` to stop further auto-triggers on that tracker until fixed

### Claude produced a bad PR or repeated failures

What to do:

1. Add `skip-claude` to the relevant tracker issue if repeated attempts are low quality
2. Add a short issue comment describing why automation is paused
3. Route the item to manual review

### Human-approved feedback merge

When a feedback PR is deployed to staging, the tracker issue receives a staging comment with the PR link and staging URL.

To approve merge from GitHub:

1. verify the staging build
2. confirm checks are green
3. comment `/merge #PR_NUMBER` on the feedback tracker issue

Only human collaborators with write-or-higher permission can use this command.

## Operational Hygiene

### Token rotation

- Rotate GitHub and Claude-related secrets through repository secrets
- Re-run one known-safe workflow after rotation to confirm auth still works

### Branch and PR cleanup

- Periodically review stale Claude-created branches and PRs
- Close branches tied to abandoned or superseded feedback threads

### Reviewing automation quality

Track at minimum:

- classification mix by app
- Claude-trigger rate
- triage regression accuracy
- PR creation rate
- merge rate
- repeat-failure rate
- issues that required `skip-claude`

## Suggested Escalation Rule

If the same tracker issue sees repeated automation failures in a short window:

1. add `skip-claude`
2. leave a short issue comment explaining that automation is temporarily paused
3. investigate classifier quality, auth state, or workflow health before re-enabling
