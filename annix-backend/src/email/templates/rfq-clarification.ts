import { emailLayout } from "./layout";

export interface MissingDrawingEmailRow {
  ref: string;
  itemNumbers: string[];
}

export interface ValveSpecGapEmailRow {
  itemNumber: string;
  description: string;
  missingFields: string[];
}

export interface RfqClarificationEmailOptions {
  customerName: string | null;
  projectName: string | null;
  rfqReference: string | null;
  missingDrawings: MissingDrawingEmailRow[];
  valveSpecGaps: ValveSpecGapEmailRow[];
  customNote: string | null;
  // v1.3.0 — token for the public clarification form. When present,
  // the email body collapses to a brief intro + a CTA button linking
  // to /customer/clarifications/{token}, replacing the inlined
  // tables. Older callers that omit the token get the legacy
  // (verbose) layout for backwards compatibility.
  clarificationToken?: string | null;
}

// Web origin for the clarification form link. Set
// PUBLIC_FRONTEND_URL in the backend env to override (e.g.
// https://annix.co.za in production). Falls back to localhost:3000
// for dev.
const publicFrontendUrl = (): string => process.env.PUBLIC_FRONTEND_URL || "http://localhost:3000";

const renderDrawingsTable = (rows: MissingDrawingEmailRow[]): string => {
  if (rows.length === 0) return "";
  const tableRows = rows
    .map(
      (row) =>
        `<tr>
          <td style="border:1px solid #e5e7eb;padding:8px 10px;font-family:monospace;">${row.ref}</td>
          <td style="border:1px solid #e5e7eb;padding:8px 10px;">${row.itemNumbers.join(", ")}</td>
        </tr>`,
    )
    .join("");
  return `
    <h3 style="color:#1f2937;margin-top:24px;">Drawings required before quotation</h3>
    <p>The following items in your tender reference drawings we have not yet received. Please send the drawing files so we can finalise the take-off and pricing — those items will be omitted from the quote until the drawings are submitted.</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0 20px 0;">
      <thead>
        <tr>
          <th style="border:1px solid #d1d5db;padding:8px 10px;background:#f3f4f6;text-align:left;">Drawing reference</th>
          <th style="border:1px solid #d1d5db;padding:8px 10px;background:#f3f4f6;text-align:left;">Items affected (line numbers)</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
};

const renderValveSpecsTable = (rows: ValveSpecGapEmailRow[]): string => {
  if (rows.length === 0) return "";
  const tableRows = rows
    .map(
      (row) =>
        `<tr>
          <td style="border:1px solid #e5e7eb;padding:8px 10px;">${row.itemNumber}</td>
          <td style="border:1px solid #e5e7eb;padding:8px 10px;">${row.description}</td>
          <td style="border:1px solid #e5e7eb;padding:8px 10px;">${row.missingFields.join(", ")}</td>
        </tr>`,
    )
    .join("");
  return `
    <h3 style="color:#1f2937;margin-top:24px;">Valve specifications required</h3>
    <p>For mining-grade valve duties (slurry, tailings, lime, acid leach, cyclone feed) we cannot price on a "size + PN" alone — the elastomer / body alloy / actuator selection swings the price by 5x or more depending on duty. Please complete the missing fields below for each valve item.</p>
    <p style="font-size:13px;color:#6b7280;margin-top:-4px;">If your project engineer has a valve datasheet on file, attaching it instead of filling in fields one by one is welcome.</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0 20px 0;">
      <thead>
        <tr>
          <th style="border:1px solid #d1d5db;padding:8px 10px;background:#f3f4f6;text-align:left;">Item #</th>
          <th style="border:1px solid #d1d5db;padding:8px 10px;background:#f3f4f6;text-align:left;">Description</th>
          <th style="border:1px solid #d1d5db;padding:8px 10px;background:#f3f4f6;text-align:left;">Missing fields</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
};

