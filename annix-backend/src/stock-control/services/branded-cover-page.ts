import { now } from "../../lib/datetime";
import type { CalibrationCertificate } from "../entities/calibration-certificate.entity";
import type { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import type { JobCard } from "../entities/job-card.entity";
import type { QcControlPlan } from "../entities/qc-control-plan.entity";
import type { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";
import type { StockControlCompany } from "../entities/stock-control-company.entity";
import type { SupplierCertificate } from "../entities/supplier-certificate.entity";

interface CoverPageUser {
  name: string;
}

interface CoverPageDeps {
  fetchLogo: (logoUrl: string) => Promise<Buffer>;
}

export async function generateBrandedCoverPage(
  PDFDocument: typeof import("pdfkit"),
  company: StockControlCompany | null,
  jobCard: JobCard | null,
  coatingAnalysis: JobCardCoatingAnalysis | null,
  controlPlans: QcControlPlan[],
  releaseCerts: QcReleaseCertificate[],
  supplierCerts: SupplierCertificate[],
  calCerts: CalibrationCertificate[],
  user: CoverPageUser,
  deps: CoverPageDeps,
): Promise<Buffer> {
  const coverDoc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const coverChunks: Buffer[] = [];
  coverDoc.on("data", (chunk: Buffer) => coverChunks.push(chunk));

  const coverDone = new Promise<Buffer>((resolve) => {
    coverDoc.on("end", () => resolve(Buffer.concat(coverChunks)));
  });

  const pageWidth = coverDoc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const brandColor = company?.primaryColor ?? "#0d9488";

  coverDoc.rect(0, 0, pageWidth, 6).fill(brandColor);

  let yPos = 30;

  if (company?.logoUrl) {
    try {
      const logoBuffer = await deps.fetchLogo(company.logoUrl);
      coverDoc.image(logoBuffer, (pageWidth - 150) / 2, yPos, {
        fit: [150, 90],
        align: "center",
      });
      yPos += 100;
    } catch {
      yPos += 20;
    }
  } else {
    yPos += 20;
  }

  if (company?.name) {
    coverDoc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(brandColor)
      .text(company.name, margin, yPos, { align: "center", width: contentWidth });
    yPos = coverDoc.y + 8;
  }

  coverDoc.rect(margin + 60, yPos, contentWidth - 120, 1).fill("#d1d5db");
  yPos += 16;

  coverDoc
    .fontSize(26)
    .font("Helvetica-Bold")
    .fillColor("#111827")
    .text("QUALITY DATA BOOK", margin, yPos, { align: "center", width: contentWidth });
  yPos = coverDoc.y + 24;

  const labelX = margin + 20;
  const valueX = margin + 170;
  const rowHeight = 18;

  const drawDetailRow = (label: string, value: string) => {
    coverDoc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text(`${label}:`, labelX, yPos, { width: 140 });
    coverDoc
      .font("Helvetica")
      .fillColor("#111827")
      .text(value, valueX, yPos, { width: contentWidth - 190 });
    yPos += rowHeight;
  };

  const drawSectionHeading = (title: string) => {
    coverDoc.fontSize(11).font("Helvetica-Bold").fillColor(brandColor).text(title, labelX, yPos);
    yPos += 16;
  };

  drawSectionHeading("Job Information");

  if (jobCard?.customerName) drawDetailRow("Customer", jobCard.customerName);
  if (jobCard?.poNumber) drawDetailRow("Order Number", jobCard.poNumber);
  if (jobCard?.jobNumber) drawDetailRow("Job Card Number", jobCard.jobNumber);
  if (jobCard?.jobName) drawDetailRow("Project Name", jobCard.jobName);
  if (jobCard?.createdAt) {
    const opened =
      typeof jobCard.createdAt === "string"
        ? (jobCard.createdAt as string).slice(0, 10)
        : jobCard.createdAt.toISOString().slice(0, 10);
    drawDetailRow("Date Opened", opened);
  }
  if (jobCard?.reference) drawDetailRow("Reference", jobCard.reference);
  if (jobCard?.siteLocation) drawDetailRow("Site / Location", jobCard.siteLocation);
  if (jobCard?.dueDate) drawDetailRow("Due Date", jobCard.dueDate);
  yPos += 8;

  const hasSpecs =
    coatingAnalysis !== null ||
    controlPlans.some((p) => p.planType === "rubber" || p.planType === "hdpe");

  if (hasSpecs) {
    drawSectionHeading("Specifications");

    if (coatingAnalysis) {
      const extCoats = (coatingAnalysis.coats ?? []).filter((c: any) => c.area === "external");
      const intCoats = (coatingAnalysis.coats ?? []).filter((c: any) => c.area === "internal");

      if (extCoats.length > 0) {
        const extSpec = extCoats
          .map((c: any) => `${c.product} (${c.minDftUm}-${c.maxDftUm} \u03BCm)`)
          .join(", ");
        drawDetailRow("Paint Spec (External)", extSpec);
      }
      if (intCoats.length > 0) {
        const intSpec = intCoats
          .map((c: any) => `${c.product} (${c.minDftUm}-${c.maxDftUm} \u03BCm)`)
          .join(", ");
        drawDetailRow("Paint Spec (Internal)", intSpec);
      }
      if (coatingAnalysis.surfacePrep) {
        const prepLabels: Record<string, string> = {
          blast: "Abrasive blasting",
          sa3_blast: "SA 3 Abrasive blasting",
          hand_tool: "Hand tool preparation",
          power_tool: "Power tool preparation",
        };
        drawDetailRow(
          "Surface Preparation",
          prepLabels[coatingAnalysis.surfacePrep] ?? coatingAnalysis.surfacePrep,
        );
      }
    }

    const rubberPlans = controlPlans.filter((p) => p.planType === "rubber");
    if (rubberPlans.length > 0) {
      const rubberSpec = rubberPlans
        .map((p) => p.specification ?? p.itemDescription ?? "Rubber Lining")
        .join("; ");
      drawDetailRow("Rubber Specification", rubberSpec);
    }

    const hdpePlans = controlPlans.filter((p) => p.planType === "hdpe");
    if (hdpePlans.length > 0) {
      const hdpeSpec = hdpePlans
        .map((p) => p.specification ?? p.itemDescription ?? "HDPE Lining")
        .join("; ");
      drawDetailRow("HDPE Specification", hdpeSpec);
    }

    yPos += 8;
  }

  if (controlPlans.length > 0 || releaseCerts.length > 0) {
    drawSectionHeading("QC Documents");

    if (controlPlans.length > 0) {
      const planTypeLabels: Record<string, string> = {
        paint_external: "Paint External",
        paint_internal: "Paint Internal",
        rubber: "Rubber",
        hdpe: "HDPE",
      };
      const qcpNumbers = controlPlans
        .map(
          (p) => `${p.qcpNumber ?? `QCP #${p.id}`} (${planTypeLabels[p.planType] ?? p.planType})`,
        )
        .join(", ");
      drawDetailRow("QCP Numbers", qcpNumbers);
    }

    if (releaseCerts.length > 0) {
      const releaseNumbers = releaseCerts
        .map((r) => r.certificateNumber ?? `QRC #${r.id}`)
        .join(", ");
      drawDetailRow("Release Certificates", releaseNumbers);
    }

    yPos += 8;
  }

  drawSectionHeading("Document Summary");

  const totalCertCount = supplierCerts.length + calCerts.length;
  drawDetailRow("Supplier Certificates", String(supplierCerts.length));
  drawDetailRow("Calibration Certificates", String(calCerts.length));
  drawDetailRow("Total Certificates", String(totalCertCount));
  drawDetailRow("Generated", now().toFormat("dd MMM yyyy HH:mm"));
  drawDetailRow("Compiled by", user.name);

  yPos += 16;
  coverDoc.rect(margin, yPos, contentWidth, 1).fill("#d1d5db");
  yPos += 12;

  if (supplierCerts.length > 0) {
    coverDoc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Included Supplier Certificates:", labelX, yPos);
    yPos += 14;
    coverDoc.fontSize(8).font("Helvetica").fillColor("#4b5563");

    supplierCerts.forEach((cert, idx) => {
      if (yPos > coverDoc.page.height - 60) {
        coverDoc.addPage();
        yPos = margin;
      }
      const supplierName = cert.supplier?.name ?? "Unknown";
      coverDoc.text(
        `${idx + 1}. ${cert.certificateType} - Batch: ${cert.batchNumber} - ${supplierName} - ${cert.originalFilename}`,
        labelX,
        yPos,
        { width: contentWidth - 40 },
      );
      yPos = coverDoc.y + 2;
    });

    yPos += 8;
  }

  if (calCerts.length > 0) {
    if (yPos > coverDoc.page.height - 80) {
      coverDoc.addPage();
      yPos = margin;
    }
    coverDoc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Included Calibration Certificates:", labelX, yPos);
    yPos += 14;
    coverDoc.fontSize(8).font("Helvetica").fillColor("#4b5563");

    calCerts.forEach((cal, idx) => {
      if (yPos > coverDoc.page.height - 60) {
        coverDoc.addPage();
        yPos = margin;
      }
      const identifier = cal.equipmentIdentifier ? ` (${cal.equipmentIdentifier})` : "";
      coverDoc.text(
        `${supplierCerts.length + idx + 1}. ${cal.equipmentName}${identifier} - Expires: ${cal.expiryDate} - ${cal.originalFilename}`,
        labelX,
        yPos,
        { width: contentWidth - 40 },
      );
      yPos = coverDoc.y + 2;
    });
  }

  const pageCount = coverDoc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    coverDoc.switchToPage(i);
    coverDoc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(`Page ${i + 1} of ${pageCount}`, margin, coverDoc.page.height - 30, {
        align: "center",
        width: contentWidth,
      });
    coverDoc.rect(0, coverDoc.page.height - 6, pageWidth, 6).fill(brandColor);
  }

  coverDoc.end();
  return coverDone;
}
