import type { FeedbackResolutionStatus, FeedbackStatus } from "./contracts";

export const FEEDBACK_STATUS_STEPS: FeedbackStatus[] = [
  "submitted",
  "triaged",
  "in_progress",
  "resolved",
];

export function feedbackStatusLabel(status: FeedbackStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "triaged":
      return "Triaged";
    case "in_progress":
      return "In progress";
    case "resolved":
      return "Resolved";
  }
}

export function feedbackResolutionLabel(status: FeedbackResolutionStatus | null): string | null {
  if (!status) {
    return null;
  }

  switch (status) {
    case "needs_investigation":
      return "Needs investigation";
    case "investigating":
      return "Investigating";
    case "fix_in_progress":
      return "Fix in progress";
    case "fix_deployed":
      return "Fix deployed";
    case "verified":
      return "Verified";
    case "cannot_reproduce":
      return "Cannot reproduce";
    case "wont_fix":
      return "Won't fix";
    case "duplicate":
      return "Duplicate";
  }
}

export function feedbackStepState(
  currentStatus: FeedbackStatus,
  step: FeedbackStatus,
): "upcoming" | "current" | "complete" {
  const currentIndex = FEEDBACK_STATUS_STEPS.indexOf(currentStatus);
  const stepIndex = FEEDBACK_STATUS_STEPS.indexOf(step);

  if (stepIndex < currentIndex) {
    return "complete";
  }

  if (stepIndex === currentIndex) {
    return "current";
  }

  return "upcoming";
}
