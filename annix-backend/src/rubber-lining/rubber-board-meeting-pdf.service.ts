import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { createPdfDocument, PDF_FONTS } from "../lib/pdf-builder";
import type { BoardMeetingMinutes } from "./entities/rubber-board-meeting.entity";

// Renders board-meeting minutes onto the company letterhead as a downloadable
// PDF. Uses the same letterhead image as AU CoCs (src/assets/au-header.jpg).
// When the company-profile letterhead-upload lands (phase B), this falls back to
// that uploaded letterhead and only uses au-header.jpg if none is configured.
@Injectable()
export class RubberBoardMeetingPdfService {
  private readonly headerPath = path.join(__dirname, "..", "assets", "au-header.jpg");
  private readonly footerPath = path.join(__dirname, "..", "assets", "au-footer.jpg");
  private readonly margin = 45;
  private readonly contentWidth = 595.28 - 90; // A4 width minus margins

  async generateMinutesPdf(input: {
    title: string;
    meetingDate: string | null;
    attendees: string[];
    minutes: BoardMeetingMinutes;
    // Admin-configured company letterhead; falls back to the bundled au-header.jpg.
    letterhead?: Buffer | null;
  }): Promise<Buffer> {
    const { doc, toBuffer } = createPdfDocument({ margin: this.margin });

    // Letterhead header: prefer the uploaded company letterhead, else the
    // bundled default image.
    if (input.letterhead) {
      doc.image(input.letterhead, this.margin, 28, { width: this.contentWidth });
      doc.y = 135;
    } else if (fs.existsSync(this.headerPath)) {
      doc.image(this.headerPath, this.margin, 28, { width: this.contentWidth });
      doc.y = 135;
    } else {
      doc.y = this.margin;
    }

    doc
      .fillColor("#1a1a1a")
      .font(PDF_FONTS.BOLD)
      .fontSize(16)
      .text("Board Meeting Minutes", this.margin, doc.y);
    doc.moveDown(0.3);
    doc
      .font(PDF_FONTS.BOLD)
      .fontSize(12)
      .fillColor("#222")
      .text(input.title, { width: this.contentWidth });
    const meta = input.meetingDate
      ? new Date(input.meetingDate).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Date not recorded";
    doc.font(PDF_FONTS.REGULAR).fontSize(9.5).fillColor("#666").text(meta);
    doc.moveDown(0.8);

    const m = input.minutes;
    this.list(doc, "Attendees", m.attendees.length > 0 ? m.attendees : input.attendees);
    this.list(doc, "Apologies", m.apologies);
    this.list(doc, "Agenda items", m.agendaItems);
    this.list(doc, "Decisions", m.decisions);
    this.actions(doc, m.actionItems);
    this.list(doc, "Matters arising", m.mattersArising);
    this.list(doc, "Risks & compliance", m.risksAndCompliance);
    this.list(doc, "Financial highlights", m.financialHighlights);
    this.list(doc, "Next steps", m.nextSteps);

    // Footer image on each buffered page (best-effort).
    if (fs.existsSync(this.footerPath)) {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.image(this.footerPath, this.margin, 785, { width: this.contentWidth });
      }
    }

    return toBuffer();
  }

  private heading(doc: ReturnType<typeof createPdfDocument>["doc"], title: string): void {
    if (doc.y > 720) doc.addPage();
    doc
      .moveDown(0.6)
      .font(PDF_FONTS.BOLD)
      .fontSize(11)
      .fillColor("#b45309")
      .text(title, this.margin, doc.y);
    doc.moveDown(0.2);
  }

  private list(
    doc: ReturnType<typeof createPdfDocument>["doc"],
    title: string,
    items: string[],
  ): void {
    if (!items || items.length === 0) return;
    this.heading(doc, title);
    doc.font(PDF_FONTS.REGULAR).fontSize(10).fillColor("#1a1a1a");
    for (const item of items) {
      doc.text(`•  ${item}`, this.margin + 6, doc.y, { width: this.contentWidth - 6 });
      doc.moveDown(0.15);
    }
  }

  private actions(
    doc: ReturnType<typeof createPdfDocument>["doc"],
    items: BoardMeetingMinutes["actionItems"],
  ): void {
    if (!items || items.length === 0) return;
    this.heading(doc, "Action items");
    doc.font(PDF_FONTS.REGULAR).fontSize(10).fillColor("#1a1a1a");
    for (const a of items) {
      const owner = a.owner ? `  —  ${a.owner}` : "";
      const due = a.dueDate ? `  (due ${a.dueDate})` : "";
      doc.text(`•  ${a.description}${owner}${due}`, this.margin + 6, doc.y, {
        width: this.contentWidth - 6,
      });
      doc.moveDown(0.15);
    }
  }
}
