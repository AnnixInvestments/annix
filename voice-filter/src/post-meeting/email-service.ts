import { createTransport, type Transporter } from "nodemailer";
import type { EmailAttachment, EmailOptions, MeetingSummary } from "./types.js";

interface EmailServiceConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName?: string;
}

export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;
  private fromName: string;

  constructor(config: EmailServiceConfig) {
    this.transporter = createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    this.fromAddress = config.fromAddress;
    this.fromName = config.fromName ?? "Voice Filter Meeting Assistant";
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const attachments = options.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    }));

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: options.to.join(", "),
      cc: options.cc.length > 0 ? options.cc.join(", ") : undefined,
      subject: options.subject,
      text: options.textBody,
      html: options.htmlBody,
      attachments,
    });
  }

  async sendMeetingSummary(
    summary: MeetingSummary,
    htmlContent: string,
    textContent: string,
    recipients: string[],
    cc: string[] = [],
  ): Promise<void> {
    const attachments: EmailAttachment[] = [
      {
        filename: `${this.sanitizeFilename(summary.title)}-summary.html`,
        content: htmlContent,
        contentType: "text/html",
      },
      {
        filename: `${this.sanitizeFilename(summary.title)}-transcript.txt`,
        content: summary.fullTranscript,
        contentType: "text/plain",
      },
    ];

    const emailHtml = this.formatEmailHtml(summary);
    const emailText = this.formatEmailText(summary);

    await this.sendEmail({
      to: recipients,
      cc,
      subject: `Meeting Summary: ${summary.title} - ${summary.date}`,
      htmlBody: emailHtml,
      textBody: emailText,
      attachments,
    });
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .substring(0, 50);
  }

  private formatEmailHtml(summary: MeetingSummary): string {
    const actionItemsList = summary.actionItems
      .map(
        (a) =>
          `<li><strong>${a.description}</strong>${a.assignee ? ` - Assigned to: ${a.assignee}` : ""}${a.dueDate ? ` (Due: ${a.dueDate})` : ""}</li>`,
      )
      .join("");

    const keyPointsList = summary.keyPoints.map((p) => `<li>${p}</li>`).join("");
    const decisionsList = summary.decisions.map((d) => `<li>${d}</li>`).join("");
    const nextStepsList = summary.nextSteps.map((s) => `<li>${s}</li>`).join("");

    const attendeesList = summary.attendees
      .map((a) => `<li>${a.name}${a.email ? ` (${a.email})` : ""}</li>`)
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0066cc, #004499); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #0066cc; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
    .meta { background: #f5f5f5; padding: 10px 15px; border-radius: 6px; margin: 15px 0; }
    .meta-item { display: inline-block; margin-right: 20px; }
    ul { padding-left: 20px; margin: 10px 0; }
    li { margin: 5px 0; }
    .priority-high { color: #d32f2f; }
    .priority-medium { color: #f57c00; }
    .priority-low { color: #388e3c; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
    .attachment-note { background: #e3f2fd; padding: 10px 15px; border-radius: 6px; margin-top: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${summary.title}</h1>
  </div>
  <div class="content">
    <div class="meta">
      <span class="meta-item"><strong>Date:</strong> ${summary.date}</span>
      <span class="meta-item"><strong>Duration:</strong> ${summary.duration}</span>
    </div>

    <h2>Participants</h2>
    <ul>${attendeesList}</ul>

    ${summary.keyPoints.length > 0 ? `<h2>Key Points</h2><ul>${keyPointsList}</ul>` : ""}

    ${summary.actionItems.length > 0 ? `<h2>Action Items</h2><ul>${actionItemsList}</ul>` : ""}

    ${summary.decisions.length > 0 ? `<h2>Decisions Made</h2><ul>${decisionsList}</ul>` : ""}

    ${summary.nextSteps.length > 0 ? `<h2>Next Steps</h2><ul>${nextStepsList}</ul>` : ""}

    <div class="attachment-note">
      <strong>Attachments:</strong> Full meeting summary and transcript are attached to this email.
    </div>

    <div class="footer">
      <p>This summary was automatically generated by Voice Filter Meeting Assistant.</p>
      <p>If you have questions about this meeting, please contact the organizer.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private formatEmailText(summary: MeetingSummary): string {
    const lines: string[] = [
      `MEETING SUMMARY: ${summary.title}`,
      `${"=".repeat(50)}`,
      "",
      `Date: ${summary.date}`,
      `Duration: ${summary.duration}`,
      "",
      "PARTICIPANTS:",
    ];

    for (const a of summary.attendees) {
      lines.push(`- ${a.name}${a.email ? ` (${a.email})` : ""}`);
    }

    if (summary.keyPoints.length > 0) {
      lines.push("", "KEY POINTS:");
      for (const point of summary.keyPoints) {
        lines.push(`* ${point}`);
      }
    }

    if (summary.actionItems.length > 0) {
      lines.push("", "ACTION ITEMS:");
      for (const item of summary.actionItems) {
        lines.push(`- ${item.description}`);
        if (item.assignee) {
          lines.push(`  Assigned to: ${item.assignee}`);
        }
        if (item.dueDate) {
          lines.push(`  Due: ${item.dueDate}`);
        }
      }
    }

    if (summary.decisions.length > 0) {
      lines.push("", "DECISIONS:");
      for (const decision of summary.decisions) {
        lines.push(`- ${decision}`);
      }
    }

    if (summary.nextSteps.length > 0) {
      lines.push("", "NEXT STEPS:");
      for (const step of summary.nextSteps) {
        lines.push(`- ${step}`);
      }
    }

    lines.push(
      "",
      "-".repeat(50),
      "Full meeting summary and transcript are attached to this email.",
      "",
      "This summary was automatically generated by Voice Filter Meeting Assistant.",
    );

    return lines.join("\n");
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export function createEmailService(config: Partial<EmailServiceConfig>): EmailService | null {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.fromAddress) {
    return null;
  }

  return new EmailService({
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort ?? 587,
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
  });
}