export function buildRfqClarificationEmailHtml(options: RfqClarificationEmailOptions): string {
  const greetingName = options.customerName || "there";
  const projectLabel = options.projectName ? ` for <strong>${options.projectName}</strong>` : "";
  const refLabel = options.rfqReference ? ` (${options.rfqReference})` : "";

  const customNoteHtml = options.customNote
    ? `<p style="margin-top:16px;">${options.customNote.replace(/\n/g, "<br>")}</p>`
    : "";

  // v1.3.0 — when we have a token, collapse the body to a brief
  // intro + a one-click CTA to the public form. The customer fills
  // in the form on a single page (mobile-friendly, structured
  // dropdowns/checkboxes) and submits — no need to scroll through
  // tables in their email client. Inlined tables are dropped from
  // the email entirely; PDF attachment (phase 2) covers offline
  // workflows.
  if (options.clarificationToken) {
    const url = `${publicFrontendUrl()}/customer/clarifications/${options.clarificationToken}`;
    const drawingsCount = options.missingDrawings.length;
    const valvesCount = options.valveSpecGaps.length;
    const summaryFragments: string[] = [];
    if (drawingsCount > 0) {
      summaryFragments.push(
        `<strong>${drawingsCount}</strong> drawing reference${drawingsCount === 1 ? "" : "s"}`,
      );
    }
    if (valvesCount > 0) {
      summaryFragments.push(
        `<strong>${valvesCount}</strong> valve item${valvesCount === 1 ? "" : "s"} needing mining-grade specifications`,
      );
    }
    const summary = summaryFragments.length > 0 ? summaryFragments.join(" and ") : "a few items";

    const briefBody = `
      <p>Hello ${greetingName},</p>
      <p>Thanks for the tender${projectLabel}${refLabel}. Before we can put a meaningful price together we need clarification on ${summary}.</p>
      <p>To make this as quick as possible we've set up a one-page form — open the link below, tick / type the answers, and hit Submit. Takes a couple of minutes; works on mobile.</p>
      <p style="margin:30px 0;text-align:center;">
        <a href="${url}"
           style="background-color:#1d4ed8;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:16px;">
          Open the clarification form
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;text-align:center;">
        Or paste this into your browser:<br>
        <span style="word-break:break-all;color:#4b5563;">${url}</span>
      </p>
      <p style="font-size:13px;color:#6b7280;margin-top:20px;">
        Prefer offline? A fillable PDF is attached — open in any PDF reader, complete, save, and reply to this email.
      </p>
      ${customNoteHtml}
      <p style="margin-top:24px;">Kind regards,<br>The Annix Quotation Team</p>
    `;

    return emailLayout({
      title: "Pre-quote clarifications required",
      heading: "Pre-quote clarifications required",
      headingColor: "#1d4ed8",
      bodyHtml: briefBody,
      footerText:
        "This is an automated notification from the Annix RFQ platform. info@annix.co.za is copied on this message for visibility.",
    });
  }

  // Legacy verbose layout — kept for callers (e.g. older
  // integrations) that don't supply a clarificationToken.
  const bodyHtml = `
    <p>Hello ${greetingName},</p>
    <p>Thank you for the tender${projectLabel}${refLabel}. We're working through the bill of quantities now and have noticed a few items where we need additional information before we can put a meaningful price together.</p>
    ${renderDrawingsTable(options.missingDrawings)}
    ${renderValveSpecsTable(options.valveSpecGaps)}
    ${customNoteHtml}
    <p style="margin-top:24px;">As soon as we receive these we'll re-run the take-off and send the full quotation through. Please reply directly to this email with the drawings and answers — or copy your project engineer in if it's faster.</p>
    <p>Kind regards,<br>The Annix Quotation Team</p>
  `;

  return emailLayout({
    title: "Pre-quote clarifications required",
    heading: "Pre-quote clarifications required",
    headingColor: "#1d4ed8",
    bodyHtml,
    footerText:
      "This is an automated notification from the Annix RFQ platform. info@annix.co.za is copied on this message for visibility.",
  });
}

// Plain-text fallback for email clients that don't render HTML.
export function buildRfqClarificationEmailText(options: RfqClarificationEmailOptions): string {
  const greetingName = options.customerName || "there";
  const projectLabel = options.projectName ? ` for ${options.projectName}` : "";
  const refLabel = options.rfqReference ? ` (${options.rfqReference})` : "";

  // v1.3.0 brief layout when a token is present.
  if (options.clarificationToken) {
    const url = `${publicFrontendUrl()}/customer/clarifications/${options.clarificationToken}`;
    const drawingsCount = options.missingDrawings.length;
    const valvesCount = options.valveSpecGaps.length;
    const summaryFragments: string[] = [];
    if (drawingsCount > 0) {
      summaryFragments.push(`${drawingsCount} drawing reference${drawingsCount === 1 ? "" : "s"}`);
    }
    if (valvesCount > 0) {
      summaryFragments.push(
        `${valvesCount} valve item${valvesCount === 1 ? "" : "s"} needing mining-grade specifications`,
      );
    }
    const summary = summaryFragments.length > 0 ? summaryFragments.join(" and ") : "a few items";

    const customNoteBlock = options.customNote ? `\n${options.customNote}\n` : "";

    return `Hello ${greetingName},

Thanks for the tender${projectLabel}${refLabel}. Before we can put a meaningful price together we need clarification on ${summary}.

To make this as quick as possible we've set up a one-page form — open the link below, tick / type the answers, and hit Submit. Takes a couple of minutes; works on mobile.

  ${url}

Prefer offline? A fillable PDF is attached — open in any PDF reader, complete, save, and reply to this email.
${customNoteBlock}
Kind regards,
The Annix Quotation Team

---
This is an automated notification from the Annix RFQ platform. info@annix.co.za is copied for visibility.`;
  }

  const drawingsBlock =
    options.missingDrawings.length > 0
      ? `\nDrawings required before quotation\n${"-".repeat(36)}\nThe following items reference drawings we have not received. Please send these so we can finalise the take-off — items will be omitted from the quote until drawings are submitted.\n\n${options.missingDrawings
          .map((r) => `  ${r.ref}  →  items ${r.itemNumbers.join(", ")}`)
          .join("\n")}\n`
      : "";

  const valvesBlock =
    options.valveSpecGaps.length > 0
      ? `\nValve specifications required\n${"-".repeat(30)}\nFor mining-grade valve duties we cannot price on size + PN alone — please complete the missing fields below for each valve item.\n\n${options.valveSpecGaps
          .map(
            (r) =>
              `  ${r.itemNumber}  ${r.description}\n    Missing: ${r.missingFields.join(", ")}`,
          )
          .join("\n\n")}\n`
      : "";

  const customNoteBlock = options.customNote ? `\n${options.customNote}\n` : "";

  return `Hello ${greetingName},

Thank you for the tender${projectLabel}${refLabel}. We're working through the bill of quantities and have noticed items where we need additional information before we can put a meaningful price together.
${drawingsBlock}${valvesBlock}${customNoteBlock}
As soon as we receive these we'll re-run the take-off and send the full quotation. Please reply with the drawings and answers, or copy your project engineer.

Kind regards,
The Annix Quotation Team

---
This is an automated notification from the Annix RFQ platform. info@annix.co.za is copied for visibility.`;
}
