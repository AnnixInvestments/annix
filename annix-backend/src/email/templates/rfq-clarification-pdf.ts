import { PDFDocument, type PDFPage, rgb, StandardFonts } from "pdf-lib";

// Pre-quote clarification PDF — fillable AcroForm with checkboxes,
// radio groups and text inputs the customer can complete in any
// PDF reader (Acrobat, Foxit, Mac Preview, browser preview), save,
// and email back. Mirrors the same field set as the public web form
// so customers can choose whichever route suits them.
//
// Layout:
//   p1   Cover — project header, summary, instructions
//   p2   Drawings checklist (one row per missing drawing ref)
//   p3+  One page per valve, structured into the four datasheet
//        sections from the v1.2.0 mining-grade list (process,
//        mechanical, duty, standards, commercial). Slurry-only
//        rows are always shown — the customer ticks "Not slurry"
//        and they can skip them.
//
// Returns a Buffer ready to attach to EmailService.sendEmail.

export interface PdfMissingDrawingRow {
  ref: string;
  itemNumbers: string[];
}

export interface PdfValveSpecGapRow {
  itemNumber: string;
  description: string;
  // The full mining datasheet — we render every section regardless
  // of which fields detection flagged so the PDF is consistent
  // across rows. The customer can leave non-applicable rows blank.
}

export interface RfqClarificationPdfOptions {
  customerName: string | null;
  projectName: string | null;
  rfqReference: string | null;
  missingDrawings: PdfMissingDrawingRow[];
  valveSpecGaps: PdfValveSpecGapRow[];
}

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 40;
const MARGIN_Y = 40;
const LINE_HEIGHT = 14;

interface DrawCtx {
  page: PDFPage;
  y: number; // current vertical cursor (top-down)
}

const newDrawCtx = (page: PDFPage): DrawCtx => ({ page, y: PAGE_HEIGHT - MARGIN_Y });

const yFromTop = (ctx: DrawCtx): number => ctx.y;

// Drop the cursor by `n` units. Used everywhere instead of manual
// arithmetic to keep paragraphs spaced consistently.
const drop = (ctx: DrawCtx, n: number): void => {
  ctx.y -= n;
};

