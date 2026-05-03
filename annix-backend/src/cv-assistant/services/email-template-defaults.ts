import { CvEmailTemplateKind } from "../entities/cv-assistant-email-template.entity";

export interface EmailTemplateDefinition {
  kind: CvEmailTemplateKind;
  label: string;
  description: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  /** Placeholders this template supports — surfaced in the editor UI. */
  placeholders: string[];
}

const REJECTION: EmailTemplateDefinition = {
  kind: CvEmailTemplateKind.REJECTION,
  label: "Rejection",
  description: "Sent when a candidate's application is declined.",
  subject: "Application Update — {{jobTitle}}",
  bodyHtml: `<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at {{companyName}} and for taking the time to apply.</p>
<p>After careful consideration of your application, we regret to inform you that we will not be moving forward with your candidacy at this time.</p>
<p>We appreciate your interest in our company and wish you the best in your job search.</p>`,
  bodyText: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful consideration of your application, we regret to inform you that we will not be moving forward with your candidacy at this time.

We appreciate your interest in our company and wish you the best in your job search.`,
  placeholders: ["candidateName", "jobTitle", "companyName"],
};

const SHORTLIST: EmailTemplateDefinition = {
  kind: CvEmailTemplateKind.SHORTLIST,
  label: "Shortlist",
  description: "Sent when a candidate is moved to the shortlist.",
  subject: "Great News About Your Application — {{jobTitle}}",
  bodyHtml: `<p>Dear {{candidateName}},</p>
<p>We are pleased to inform you that your application for the <strong>{{jobTitle}}</strong> position at {{companyName}} has been shortlisted.</p>
<p>Your qualifications and experience have impressed our team, and we would like to learn more about you.</p>
<p>A member of our team will be in touch shortly to discuss the next steps in the recruitment process.</p>`,
  bodyText: `Dear {{candidateName}},

We are pleased to inform you that your application for the {{jobTitle}} position at {{companyName}} has been shortlisted.

Your qualifications and experience have impressed our team, and we would like to learn more about you.

A member of our team will be in touch shortly to discuss the next steps in the recruitment process.`,
  placeholders: ["candidateName", "jobTitle", "companyName"],
};

const ACCEPTANCE: EmailTemplateDefinition = {
  kind: CvEmailTemplateKind.ACCEPTANCE,
  label: "Acceptance / Offer",
  description: "Sent when a candidate is selected for the role.",
  subject: "Congratulations — {{jobTitle}}",
  bodyHtml: `<p>Dear {{candidateName}},</p>
<p>We are thrilled to inform you that you have been selected for the <strong>{{jobTitle}}</strong> position at {{companyName}}.</p>
<p>Our team was impressed by your qualifications and we believe you will be a great addition to our organisation.</p>
<p>A member of our team will contact you shortly with details about the next steps and offer letter.</p>`,
  bodyText: `Dear {{candidateName}},

We are thrilled to inform you that you have been selected for the {{jobTitle}} position at {{companyName}}.

Our team was impressed by your qualifications and we believe you will be a great addition to our organisation.

A member of our team will contact you shortly with details about the next steps and offer letter.`,
  placeholders: ["candidateName", "jobTitle", "companyName"],
};

const REFERENCE_REQUEST: EmailTemplateDefinition = {
  kind: CvEmailTemplateKind.REFERENCE_REQUEST,
  label: "Reference request",
  description: "Sent to a candidate's references asking for feedback.",
  subject: "Reference Request — {{candidateName}} for {{jobTitle}}",
  bodyHtml: `<p>Dear {{referenceName}},</p>
<p><strong>{{candidateName}}</strong> has applied for the position of <strong>{{jobTitle}}</strong> at {{companyName}} and has listed you as a reference.</p>
<p>We would greatly appreciate if you could take a few minutes to provide feedback about your experience working with {{candidateName}}.</p>
<p>Click the link below to share your feedback — it should take less than five minutes:</p>
<p><a href="{{feedbackLink}}">Provide reference feedback</a></p>`,
  bodyText: `Dear {{referenceName}},

{{candidateName}} has applied for the position of {{jobTitle}} at {{companyName}} and has listed you as a reference.

We would greatly appreciate if you could take a few minutes to provide feedback about your experience working with {{candidateName}}.

Provide your feedback here: {{feedbackLink}}`,
  placeholders: ["referenceName", "candidateName", "jobTitle", "companyName", "feedbackLink"],
};

const ACKNOWLEDGEMENT: EmailTemplateDefinition = {
  kind: CvEmailTemplateKind.ACKNOWLEDGEMENT,
  label: "Application received",
  description: "Sent immediately when a CV is received and queued for review.",
  subject: "We received your application — {{jobTitle}}",
  bodyHtml: `<p>Dear {{candidateName}},</p>
<p>Thank you for applying for the <strong>{{jobTitle}}</strong> position at {{companyName}}. We've received your application (reference {{jobReference}}) and our team is reviewing it.</p>
<p>You can expect to hear from us within {{responseTimelineDays}} days.</p>`,
  bodyText: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} position at {{companyName}}. We've received your application (reference {{jobReference}}) and our team is reviewing it.

You can expect to hear from us within {{responseTimelineDays}} days.`,
  placeholders: [
    "candidateName",
    "jobTitle",
    "companyName",
    "jobReference",
    "responseTimelineDays",
  ],
};

export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateDefinition[] = [
  REJECTION,
  SHORTLIST,
  ACCEPTANCE,
  REFERENCE_REQUEST,
  ACKNOWLEDGEMENT,
];

export const defaultByKind = (kind: CvEmailTemplateKind): EmailTemplateDefinition => {
  const match = EMAIL_TEMPLATE_DEFAULTS.find((d) => d.kind === kind);
  if (!match) {
    throw new Error(`No default email template registered for kind: ${kind}`);
  }
  return match;
};

/**
 * Replace `{{key}}` placeholders in a template string with values from `vars`.
 * Missing keys are left as-is so the user notices in the preview.
 */
export const renderTemplate = (
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string => {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const value = vars[key as string];
    if (value === undefined || value === null) return match;
    return String(value);
  });
};
