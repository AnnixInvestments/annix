import type { FeedbackClassification } from "./entities/customer-feedback.entity";

export interface FeedbackTriageFixture {
  id: string;
  content: string;
  expected: FeedbackClassification;
}

export const FEEDBACK_TRIAGE_REGRESSION_SET: FeedbackTriageFixture[] = [
  {
    id: "broken-save-button",
    expected: "bug",
    content: "The save button does nothing on the customer quote page and no confirmation appears.",
  },
  {
    id: "totals-incorrect",
    expected: "data-issue",
    content:
      "The invoice total excludes VAT on the summary card even though the line items include VAT.",
  },
  {
    id: "layout-overlap-mobile",
    expected: "ui-issue",
    content: "On mobile the action buttons overlap the table and I cannot tap the bottom row.",
  },
  {
    id: "feature-export-pdf",
    expected: "feature-request",
    content: "Please add a way to export the job card history to PDF from the stock control page.",
  },
  {
    id: "how-to-reset-password",
    expected: "question",
    content: "How do I reset my supplier portal password without asking an admin?",
  },
  {
    id: "wrong-customer-name",
    expected: "data-issue",
    content:
      "The delivery note shows the wrong customer name after I switch companies in preview mode.",
  },
  {
    id: "sidebar-cut-off",
    expected: "ui-issue",
    content: "The sidebar text is cut off and the close icon is half outside the panel on Safari.",
  },
  {
    id: "screen-crash",
    expected: "bug",
    content: "Opening the stock allocation modal crashes the page with a blank white screen.",
  },
];