export async function buildRfqClarificationPdf(
  options: RfqClarificationPdfOptions,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const form = pdf.getForm();

  // -----------------------------------------------------------------
  // p1 — Cover
  // -----------------------------------------------------------------
  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let ctx = newDrawCtx(cover);

  cover.drawText("Pre-Quote Clarifications", {
    x: MARGIN_X,
    y: yFromTop(ctx),
    size: 22,
    font: helvBold,
    color: rgb(0.11, 0.31, 0.85),
  });
  drop(ctx, 30);

  if (options.projectName) {
    cover.drawText(`Project: ${options.projectName}`, {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 12,
      font: helvBold,
    });
    drop(ctx, LINE_HEIGHT + 2);
  }
  if (options.rfqReference) {
    cover.drawText(`RFQ Reference: ${options.rfqReference}`, {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 11,
      font: helv,
    });
    drop(ctx, LINE_HEIGHT);
  }
  if (options.customerName) {
    cover.drawText(`Prepared for: ${options.customerName}`, {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 11,
      font: helv,
    });
    drop(ctx, LINE_HEIGHT);
  }
  drop(ctx, 14);

  cover.drawText("How this works", {
    x: MARGIN_X,
    y: yFromTop(ctx),
    size: 13,
    font: helvBold,
  });
  drop(ctx, LINE_HEIGHT + 4);

  const intro = [
    "Before we can put a meaningful price together we need a few clarifications.",
    "Please complete this form on any PDF reader (Acrobat / Foxit / Preview / your",
    "browser) — tick the boxes, type into the fields, save, and reply to the email",
    "this PDF was attached to. Most fields are short tick / single-word answers.",
    "",
    "If you'd rather fill it in online, the email also contains a one-page web",
    "form link — both routes go to the same Annix project file, so use whichever",
    "is quicker.",
  ];
  for (const line of intro) {
    cover.drawText(line, { x: MARGIN_X, y: yFromTop(ctx), size: 11, font: helv });
    drop(ctx, LINE_HEIGHT);
  }
  drop(ctx, 14);

  cover.drawText("Summary of what we need", {
    x: MARGIN_X,
    y: yFromTop(ctx),
    size: 13,
    font: helvBold,
  });
  drop(ctx, LINE_HEIGHT + 4);
  cover.drawText(
    `  •  ${options.missingDrawings.length} drawing reference${options.missingDrawings.length === 1 ? "" : "s"} (next page)`,
    {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 11,
      font: helv,
    },
  );
  drop(ctx, LINE_HEIGHT);
  cover.drawText(
    `  •  ${options.valveSpecGaps.length} valve item${options.valveSpecGaps.length === 1 ? "" : "s"} needing mining-grade specifications`,
    { x: MARGIN_X, y: yFromTop(ctx), size: 11, font: helv },
  );
  drop(ctx, LINE_HEIGHT);

  // -----------------------------------------------------------------
  // p2 — Drawings checklist
  // -----------------------------------------------------------------
  if (options.missingDrawings.length > 0) {
    const drawPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx = newDrawCtx(drawPage);
    drawPage.drawText("Drawings required", {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 18,
      font: helvBold,
      color: rgb(0.11, 0.31, 0.85),
    });
    drop(ctx, 24);

    const drawIntro =
      "Tick whether you'll attach each drawing to your reply, or mark it as not available so we know to omit those items from the quote.";
    drawPage.drawText(drawIntro, {
      x: MARGIN_X,
      y: yFromTop(ctx),
      size: 10,
      font: helv,
      maxWidth: PAGE_WIDTH - MARGIN_X * 2,
    });
    drop(ctx, LINE_HEIGHT + 6);

    options.missingDrawings.forEach((row, idx) => {
      drawPage.drawText(`${row.ref}`, {
        x: MARGIN_X,
        y: yFromTop(ctx),
        size: 11,
        font: helvBold,
      });
      drawPage.drawText(`(items ${row.itemNumbers.join(", ")})`, {
        x: MARGIN_X + 130,
        y: yFromTop(ctx),
        size: 10,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
      drop(ctx, LINE_HEIGHT + 4);

      // Two checkboxes per drawing — "will attach" / "not available".
      const willAttach = form.createCheckBox(`drawing.${idx}.willAttach`);
      willAttach.addToPage(drawPage, {
        x: MARGIN_X,
        y: yFromTop(ctx) - 2,
        width: 12,
        height: 12,
      });
      drawPage.drawText("Will attach to reply", {
        x: MARGIN_X + 18,
        y: yFromTop(ctx),
        size: 10,
        font: helv,
      });

      const notAvailable = form.createCheckBox(`drawing.${idx}.notAvailable`);
      notAvailable.addToPage(drawPage, {
        x: MARGIN_X + 200,
        y: yFromTop(ctx) - 2,
        width: 12,
        height: 12,
      });
      drawPage.drawText("Not available — please omit affected items", {
        x: MARGIN_X + 218,
        y: yFromTop(ctx),
        size: 10,
        font: helv,
      });
      drop(ctx, LINE_HEIGHT + 12);
    });
  }

  // -----------------------------------------------------------------
  // p3+ — Valve datasheet pages
  // -----------------------------------------------------------------
  options.valveSpecGaps.forEach((valve, idx) => {
    let valvePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let valveCtx = newDrawCtx(valvePage);

    valvePage.drawText(`Valve ${idx + 1} — Item ${valve.itemNumber}`, {
      x: MARGIN_X,
      y: yFromTop(valveCtx),
      size: 16,
      font: helvBold,
      color: rgb(0.11, 0.31, 0.85),
    });
    drop(valveCtx, 22);

    // Description wraps via maxWidth.
    valvePage.drawText(valve.description, {
      x: MARGIN_X,
      y: yFromTop(valveCtx),
      size: 9,
      font: helv,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: PAGE_WIDTH - MARGIN_X * 2,
      lineHeight: 12,
    });
    drop(valveCtx, 36);

    const fieldPrefix = `valve.${idx}`;

    // Helpers ----------------------------------------------------
    const ensureSpace = (need: number) => {
      if (valveCtx.y - need < MARGIN_Y) {
        // Spill onto a new page if we run out of room.
        valvePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        valveCtx = newDrawCtx(valvePage);
      }
    };
    const sectionHeader = (label: string) => {
      ensureSpace(40);
      valvePage.drawText(label, {
        x: MARGIN_X,
        y: yFromTop(valveCtx),
        size: 12,
        font: helvBold,
        color: rgb(0.18, 0.18, 0.18),
      });
      drop(valveCtx, LINE_HEIGHT + 6);
      valvePage.drawLine({
        start: { x: MARGIN_X, y: yFromTop(valveCtx) + 8 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: yFromTop(valveCtx) + 8 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
    };
    const textRow = (label: string, fieldName: string, width = 200) => {
      ensureSpace(LINE_HEIGHT + 12);
      valvePage.drawText(label, {
        x: MARGIN_X,
        y: yFromTop(valveCtx),
        size: 10,
        font: helv,
      });
      const tf = form.createTextField(`${fieldPrefix}.${fieldName}`);
      tf.addToPage(valvePage, {
        x: MARGIN_X + 220,
        y: yFromTop(valveCtx) - 4,
        width,
        height: 14,
      });
      drop(valveCtx, LINE_HEIGHT + 8);
    };
    const yesNoRow = (label: string, fieldName: string) => {
      ensureSpace(LINE_HEIGHT + 12);
      valvePage.drawText(label, {
        x: MARGIN_X,
        y: yFromTop(valveCtx),
        size: 10,
        font: helv,
      });
      const yesCb = form.createCheckBox(`${fieldPrefix}.${fieldName}.yes`);
      yesCb.addToPage(valvePage, {
        x: MARGIN_X + 220,
        y: yFromTop(valveCtx) - 2,
        width: 12,
        height: 12,
      });
      valvePage.drawText("Yes", {
        x: MARGIN_X + 235,
        y: yFromTop(valveCtx),
        size: 10,
        font: helv,
      });
      const noCb = form.createCheckBox(`${fieldPrefix}.${fieldName}.no`);
      noCb.addToPage(valvePage, {
        x: MARGIN_X + 270,
        y: yFromTop(valveCtx) - 2,
        width: 12,
        height: 12,
      });
      valvePage.drawText("No", {
        x: MARGIN_X + 285,
        y: yFromTop(valveCtx),
        size: 10,
        font: helv,
      });
      drop(valveCtx, LINE_HEIGHT + 8);
    };
    const optionsRow = (label: string, fieldName: string, choices: string[]) => {
      ensureSpace(LINE_HEIGHT + 12);
      valvePage.drawText(label, {
        x: MARGIN_X,
        y: yFromTop(valveCtx),
        size: 10,
        font: helv,
      });
      let cursorX = MARGIN_X + 220;
      choices.forEach((choice) => {
        const safeChoice = choice.replace(/[^a-zA-Z0-9]/g, "_");
        const cb = form.createCheckBox(`${fieldPrefix}.${fieldName}.${safeChoice}`);
        cb.addToPage(valvePage, {
          x: cursorX,
          y: yFromTop(valveCtx) - 2,
          width: 12,
          height: 12,
        });
        valvePage.drawText(choice, {
          x: cursorX + 14,
          y: yFromTop(valveCtx),
          size: 9,
          font: helv,
        });
        const labelWidth = helv.widthOfTextAtSize(choice, 9);
        cursorX += 18 + labelWidth + 8;
        if (cursorX > PAGE_WIDTH - MARGIN_X - 60) {
          drop(valveCtx, LINE_HEIGHT + 4);
          cursorX = MARGIN_X + 220;
        }
      });
      drop(valveCtx, LINE_HEIGHT + 10);
    };

    // Section 1 — process
    sectionHeader("1. Process conditions");
    textRow("Process media", "media");
    yesNoRow("Slurry service?", "isSlurry");
    textRow("Solids concentration (%)", "solidsPct", 100);
    textRow("Maximum particle size (mm)", "particleMm", 100);
    textRow("Specific gravity / density", "sg", 100);
    textRow("pH", "ph", 60);
    textRow("Operating temperature (°C)", "tempC", 80);
    textRow("Chloride concentration (ppm)", "chlorides", 100);
    yesNoRow("Dissolved O₂ / oxidisers present?", "oxidisers");
    textRow("Min flow (m³/h)", "minFlow", 100);
    textRow("Normal flow (m³/h)", "normalFlow", 100);
    textRow("Max flow (m³/h)", "maxFlow", 100);
    textRow("Shut-off ΔP (bar)", "shutoffDp", 100);

    // Section 2 — mechanical
    sectionHeader("2. Mechanical");
    textRow("Flange spec / SANS 1123 table", "flangeSpec");
    textRow("Face-to-face standard", "faceToFace");
    optionsRow("Body / gate material", "body", ["CS", "304", "316", "Duplex", "High-Cr", "Other"]);
    optionsRow("Seat / sleeve elastomer", "seat", [
      "NR",
      "EPDM",
      "NBR",
      "Viton",
      "Hypalon",
      "Metal+WC",
      "Other",
    ]);
    optionsRow("Flow direction", "flowDir", ["Uni-directional", "Bi-directional"]);
    optionsRow("Mounting orientation", "mounting", ["Vertical", "Horizontal", "Both"]);
    yesNoRow("Reverse pressure expected?", "reverseP");
    optionsRow("Actuation", "actuation", ["Manual", "Pneumatic", "Electric", "Hydraulic"]);
    optionsRow("Fail position (if actuated)", "failPos", ["Fail Open", "Fail Closed", "Fail Last"]);
    textRow("Voltage / air supply (if actuated)", "voltage");

    // Section 3 — duty
    sectionHeader("3. Duty profile");
    optionsRow("Service type", "duty", ["Isolation", "Control", "Modulating"]);
    textRow("Cycle frequency (cycles/day or year)", "cycle");
    yesNoRow("Discharge to atmosphere?", "dischargeAtm");
    yesNoRow("Water-hammer / surge expected?", "waterHammer");

    // Section 4 — standards
    sectionHeader("4. Standards & compliance");
    optionsRow("Leakage class", "leakage", ["I", "II", "III", "IV", "V", "VI"]);
    yesNoRow("MHSA Section 21 CoC required?", "mhsa");
    yesNoRow("SANS 347 PED equivalent required?", "sans347");

    // Commercial info (delivery date, site location, etc.) is
    // captured on Step 1 of the wizard form — no need to repeat
    // here per valve.

    // Notes — bigger field for free-form input.
    sectionHeader("Notes");
    ensureSpace(70);
    const notesField = form.createTextField(`${fieldPrefix}.notes`);
    notesField.addToPage(valvePage, {
      x: MARGIN_X,
      y: yFromTop(valveCtx) - 60,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: 60,
    });
    notesField.enableMultiline();
    drop(valveCtx, 70);
  });

  // -----------------------------------------------------------------
  // Submission instructions footer
  // -----------------------------------------------------------------
  const closing = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const closingCtx = newDrawCtx(closing);
  closing.drawText("Thanks!", {
    x: MARGIN_X,
    y: yFromTop(closingCtx),
    size: 18,
    font: helvBold,
    color: rgb(0.11, 0.31, 0.85),
  });
  drop(closingCtx, 28);
  const closingLines = [
    "Save this PDF and reply to the email it was attached to. Your project engineer",
    "can fill in any fields you don't have to hand. As soon as we receive the",
    "completed form we'll re-run the take-off and send the full quotation through.",
    "",
    "Questions: info@annix.co.za",
  ];
  for (const line of closingLines) {
    closing.drawText(line, {
      x: MARGIN_X,
      y: yFromTop(closingCtx),
      size: 11,
      font: helv,
    });
    drop(closingCtx, LINE_HEIGHT);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
