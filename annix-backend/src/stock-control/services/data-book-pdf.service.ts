import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";

type PDFDoc = InstanceType<typeof PDFDocument>;

import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  A4_PORTRAIT as A4,
  A4_LANDSCAPE,
  PDF_FONTS as FONT,
  type PageLayout,
} from "../../lib/pdf-builder";
import { renderFooter } from "../../lib/pdf-templates";
import { type IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { QcBatchAssignment } from "../qc/entities/qc-batch-assignment.entity";
import { QcBlastProfile } from "../qc/entities/qc-blast-profile.entity";
import { QcControlPlan } from "../qc/entities/qc-control-plan.entity";
import { DftCoatType, QcDftReading } from "../qc/entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../qc/entities/qc-dust-debris-test.entity";
import { QcItemsRelease, type ReleasePartySignOff } from "../qc/entities/qc-items-release.entity";
import { QcPullTest } from "../qc/entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../qc/entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../qc/entities/qc-shore-hardness.entity";

interface DocNumberEntry {
  docNumber: string;
  title: string;
  edition: string;
  revision: string;
}

const DOC_NUMBERS: Record<string, DocNumberEntry> = {
  toc: { docNumber: "QD_PLS_02", title: "Table of Contents", edition: "01", revision: "00" },
  rubber_index: {
    docNumber: "QD_PLS_03",
    title: "Rubber Section Index",
    edition: "01",
    revision: "00",
  },
  paint_index: {
    docNumber: "QD_PLS_04",
    title: "Paint Section Index",
    edition: "01",
    revision: "00",
  },
  qcp_paint_ext: {
    docNumber: "QD_PLS_05",
    title: "QCP - Paint External",
    edition: "01",
    revision: "00",
  },
  qcp_paint_int: {
    docNumber: "QD_PLS_06",
    title: "QCP - Paint Internal",
    edition: "01",
    revision: "00",
  },
  qcp_rubber: { docNumber: "QD_PLS_07", title: "QCP - Rubber", edition: "01", revision: "00" },
  qcp_hdpe: { docNumber: "QD_PLS_08", title: "QCP - HDPE", edition: "01", revision: "00" },
  items_release: { docNumber: "QD_PLS_09", title: "Items Release", edition: "01", revision: "00" },
  release_cert: {
    docNumber: "QD_PLS_10",
    title: "QC Release Certificate",
    edition: "01",
    revision: "00",
  },
  shore_hardness: {
    docNumber: "QD_PLS_11",
    title: "Shore Hardness Test Report",
    edition: "01",
    revision: "00",
  },
  primer_dft: { docNumber: "QD_PLS_12", title: "Primer DFT Report", edition: "01", revision: "00" },
  final_dft: { docNumber: "QD_PLS_13", title: "Final DFT Report", edition: "01", revision: "00" },
  blast_profile: {
    docNumber: "QD_PLS_14",
    title: "Blast Profile Report",
    edition: "01",
    revision: "00",
  },
  dust_debris: {
    docNumber: "QD_PLS_15",
    title: "Dust and Debris Test Report",
    edition: "01",
    revision: "00",
  },
  pull_test: {
    docNumber: "QD_PLS_16",
    title: "Pull Test Certificate",
    edition: "01",
    revision: "00",
  },
};

const QCP_PLAN_TYPE_DOC_KEYS: Record<string, string> = {
  paint_external: "qcp_paint_ext",
  paint_internal: "qcp_paint_int",
  rubber: "qcp_rubber",
  hdpe: "qcp_hdpe",
};

interface TocEntry {
  title: string;
  docNumber: string;
  pageIndex: number;
  revision: string;
  edition: string;
}

interface DataBookContext {
  jobCard: JobCard;
  company: StockControlCompany | null;
  logoBuffer: Buffer | null;
  shoreHardness: QcShoreHardness[];
  dftByRole: { role: string; label: string; readings: QcDftReading[] }[];
  blastProfiles: QcBlastProfile[];
  dustDebrisTests: QcDustDebrisTest[];
  pullTests: QcPullTest[];
  controlPlans: QcControlPlan[];
  releaseCertificates: QcReleaseCertificate[];
  itemsReleases: QcItemsRelease[];
  batchAssignments: QcBatchAssignment[];
}

@Injectable()
export class DataBookPdfService {
  private readonly logger = new Logger(DataBookPdfService.name);

  constructor(
    @InjectRepository(QcBatchAssignment)
    private readonly batchAssignmentRepo: Repository<QcBatchAssignment>,
    @InjectRepository(QcShoreHardness)
    private readonly shoreHardnessRepo: Repository<QcShoreHardness>,
    @InjectRepository(QcDftReading)
    private readonly dftReadingRepo: Repository<QcDftReading>,
    @InjectRepository(QcBlastProfile)
    private readonly blastProfileRepo: Repository<QcBlastProfile>,
    @InjectRepository(QcDustDebrisTest)
    private readonly dustDebrisRepo: Repository<QcDustDebrisTest>,
    @InjectRepository(QcPullTest)
    private readonly pullTestRepo: Repository<QcPullTest>,
    @InjectRepository(QcControlPlan)
    private readonly controlPlanRepo: Repository<QcControlPlan>,
    @InjectRepository(QcReleaseCertificate)
    private readonly releaseCertRepo: Repository<QcReleaseCertificate>,
    @InjectRepository(QcItemsRelease)
    private readonly itemsReleaseRepo: Repository<QcItemsRelease>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  private async fetchCompanyLogo(company: StockControlCompany | null): Promise<Buffer | null> {
    if (!company?.logoUrl) return null;
    try {
      if (company.logoUrl.startsWith("http")) {
        return Buffer.from(await (await fetch(company.logoUrl)).arrayBuffer());
      }
      return this.storageService.download(company.logoUrl);
    } catch (err) {
      this.logger.warn(`Failed to fetch company logo: ${err}`);
      return null;
    }
  }

  async generateReleaseCertificatePdf(
    companyId: number,
    jobCardId: number,
    certificateId: number,
  ): Promise<Buffer | null> {
    const [jobCard, company, certificate] = await Promise.all([
      this.jobCardRepo.findOne({ where: { id: jobCardId, companyId }, relations: ["lineItems"] }),
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.releaseCertRepo.findOne({ where: { id: certificateId, companyId, jobCardId } }),
    ]);

    if (!jobCard || !certificate) {
      return null;
    }

    const ctx: DataBookContext = {
      jobCard,
      company,
      logoBuffer: null,
      shoreHardness: [],
      dftByRole: [],
      blastProfiles: [],
      dustDebrisTests: [],
      pullTests: [],
      controlPlans: [],
      releaseCertificates: [certificate],
      itemsReleases: [],
      batchAssignments: [],
    };

    return this.renderStandaloneDocument(ctx, (doc, tocEntries) => {
      this.renderReleaseCertificate(doc, ctx, certificate, tocEntries);
    });
  }

  async generateItemsReleasePdf(
    companyId: number,
    jobCardId: number,
    releaseId: number,
  ): Promise<Buffer | null> {
    const [jobCard, company, release, controlPlans] = await Promise.all([
      this.jobCardRepo.findOne({ where: { id: jobCardId, companyId }, relations: ["lineItems"] }),
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.itemsReleaseRepo.findOne({ where: { id: releaseId, companyId } }),
      this.controlPlanRepo.find({ where: { companyId, jobCardId } }),
    ]);

    if (!jobCard || !release) {
      return null;
    }

    const logoBuffer = await this.fetchCompanyLogo(company);

    const ctx: DataBookContext = {
      jobCard,
      company,
      logoBuffer,
      shoreHardness: [],
      dftByRole: [],
      blastProfiles: [],
      dustDebrisTests: [],
      pullTests: [],
      controlPlans,
      releaseCertificates: [],
      itemsReleases: [release],
      batchAssignments: [],
    };

    return this.renderStandaloneDocument(
      ctx,
      (doc, tocEntries) => {
        this.renderItemsRelease(doc, ctx, release, tocEntries);
      },
      { layout: "landscape" },
    );
  }

  async generateControlPlanPdf(
    companyId: number,
    jobCardId: number,
    planId: number,
  ): Promise<Buffer | null> {
    const [jobCard, company, plan] = await Promise.all([
      this.jobCardRepo.findOne({ where: { id: jobCardId, companyId }, relations: ["lineItems"] }),
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.controlPlanRepo.findOne({ where: { id: planId, companyId } }),
    ]);

    if (!jobCard || !plan) {
      return null;
    }

    const logoBuffer = await this.fetchCompanyLogo(company);

    const ctx: DataBookContext = {
      jobCard,
      company,
      logoBuffer,
      shoreHardness: [],
      dftByRole: [],
      blastProfiles: [],
      dustDebrisTests: [],
      pullTests: [],
      controlPlans: [plan],
      releaseCertificates: [],
      itemsReleases: [],
      batchAssignments: [],
    };

    return this.renderStandaloneDocument(
      ctx,
      (doc, tocEntries) => {
        this.renderControlPlan(doc, ctx, plan, tocEntries);
      },
      { layout: "landscape" },
    );
  }

  private async renderStandaloneDocument(
    ctx: DataBookContext,
    renderFn: (doc: PDFDoc, tocEntries: TocEntry[]) => void,
    options?: { layout?: "portrait" | "landscape" },
  ): Promise<Buffer> {
    const isLandscape = options?.layout === "landscape";
    const doc = new PDFDocument({
      size: "A4",
      layout: isLandscape ? "landscape" : "portrait",
      margin: isLandscape ? A4_LANDSCAPE.margin : A4.margin,
      bufferPages: true,
      autoFirstPage: false,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const tocEntries: TocEntry[] = [];
    const pageCountBefore = doc.bufferedPageRange().count;
    renderFn(doc, tocEntries);
    const expectedPages = Math.max(doc.bufferedPageRange().count - pageCountBefore, 1);

    const totalBuffered = doc.bufferedPageRange().count;
    const pagesToKeep = Math.min(expectedPages, totalBuffered);

    Array.from({ length: pagesToKeep }).forEach((_, i) => {
      doc.switchToPage(i);
      const pageW = (doc.page as any)?.width ?? A4.pageWidth;
      const pageH = (doc.page as any)?.height ?? A4.pageHeight;
      const isLandscapePage = pageW > pageH;
      const pg = isLandscape ? A4_LANDSCAPE : isLandscapePage ? A4_LANDSCAPE : A4;
      const footerY = pg.pageHeight - 28;

      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .moveTo(pg.margin, footerY - 4)
        .lineTo(pg.margin + pg.contentWidth, footerY - 4)
        .lineWidth(0.5)
        .stroke("#d1d5db");

      const brandColor = ctx.company?.primaryColor ?? "#0d9488";
      const companyName = ctx.company?.name ?? "PLS";
      doc.fontSize(6).font(FONT.REGULAR).fillColor("#9ca3af");
      doc.text(companyName, pg.margin, footerY, {
        width: pg.contentWidth / 3,
        align: "left",
        lineBreak: false,
      });
      doc.text(
        `Job: ${ctx.jobCard.jobNumber || ctx.jobCard.id}`,
        pg.margin + pg.contentWidth / 3,
        footerY,
        { width: pg.contentWidth / 3, align: "center", lineBreak: false },
      );
      doc.text(`Page ${i + 1} of ${pagesToKeep}`, pg.margin + (pg.contentWidth * 2) / 3, footerY, {
        width: pg.contentWidth / 3,
        align: "right",
        lineBreak: false,
      });
      doc.rect(0, pg.pageHeight - 4, pg.pageWidth, 4).fill(brandColor);

      doc.page.margins.bottom = savedBottom;
    });

    doc.fillColor("#000000");
    doc.lineWidth(1);

    const totalAfterFooters = doc.bufferedPageRange().count;
    const extraPages = totalAfterFooters - pagesToKeep;
    if (extraPages > 0) {
      Array.from({ length: extraPages }).forEach(() => {
        const pageBuffer = (doc as any)._pageBuffer;
        if (pageBuffer && pageBuffer.length > pagesToKeep) {
          pageBuffer.pop();
        }
      });
    }

    doc.end();
    return done;
  }

  async generateStructuredSections(companyId: number, jobCardId: number): Promise<Buffer | null> {
    const [
      jobCard,
      company,
      shoreHardness,
      dftReadings,
      blastProfiles,
      dustDebrisTests,
      pullTests,
      controlPlans,
      releaseCertificates,
      itemsReleases,
      batchAssignments,
    ] = await Promise.all([
      this.jobCardRepo.findOne({
        where: { id: jobCardId, companyId },
        relations: ["lineItems"],
      }),
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.shoreHardnessRepo.find({
        where: { companyId, jobCardId },
        order: { readingDate: "ASC" },
      }),
      this.dftReadingRepo.find({ where: { companyId, jobCardId }, order: { readingDate: "ASC" } }),
      this.blastProfileRepo.find({
        where: { companyId, jobCardId },
        order: { readingDate: "ASC" },
      }),
      this.dustDebrisRepo.find({ where: { companyId, jobCardId }, order: { readingDate: "ASC" } }),
      this.pullTestRepo.find({ where: { companyId, jobCardId }, order: { readingDate: "ASC" } }),
      this.controlPlanRepo.find({ where: { companyId, jobCardId }, order: { createdAt: "ASC" } }),
      this.releaseCertRepo.find({ where: { companyId, jobCardId }, order: { createdAt: "ASC" } }),
      this.itemsReleaseRepo.find({ where: { companyId, jobCardId }, order: { createdAt: "ASC" } }),
      this.batchAssignmentRepo.find({
        where: { companyId, jobCardId },
        order: { lineItemId: "ASC", fieldKey: "ASC" },
      }),
    ]);

    if (!jobCard) {
      return null;
    }

    if (!company?.qcEnabled) {
      return null;
    }

    const hasAnyData =
      shoreHardness.length > 0 ||
      dftReadings.length > 0 ||
      blastProfiles.length > 0 ||
      controlPlans.length > 0 ||
      releaseCertificates.length > 0 ||
      itemsReleases.length > 0 ||
      batchAssignments.length > 0;

    if (!hasAnyData) {
      return null;
    }

    const logoBuffer = await this.fetchCompanyLogo(company);

    const ctx: DataBookContext = {
      jobCard,
      company,
      logoBuffer,
      shoreHardness,
      dftByRole: [
        {
          role: "primer",
          label: "Primer",
          readings: dftReadings.filter((d) => d.coatType === DftCoatType.PRIMER),
        },
        {
          role: "intermediate",
          label: "Intermediate",
          readings: dftReadings.filter((d) => d.coatType === DftCoatType.INTERMEDIATE),
        },
        {
          role: "final",
          label: "Final",
          readings: dftReadings.filter((d) => d.coatType === DftCoatType.FINAL),
        },
      ].filter((group) => group.readings.length > 0),
      blastProfiles,
      dustDebrisTests,
      pullTests,
      controlPlans,
      releaseCertificates,
      itemsReleases,
      batchAssignments,
    };

    const doc = new PDFDocument({
      size: "A4",
      margin: A4.margin,
      bufferPages: true,
      autoFirstPage: false,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const tocEntries: TocEntry[] = [];

    const tocPageIndex = 0;

    this.renderRubberIndex(doc, ctx, tocEntries);
    this.renderPaintIndex(doc, ctx, tocEntries);

    ctx.controlPlans.forEach((plan) => {
      this.renderControlPlan(doc, ctx, plan, tocEntries);
    });

    ctx.blastProfiles.forEach((rec) => {
      this.renderBlastProfile(doc, ctx, rec, tocEntries);
    });

    ctx.dftByRole.forEach((group) => {
      group.readings.forEach((rec) => {
        this.renderDftReport(doc, ctx, rec, group.label, tocEntries);
      });
    });

    ctx.shoreHardness.forEach((rec) => {
      this.renderShoreHardness(doc, ctx, rec, tocEntries);
    });

    ctx.itemsReleases.forEach((release) => {
      this.renderItemsRelease(doc, ctx, release, tocEntries);
    });

    ctx.releaseCertificates.forEach((cert) => {
      this.renderReleaseCertificate(doc, ctx, cert, tocEntries);
    });

    if (ctx.batchAssignments.length > 0) {
      this.renderTraceabilityMatrix(doc, ctx, tocEntries);
    }

    this.renderTocPage(doc, ctx, tocPageIndex, tocEntries);

    this.renderPageFooters(doc, ctx);

    doc.end();
    return done;
  }

  private sectionHeader(
    doc: PDFDoc,
    ctx: DataBookContext,
    title: string,
    docEntry: DocNumberEntry | null,
    tocEntries: TocEntry[],
    docRef?: string,
  ): void {
    doc.addPage();
    const y = A4.margin;

    const pageIndex = doc.bufferedPageRange().count - 1;
    if (docEntry) {
      tocEntries.push({
        title,
        docNumber: docEntry.docNumber,
        pageIndex,
        revision: docEntry.revision,
        edition: docEntry.edition,
      });
    }

    const logoH = 24;
    const logoAreaW = 40;
    let nameX = A4.margin;
    if (ctx.logoBuffer) {
      try {
        doc.image(ctx.logoBuffer, A4.margin, y, { height: logoH, fit: [logoAreaW, logoH] });
        nameX = A4.margin + logoAreaW + 6;
      } catch {
        // logo failed to render — skip
      }
    }

    if (ctx.company?.name) {
      doc
        .fontSize(10)
        .font(FONT.BOLD)
        .fillColor("#000000")
        .text(ctx.company.name, nameX, y + 4, { width: A4.contentWidth / 2 });
    }

    const rightInfo = [
      docEntry ? `Doc: ${docEntry.docNumber}` : null,
      docEntry ? `Ed: ${docEntry.edition} Rev: ${docEntry.revision}` : null,
      docRef ?? null,
    ]
      .filter(Boolean)
      .join("  |  ");

    if (rightInfo) {
      doc
        .fontSize(7)
        .font(FONT.REGULAR)
        .fillColor("#6b7280")
        .text(rightInfo, A4.margin, y + 2, { align: "right", width: A4.contentWidth });
    }

    const brandColor = ctx.company?.primaryColor ?? "#0d9488";
    doc.rect(A4.margin, y + 16, A4.contentWidth, 2).fill(brandColor);

    doc
      .fontSize(13)
      .font(FONT.BOLD)
      .fillColor("#111827")
      .text(title, A4.margin, y + 24, { align: "center", width: A4.contentWidth });

    const jobInfo = [
      `Job Card: ${ctx.jobCard.jobNumber || ctx.jobCard.id}`,
      ctx.jobCard.customerName ? `Customer: ${ctx.jobCard.customerName}` : null,
      ctx.jobCard.poNumber ? `PO: ${ctx.jobCard.poNumber}` : null,
    ]
      .filter(Boolean)
      .join("  |  ");

    doc
      .fontSize(7)
      .font(FONT.REGULAR)
      .fillColor("#6b7280")
      .text(jobInfo, A4.margin, y + 42, { align: "center", width: A4.contentWidth });
    doc.fillColor("#000000");

    doc
      .moveTo(A4.margin, y + 54)
      .lineTo(A4.margin + A4.contentWidth, y + 54)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);

    doc.y = y + A4.headerHeight + 10;
  }

  private tableHeader(
    doc: PDFDoc,
    columns: Array<{
      label: string;
      x: number;
      width: number;
      align?: "left" | "right" | "center";
    }>,
    pg: PageLayout = A4,
  ): number {
    const y = doc.y;
    doc.fontSize(7).font(FONT.BOLD);

    doc.rect(pg.margin, y - 2, pg.contentWidth, 14).fill("#f3f4f6");
    doc.fillColor("#000000");

    columns.forEach((col) => {
      doc.text(col.label, col.x, y, {
        width: col.width,
        align: col.align ?? "left",
      });
    });

    return y + 16;
  }

  private tableRow(
    doc: PDFDoc,
    y: number,
    columns: Array<{
      text: string;
      x: number;
      width: number;
      align?: "left" | "right" | "center";
      bold?: boolean;
      color?: string;
    }>,
  ): number {
    doc.fontSize(7).font(FONT.REGULAR);

    const rowHeight = columns.reduce((max, col) => {
      doc.font(col.bold ? FONT.BOLD : FONT.REGULAR);
      const h = doc.heightOfString(col.text, { width: col.width });
      doc.font(FONT.REGULAR);
      return Math.max(max, h);
    }, 10);

    columns.forEach((col) => {
      doc.fillColor(col.color ?? "#000000");
      if (col.bold) {
        doc.font(FONT.BOLD);
      }
      doc.text(col.text, col.x, y, {
        width: col.width,
        align: col.align ?? "left",
        height: rowHeight,
        ellipsis: true,
      });
      doc.font(FONT.REGULAR);
    });

    doc.fillColor("#000000");
    return y + rowHeight + 2;
  }

  private passFailBadge(result: string | null): string {
    if (result === "pass") return "PASS";
    if (result === "fail") return "FAIL";
    return "-";
  }

  private renderRubberIndex(doc: PDFDoc, ctx: DataBookContext, tocEntries: TocEntry[]): void {
    this.sectionHeader(
      doc,
      ctx,
      "Rubber Section - Table of Contents",
      DOC_NUMBERS.rubber_index,
      tocEntries,
    );

    doc.fontSize(9).font(FONT.REGULAR);
    const entries: Array<[string, string]> = [];

    if (ctx.controlPlans.some((p) => p.planType === "rubber")) {
      entries.push(["Quality Control Plan - Rubber", "QCP"]);
    }
    if (ctx.blastProfiles.length > 0) {
      entries.push(["Blast Profile Report", `${ctx.blastProfiles.length} record(s)`]);
    }
    if (ctx.shoreHardness.length > 0) {
      entries.push(["Shore Hardness Test Report", `${ctx.shoreHardness.length} record(s)`]);
    }
    if (ctx.itemsReleases.length > 0) {
      entries.push(["Items Release", `${ctx.itemsReleases.length} record(s)`]);
    }
    if (ctx.releaseCertificates.length > 0) {
      entries.push(["QC Release Certificate", `${ctx.releaseCertificates.length} record(s)`]);
    }

    if (entries.length === 0) {
      doc.text("No rubber section documents available.", A4.margin, doc.y);
      return;
    }

    const cols = [
      { label: "#", x: A4.margin, width: 30, align: "left" as const },
      { label: "Document", x: A4.margin + 30, width: 350, align: "left" as const },
      { label: "Reference", x: A4.margin + 380, width: 130, align: "left" as const },
    ];

    let y = this.tableHeader(doc, cols);

    entries.forEach(([docName, ref], idx) => {
      y = this.tableRow(doc, y, [
        { text: String(idx + 1), x: A4.margin, width: 30 },
        { text: docName, x: A4.margin + 30, width: 350 },
        { text: ref, x: A4.margin + 380, width: 130 },
      ]);
    });
  }

  private renderPaintIndex(doc: PDFDoc, ctx: DataBookContext, tocEntries: TocEntry[]): void {
    this.sectionHeader(
      doc,
      ctx,
      "Paint Section - Table of Contents",
      DOC_NUMBERS.paint_index,
      tocEntries,
    );

    doc.fontSize(9).font(FONT.REGULAR);
    const entries: Array<[string, string]> = [];

    if (
      ctx.controlPlans.some(
        (p) => p.planType === "paint_external" || p.planType === "paint_internal",
      )
    ) {
      entries.push(["Quality Control Plan - Paint", "QCP"]);
    }
    ctx.dftByRole.forEach((group) => {
      entries.push([`${group.label} DFT Report`, `${group.readings.length} record(s)`]);
    });
    if (ctx.blastProfiles.length > 0) {
      entries.push(["Blast Profile Report", `${ctx.blastProfiles.length} record(s)`]);
    }

    if (entries.length === 0) {
      doc.text("No paint section documents available.", A4.margin, doc.y);
      return;
    }

    const cols = [
      { label: "#", x: A4.margin, width: 30, align: "left" as const },
      { label: "Document", x: A4.margin + 30, width: 350, align: "left" as const },
      { label: "Reference", x: A4.margin + 380, width: 130, align: "left" as const },
    ];

    let y = this.tableHeader(doc, cols);

    entries.forEach(([docName, ref], idx) => {
      y = this.tableRow(doc, y, [
        { text: String(idx + 1), x: A4.margin, width: 30 },
        { text: docName, x: A4.margin + 30, width: 350 },
        { text: ref, x: A4.margin + 380, width: 130 },
      ]);
    });
  }

  private filterSpecForPlanType(spec: string | null, planType: string): string {
    if (!spec) return "-";
    const parts = spec
      .split(/(?=\bINT\s*:|EXT\s*:)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return spec;

    if (planType === "rubber") {
      const intParts = parts.filter((p) => /^INT\s*:/i.test(p));
      return intParts.length > 0 ? intParts.join("; ") : spec;
    }
    if (planType === "paint_external" || planType === "paint_internal") {
      const extParts = parts.filter((p) => /^EXT\s*:/i.test(p));
      return extParts.length > 0 ? extParts.join("; ") : spec;
    }
    return spec;
  }

  private renderControlPlan(
    doc: PDFDoc,
    ctx: DataBookContext,
    plan: QcControlPlan,
    tocEntries: TocEntry[],
  ): void {
    const pg = A4_LANDSCAPE;
    const planLabels: Record<string, string> = {
      paint_external: "Paint External",
      paint_internal: "Paint Internal",
      rubber: "Rubber Lining",
      hdpe: "HDPE",
    };
    const label = planLabels[plan.planType] ?? plan.planType;
    const docKey = QCP_PLAN_TYPE_DOC_KEYS[plan.planType] ?? "qcp_paint_ext";
    const docEntry = {
      ...DOC_NUMBERS[docKey],
      revision: plan.revision ?? DOC_NUMBERS[docKey].revision,
    };

    doc.addPage({ size: "A4", layout: "landscape" });
    const brandColor = ctx.company?.primaryColor ?? "#dc2626";
    const companyName = ctx.company?.name ?? "Polymer Lining System (Pty) Ltd";

    const pageIndex = doc.bufferedPageRange().count - 1;
    tocEntries.push({
      title: `Quality Control Plan - ${label}`,
      docNumber: docEntry.docNumber,
      pageIndex,
      revision: docEntry.revision,
      edition: docEntry.edition,
    });

    let y = pg.margin;

    const logoH = 28;
    const logoAreaW = 50;
    if (ctx.logoBuffer) {
      try {
        doc.image(ctx.logoBuffer, pg.margin, y, { height: logoH, fit: [logoAreaW, logoH] });
      } catch {
        // logo failed to render — skip
      }
    }

    const nameX = ctx.logoBuffer ? pg.margin + logoAreaW + 8 : pg.margin;
    doc.fontSize(11).font(FONT.BOLD).fillColor("#000000");
    doc.text(companyName, nameX, y + 4, { width: pg.contentWidth * 0.5, lineBreak: false });

    doc
      .fontSize(7)
      .font(FONT.REGULAR)
      .fillColor("#6b7280")
      .text(
        `Doc: ${docEntry.docNumber}  |  Ed: ${docEntry.edition} Rev: ${docEntry.revision}`,
        pg.margin,
        y + 6,
        { align: "right", width: pg.contentWidth, lineBreak: false },
      );

    y += logoH + 4;
    doc.rect(pg.margin, y, pg.contentWidth, 2).fill(brandColor);
    y += 6;

    doc
      .fontSize(12)
      .font(FONT.BOLD)
      .fillColor("#000000")
      .text(`Quality Control Plan - ${label}`, pg.margin, y, {
        align: "center",
        width: pg.contentWidth,
        lineBreak: false,
      });
    y += 16;

    doc
      .moveTo(pg.margin, y)
      .lineTo(pg.margin + pg.contentWidth, y)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);
    y += 6;
    doc.fillColor("#000000");

    const leftCol = pg.margin;
    const rightCol = pg.margin + pg.contentWidth * 0.5;
    const labelW = 80;
    const valW = pg.contentWidth * 0.5 - labelW - 4;

    const filteredSpec = this.filterSpecForPlanType(plan.specification, plan.planType);

    const infoLeft: Array<[string, string]> = [
      ["QCP Number:", plan.qcpNumber ?? "-"],
      ["Job Card:", ctx.jobCard.jobNumber || String(ctx.jobCard.id)],
      ["Description:", plan.itemDescription ?? "-"],
    ];
    const infoRight: Array<[string, string]> = [
      ["Customer:", plan.customerName ?? "-"],
      ["Order No:", plan.orderNumber ?? "-"],
      ["Specification:", filteredSpec],
    ];

    const infoStartY = y;
    doc.fontSize(7);
    infoLeft.forEach(([lbl, val]) => {
      doc.font(FONT.BOLD).text(lbl, leftCol, y, { width: labelW, lineBreak: false });
      doc
        .font(FONT.REGULAR)
        .text(val, leftCol + labelW, y, { width: valW, height: 10, ellipsis: true });
      y += 11;
    });

    y = infoStartY;
    infoRight.forEach(([lbl, val]) => {
      doc.font(FONT.BOLD).text(lbl, rightCol, y, { width: labelW, lineBreak: false });
      doc
        .font(FONT.REGULAR)
        .text(val, rightCol + labelW, y, { width: valW, height: 10, ellipsis: true });
      y += 11;
    });

    y = infoStartY + infoLeft.length * 11 + 4;

    const rawAbbrev = this.qcpClientAbbrev(plan);
    const clientLabel =
      rawAbbrev && rawAbbrev !== "MPS" && rawAbbrev !== "PLS" ? rawAbbrev : "Client";
    const hasThirdParty = plan.activities.some((a) => {
      const it = (a as any).thirdParty?.interventionType;
      return it !== null && it !== undefined && it !== "";
    });
    const partyCols = hasThirdParty ? 4 : 3;

    const opW = 24;
    const descW = hasThirdParty ? 145 : 155;
    const specW = hasThirdParty ? 105 : 115;
    const docColW = hasThirdParty ? 75 : 85;
    const partyIntW = 28;
    const partySignW = 32;
    const partyW = partyIntW + partySignW;
    const remarkW = pg.contentWidth - opW - descW - specW - docColW - partyW * partyCols;

    const opX = pg.margin;
    const descX = opX + opW;
    const specX = descX + descW;
    const docColX = specX + specW;
    const plsX = docColX + docColW;
    const mpsX = plsX + partyW;
    const clientX = mpsX + partyW;
    const thirdX = clientX + partyW;
    const remarkX = hasThirdParty ? thirdX + partyW : clientX + partyW;

    const headerH = 28;
    doc.rect(pg.margin, y - 2, pg.contentWidth, headerH).fill("#f3f4f6");
    doc.fillColor("#000000");

    doc.fontSize(6).font(FONT.BOLD);
    doc.text("OP", opX + 1, y + 2, { width: opW - 2, align: "center", lineBreak: false });
    doc.text("NO", opX + 1, y + 10, { width: opW - 2, align: "center", lineBreak: false });
    doc.text("ACTIVITY DESCRIPTION", descX + 2, y + 5, { width: descW - 4, lineBreak: false });
    doc.text("SPECIFICATION /", specX + 2, y + 2, { width: specW - 4, lineBreak: false });
    doc.text("PROCEDURE", specX + 2, y + 10, { width: specW - 4, lineBreak: false });
    doc.text("DOCUMENTATION", docColX + 2, y + 5, { width: docColW - 4, lineBreak: false });

    const interventionsW = partyW * partyCols;
    doc.text("INTERVENTIONS", plsX, y, {
      width: interventionsW,
      align: "center",
      lineBreak: false,
    });

    const subY = y + 13;
    doc.fontSize(5.5).font(FONT.BOLD);
    doc.text("PLS", plsX + 1, subY, { width: partyIntW - 2, align: "center", lineBreak: false });
    doc.text("SIGN", plsX + partyIntW + 1, subY, {
      width: partySignW - 2,
      align: "center",
      lineBreak: false,
    });
    doc.text("MPS", mpsX + 1, subY, { width: partyIntW - 2, align: "center", lineBreak: false });
    doc.text("SIGN", mpsX + partyIntW + 1, subY, {
      width: partySignW - 2,
      align: "center",
      lineBreak: false,
    });
    doc.text(clientLabel, clientX + 1, subY, {
      width: partyIntW - 2,
      align: "center",
      lineBreak: false,
    });
    doc.text("SIGN", clientX + partyIntW + 1, subY, {
      width: partySignW - 2,
      align: "center",
      lineBreak: false,
    });
    if (hasThirdParty) {
      doc.text("3rd Party", thirdX + 1, subY, {
        width: partyIntW - 2,
        align: "center",
        lineBreak: false,
      });
      doc.text("SIGN", thirdX + partyIntW + 1, subY, {
        width: partySignW - 2,
        align: "center",
        lineBreak: false,
      });
    }
    doc.text("REMARKS", remarkX + 2, y + 5, { width: remarkW - 4, lineBreak: false });

    y += headerH;

    doc
      .moveTo(pg.margin, y - 1)
      .lineTo(pg.margin + pg.contentWidth, y - 1)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);

    const maxY = pg.pageHeight - 50;

    const addNewPage = (): void => {
      doc.addPage({ size: "A4", layout: "landscape" });
      y = pg.margin + 10;
    };

    plan.activities.forEach((activity) => {
      if (y > maxY) {
        addNewPage();
      }

      const rowH = 18;
      doc
        .moveTo(pg.margin, y + rowH - 1)
        .lineTo(pg.margin + pg.contentWidth, y + rowH - 1)
        .lineWidth(0.3)
        .stroke("#e5e7eb");
      doc.lineWidth(1);

      doc.fontSize(7).font(FONT.REGULAR).fillColor("#000000");
      doc.text(String(activity.operationNumber), opX + 1, y + 4, {
        width: opW - 2,
        height: rowH - 6,
        align: "center",
      });
      doc.text(activity.description, descX + 2, y + 4, {
        width: descW - 4,
        height: rowH - 6,
        ellipsis: true,
      });
      doc.text(activity.specification ?? "-", specX + 2, y + 4, {
        width: specW - 4,
        height: rowH - 6,
        ellipsis: true,
      });
      doc.text(
        (activity as any).documentation ?? activity.procedureRequired ?? "-",
        docColX + 2,
        y + 4,
        { width: docColW - 4, height: rowH - 6, ellipsis: true },
      );

      doc.font(FONT.BOLD).fontSize(7);
      const plsType = activity.pls?.interventionType ?? "-";
      const mpsType = activity.mps?.interventionType ?? "-";
      const clientType = activity.client?.interventionType ?? "-";
      const thirdType = (activity as any).thirdParty?.interventionType ?? "-";

      doc.text(plsType, plsX + 1, y + 4, {
        width: partyIntW - 2,
        align: "center",
        lineBreak: false,
      });
      doc.fontSize(6.5).font(FONT.REGULAR);
      doc.text(activity.pls?.initial ?? "", plsX + partyIntW + 1, y + 4, {
        width: partySignW - 2,
        align: "center",
        lineBreak: false,
      });

      doc.fontSize(7).font(FONT.BOLD);
      doc.text(mpsType, mpsX + 1, y + 4, {
        width: partyIntW - 2,
        align: "center",
        lineBreak: false,
      });
      doc.fontSize(6.5).font(FONT.REGULAR);
      doc.text(activity.mps?.initial ?? "", mpsX + partyIntW + 1, y + 4, {
        width: partySignW - 2,
        align: "center",
        lineBreak: false,
      });

      doc.fontSize(7).font(FONT.BOLD);
      doc.text(clientType, clientX + 1, y + 4, {
        width: partyIntW - 2,
        align: "center",
        lineBreak: false,
      });
      doc.fontSize(6.5).font(FONT.REGULAR);
      doc.text(activity.client?.initial ?? "", clientX + partyIntW + 1, y + 4, {
        width: partySignW - 2,
        align: "center",
        lineBreak: false,
      });

      if (hasThirdParty) {
        doc.fontSize(7).font(FONT.BOLD);
        doc.text(thirdType, thirdX + 1, y + 4, {
          width: partyIntW - 2,
          align: "center",
          lineBreak: false,
        });
        doc.fontSize(6.5).font(FONT.REGULAR);
        doc.text((activity as any).thirdParty?.initial ?? "", thirdX + partyIntW + 1, y + 4, {
          width: partySignW - 2,
          align: "center",
          lineBreak: false,
        });
      }

      doc.font(FONT.REGULAR).fontSize(7);
      doc.text(activity.remarks ?? "", remarkX + 2, y + 4, {
        width: remarkW - 4,
        height: rowH - 6,
        ellipsis: true,
      });

      y += rowH;
    });

    y += 10;
    if (y > maxY - 60) {
      addNewPage();
    }

    doc.fontSize(7).font(FONT.BOLD).text("Approval Signatures", pg.margin, y, { lineBreak: false });
    y += 12;

    const defaultSigParties = [
      { party: "PLS", name: null, signatureUrl: null, date: null },
      { party: "MPS", name: null, signatureUrl: null, date: null },
      { party: clientLabel, name: null, signatureUrl: null, date: null },
      ...(hasThirdParty
        ? [{ party: "3rd Party", name: null, signatureUrl: null, date: null }]
        : []),
    ];
    const storedSigs =
      plan.approvalSignatures.length > 0 ? plan.approvalSignatures : defaultSigParties;
    const sigParties = hasThirdParty
      ? storedSigs
      : storedSigs.filter((s) => !s.party.toLowerCase().includes("3rd"));

    const sigColW = pg.contentWidth / Math.max(sigParties.length, 3);
    sigParties.forEach((sig, idx) => {
      const sx = pg.margin + idx * sigColW;
      doc
        .fontSize(6.5)
        .font(FONT.BOLD)
        .text(`Approved By: ${sig.party}`, sx, y, { width: sigColW, lineBreak: false });
      doc
        .fontSize(6.5)
        .font(FONT.REGULAR)
        .text(`Name: ${sig.name ?? ""}`, sx, y + 10, { width: sigColW, lineBreak: false });
      doc.text("Signed: ________________", sx, y + 20, { width: sigColW, lineBreak: false });
      doc.text(`Date: ${sig.date ?? ""}`, sx, y + 30, { width: sigColW, lineBreak: false });
    });

    y += 46;

    doc.fontSize(6).font(FONT.BOLD).text("Legend", pg.margin, y, { lineBreak: false });
    y += 8;
    doc.fontSize(5.5).font(FONT.REGULAR);
    doc.text(
      "H = Hold    I = Inspection    W = Witness    R = Review    S = Surveillance    V = Verify",
      pg.margin,
      y,
      { width: pg.contentWidth, lineBreak: false },
    );
  }

  private qcpClientAbbrev(plan: QcControlPlan): string {
    const name = plan.customerName ?? "";
    const words = name.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= 3) {
      return words
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    }
    return words
      .filter((w) => w.toUpperCase() !== "(PTY)" && w.toUpperCase() !== "LTD")
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  private renderItemsRelease(
    doc: PDFDoc,
    ctx: DataBookContext,
    release: QcItemsRelease,
    tocEntries: TocEntry[],
  ): void {
    const pg = A4_LANDSCAPE;
    const hasRubber = release.items.some((item) => item.rubberSpec && item.rubberSpec !== "-");
    const hasPaint = release.items.some((item) => item.paintingSpec && item.paintingSpec !== "-");

    const coatingLabel =
      hasRubber && hasPaint
        ? "Rubber Lining & Paint Coating"
        : hasRubber
          ? "Rubber Lining"
          : hasPaint
            ? "Paint Coating"
            : "";

    const subtitle = coatingLabel
      ? `Item Release Document — ${coatingLabel}`
      : "Item Release Document";
    this.itemsReleaseHeader(doc, ctx, subtitle, DOC_NUMBERS.items_release, tocEntries);

    let y = doc.y;

    const leftColX = pg.margin;
    const rightColX = pg.margin + pg.contentWidth * 0.45;
    const labelW = 85;

    doc.fontSize(8).font(FONT.BOLD).fillColor("#000000");
    doc.text("Company Details", leftColX, y);
    y += 12;

    doc.fontSize(7).font(FONT.REGULAR);
    const companyName = ctx.company?.name ?? "";
    const companyAddress = ctx.company?.streetAddress ?? "";
    const companyPhone = ctx.company?.phone ?? "";
    const companyEmail = ctx.company?.email ?? "";
    const companyWebsite = ctx.company?.websiteUrl ?? "";

    doc.text(companyName, leftColX, y, { width: pg.contentWidth * 0.4 });
    y += 10;
    if (companyAddress) {
      doc.text(companyAddress, leftColX, y, { width: pg.contentWidth * 0.4 });
      y += 10;
    }
    if (companyPhone) {
      doc.text(companyPhone, leftColX, y, { width: pg.contentWidth * 0.4 });
      y += 10;
    }
    if (companyEmail) {
      doc.text(companyEmail, leftColX, y, { width: pg.contentWidth * 0.4 });
      y += 10;
    }
    if (companyWebsite) {
      doc.text(companyWebsite, leftColX, y, { width: pg.contentWidth * 0.4 });
      y += 10;
    }

    const infoY = doc.y - (y - (doc.y - 12));
    const rightStartY = infoY + 12;
    doc.fontSize(7).font(FONT.REGULAR);

    const rightFields: Array<[string, string]> = [
      ["CLIENT:", ctx.jobCard.customerName ?? "-"],
      ["ORDER NO:", ctx.jobCard.poNumber ?? "-"],
      ["RELEASE NO:", `${release.id}`],
      ["JOB CARD:", ctx.jobCard.jobNumber || String(ctx.jobCard.id)],
    ];

    rightFields.forEach(([label, value], idx) => {
      const ry = rightStartY + idx * 12;
      doc.font(FONT.BOLD).text(label, rightColX, ry, { width: labelW, continued: false });
      doc.font(FONT.REGULAR).text(value, rightColX + labelW, ry, {
        width: pg.contentWidth * 0.4,
      });
    });

    y = Math.max(y, rightStartY + rightFields.length * 12) + 8;

    doc
      .moveTo(pg.margin, y)
      .lineTo(pg.margin + pg.contentWidth, y)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);
    y += 6;

    const checkedByW = 65;
    const dateW = 50;
    const fixedColsWidth = 25 + 40 + 65 + 45 + 40 + 35 + checkedByW + dateW;
    const specColsCount = (hasRubber ? 1 : 0) + (hasPaint ? 1 : 0);
    const specColWidth =
      specColsCount > 0 ? Math.floor((pg.contentWidth - fixedColsWidth) / (specColsCount + 1)) : 0;
    const descWidth = pg.contentWidth - fixedColsWidth - specColWidth * specColsCount;

    let xOffset = pg.margin;
    const cols: Array<{
      label: string;
      x: number;
      width: number;
      align: "left" | "right" | "center";
    }> = [];

    cols.push({ label: "#", x: xOffset, width: 25, align: "center" });
    xOffset += 25;
    cols.push({ label: "Item No", x: xOffset, width: 40, align: "left" });
    xOffset += 40;
    cols.push({ label: "Item Code", x: xOffset, width: 65, align: "left" });
    xOffset += 65;
    cols.push({ label: "Item Description", x: xOffset, width: descWidth, align: "left" });
    xOffset += descWidth;

    const rubberColIdx = hasRubber ? cols.length : -1;
    if (hasRubber) {
      cols.push({ label: "Rubber Spec", x: xOffset, width: specColWidth, align: "left" });
      xOffset += specColWidth;
    }
    const paintColIdx = hasPaint ? cols.length : -1;
    if (hasPaint) {
      cols.push({ label: "Painting Spec", x: xOffset, width: specColWidth, align: "left" });
      xOffset += specColWidth;
    }

    cols.push({ label: "Qty", x: xOffset, width: 45, align: "right" });
    xOffset += 45;
    cols.push({ label: "JT No", x: xOffset, width: 40, align: "left" });
    xOffset += 40;
    cols.push({ label: "P/F", x: xOffset, width: 35, align: "center" });
    xOffset += 35;
    cols.push({ label: "Checked By", x: xOffset, width: checkedByW, align: "left" });
    xOffset += checkedByW;
    cols.push({ label: "Date", x: xOffset, width: dateW, align: "left" });

    const maxY = pg.pageHeight - pg.margin - 30;

    doc.y = y;
    y = this.tableHeader(doc, cols, pg);

    release.items.forEach((item, idx) => {
      const estimatedHeight = (() => {
        doc.fontSize(7).font(FONT.REGULAR);
        const descH = doc.heightOfString(item.description || "", { width: cols[3].width });
        const specText = item.paintingSpec || item.rubberSpec || "";
        const specW =
          rubberColIdx >= 0
            ? cols[rubberColIdx].width
            : paintColIdx >= 0
              ? cols[paintColIdx].width
              : 100;
        const specH = specText ? doc.heightOfString(specText, { width: specW }) : 10;
        return Math.max(descH, specH, 10) + 2;
      })();

      if (y + estimatedHeight > maxY) {
        doc.addPage({ size: "A4", layout: "landscape" });
        doc.y = pg.margin + 20;
        y = this.tableHeader(doc, cols, pg);
      }

      const resultColor = item.result === "pass" ? "#166534" : "#991b1b";
      const itemNo = item.itemNo ?? null;
      const rowCells: Array<{
        text: string;
        x: number;
        width: number;
        align?: "left" | "right" | "center";
        bold?: boolean;
        color?: string;
      }> = [
        { text: String(idx + 1), x: cols[0].x, width: cols[0].width, align: "center" },
        { text: itemNo ?? "-", x: cols[1].x, width: cols[1].width },
        { text: item.itemCode, x: cols[2].x, width: cols[2].width },
        { text: item.description, x: cols[3].x, width: cols[3].width },
      ];

      if (rubberColIdx >= 0) {
        rowCells.push({
          text: item.rubberSpec ?? "-",
          x: cols[rubberColIdx].x,
          width: cols[rubberColIdx].width,
        });
      }
      if (paintColIdx >= 0) {
        rowCells.push({
          text: item.paintingSpec ?? "-",
          x: cols[paintColIdx].x,
          width: cols[paintColIdx].width,
        });
      }

      const qtyColIdx =
        paintColIdx >= 0 ? paintColIdx + 1 : rubberColIdx >= 0 ? rubberColIdx + 1 : 4;
      const jtColIdx = qtyColIdx + 1;
      const pfColIdx = jtColIdx + 1;
      const checkedColIdx = pfColIdx + 1;
      const dateColIdx = checkedColIdx + 1;

      rowCells.push(
        {
          text: String(item.quantity),
          x: cols[qtyColIdx].x,
          width: cols[qtyColIdx].width,
          align: "right",
        },
        { text: item.jtNumber ?? "-", x: cols[jtColIdx].x, width: cols[jtColIdx].width },
        {
          text: this.passFailBadge(item.result),
          x: cols[pfColIdx].x,
          width: cols[pfColIdx].width,
          align: "center",
          bold: true,
          color: resultColor,
        },
        {
          text: release.checkedByName ?? "",
          x: cols[checkedColIdx].x,
          width: cols[checkedColIdx].width,
        },
        {
          text: release.checkedByDate ?? "",
          x: cols[dateColIdx].x,
          width: cols[dateColIdx].width,
        },
      );

      y = this.tableRow(doc, y, rowCells);
    });

    y += 6;
    doc
      .moveTo(pg.margin, y)
      .lineTo(pg.margin + pg.contentWidth, y)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);
    y += 8;

    doc.fontSize(8).font(FONT.BOLD).fillColor("#000000");
    doc.text(`TOTAL QTY: ${release.totalQuantity}`, pg.margin + pg.contentWidth * 0.5, y, {
      align: "center",
      width: pg.contentWidth * 0.5,
    });
    y += 20;

    const hasClient = this.itemsReleaseHasParty(ctx, "client");
    const hasThirdParty = this.itemsReleaseHasParty(ctx, "thirdParty");

    const companyShort = ctx.company?.name?.toUpperCase() ?? "POLYMER LINERS";
    const clientName = ctx.jobCard.customerName?.toUpperCase() ?? "CLIENT";

    const signOffParties: Array<{ label: string; signOff: ReleasePartySignOff }> = [
      { label: companyShort, signOff: release.plsSignOff },
      { label: "MPS", signOff: release.mpsSignOff },
    ];
    if (hasClient) {
      signOffParties.push({ label: clientName, signOff: release.clientSignOff });
    }
    if (hasThirdParty) {
      signOffParties.push({ label: "3RD PARTY", signOff: release.thirdPartySignOff });
    }

    if (y > maxY - 120) {
      doc.addPage({ size: "A4", layout: "landscape" });
      y = pg.margin + 20;
    }

    const boxW = Math.floor(pg.contentWidth / signOffParties.length);
    const boxH = 60;
    const lineGap = 14;

    signOffParties.forEach((p, idx) => {
      const bx = pg.margin + idx * boxW;
      const innerW = boxW - 8;

      doc
        .rect(bx, y, boxW - 4, boxH)
        .lineWidth(0.5)
        .stroke("#d1d5db");

      doc
        .fontSize(8)
        .font(FONT.BOLD)
        .fillColor("#000000")
        .text(p.label, bx + 4, y + 4, { width: innerW, lineBreak: false });

      doc.fontSize(7).font(FONT.REGULAR);
      doc.text(`NAME: ${p.signOff?.name ?? ""}`, bx + 4, y + 4 + lineGap, {
        width: innerW,
        lineBreak: false,
      });
      doc.text(`DATE: ${p.signOff?.date ?? ""}`, bx + 4, y + 4 + lineGap * 2, {
        width: innerW,
        lineBreak: false,
      });
      doc.text("SIGNATURE: ________________", bx + 4, y + 4 + lineGap * 3, {
        width: innerW,
        lineBreak: false,
      });
    });
  }

  private itemsReleaseHeader(
    doc: PDFDoc,
    ctx: DataBookContext,
    title: string,
    docEntry: DocNumberEntry | null,
    tocEntries: TocEntry[],
  ): void {
    const pg = A4_LANDSCAPE;
    doc.addPage({ size: "A4", layout: "landscape" });
    const y = pg.margin;

    const pageIndex = doc.bufferedPageRange().count - 1;
    if (docEntry) {
      tocEntries.push({
        title,
        docNumber: docEntry.docNumber,
        pageIndex,
        revision: docEntry.revision,
        edition: docEntry.edition,
      });
    }

    const logoH = 24;
    const logoAreaW = 40;
    let nameX = pg.margin;
    if (ctx.logoBuffer) {
      try {
        doc.image(ctx.logoBuffer, pg.margin, y, { height: logoH, fit: [logoAreaW, logoH] });
        nameX = pg.margin + logoAreaW + 6;
      } catch {
        // logo failed to render
      }
    }

    if (ctx.company?.name) {
      doc
        .fontSize(12)
        .font(FONT.BOLD)
        .fillColor("#000000")
        .text(ctx.company.name, nameX, y + 4, { width: pg.contentWidth / 2 });
    }

    const rightInfo = [
      docEntry ? `Doc: ${docEntry.docNumber}` : null,
      docEntry ? `Ed: ${docEntry.edition} Rev: ${docEntry.revision}` : null,
    ]
      .filter(Boolean)
      .join("  |  ");

    if (rightInfo) {
      doc
        .fontSize(8)
        .font(FONT.REGULAR)
        .fillColor("#6b7280")
        .text(rightInfo, pg.margin, y + 2, { align: "right", width: pg.contentWidth });
    }

    const brandColor = ctx.company?.primaryColor ?? "#0d9488";
    doc.rect(pg.margin, y + 18, pg.contentWidth, 2).fill(brandColor);

    doc
      .fontSize(16)
      .font(FONT.BOLD)
      .fillColor("#111827")
      .text(title, pg.margin, y + 26, { align: "center", width: pg.contentWidth });

    const jobInfo = [
      `Job Card: ${ctx.jobCard.jobNumber || ctx.jobCard.id}`,
      ctx.jobCard.customerName ? `Customer: ${ctx.jobCard.customerName}` : null,
      ctx.jobCard.poNumber ? `PO: ${ctx.jobCard.poNumber}` : null,
    ]
      .filter(Boolean)
      .join("  |  ");

    doc
      .fontSize(8)
      .font(FONT.REGULAR)
      .fillColor("#6b7280")
      .text(jobInfo, pg.margin, y + 48, { align: "center", width: pg.contentWidth });
    doc.fillColor("#000000");

    doc
      .moveTo(pg.margin, y + 62)
      .lineTo(pg.margin + pg.contentWidth, y + 62)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);

    doc.y = y + pg.headerHeight + 20;
  }

  private itemsReleaseHasParty(ctx: DataBookContext, party: "client" | "thirdParty"): boolean {
    return ctx.controlPlans.some((plan) =>
      plan.activities.some((a) => {
        const signOff = (a as any)[party];
        const it = signOff?.interventionType;
        return it !== null && it !== undefined && it !== "";
      }),
    );
  }

  private renderReleaseCertificate(
    doc: PDFDoc,
    ctx: DataBookContext,
    cert: QcReleaseCertificate,
    tocEntries: TocEntry[],
  ): void {
    this.sectionHeader(
      doc,
      ctx,
      "QC Release Certificate",
      DOC_NUMBERS.release_cert,
      tocEntries,
      cert.certificateNumber ?? undefined,
    );

    doc.fontSize(8).font(FONT.REGULAR);
    let y = doc.y;

    if (cert.certificateDate) {
      doc.text(`Date: ${cert.certificateDate}`, A4.margin, y);
      y += 14;
    }

    if (cert.blastingCheck) {
      doc.fontSize(9).font(FONT.BOLD).text("Blasting", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      doc.text(`Batch No: ${cert.blastingCheck.blastProfileBatchNo ?? "-"}`, A4.margin, y);
      y += 12;
      doc.text(
        `Contamination Free: ${this.passFailBadge(cert.blastingCheck.contaminationFree)}`,
        A4.margin,
        y,
      );
      y += 12;
      doc.text(`SA 2.5 Grade: ${this.passFailBadge(cert.blastingCheck.sa25Grade)}`, A4.margin, y);
      y += 12;
      doc.text(`Inspector: ${cert.blastingCheck.inspectorName ?? "-"}`, A4.margin, y);
      y += 16;
    }

    if (cert.solutionsUsed.length > 0) {
      doc.fontSize(9).font(FONT.BOLD).text("Solutions Used", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      cert.solutionsUsed.forEach((sol) => {
        doc.text(
          `${sol.productName} | Batch: ${sol.typeBatch ?? "-"} | ${this.passFailBadge(sol.result)} | Inspector: ${sol.inspectorName ?? "-"}`,
          A4.margin,
          y,
        );
        y += 12;
      });
      y += 4;
    }

    if (cert.liningCheck) {
      doc.fontSize(9).font(FONT.BOLD).text("Lining Check", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      doc.text(
        `Pre-cure lined as per drawing: ${this.passFailBadge(cert.liningCheck.preCureLinedAsPerDrawing)}`,
        A4.margin,
        y,
      );
      y += 12;
      doc.text(
        `Visual defect inspection: ${this.passFailBadge(cert.liningCheck.visualDefectInspection)}`,
        A4.margin,
        y,
      );
      y += 16;
    }

    if (cert.cureCycles.length > 0) {
      doc.fontSize(9).font(FONT.BOLD).text("Cure Cycles", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      cert.cureCycles.forEach((cycle) => {
        doc.text(
          `Cycle ${cycle.cycleNumber}: In: ${cycle.timeIn ?? "-"} | Out: ${cycle.timeOut ?? "-"} | Pressure: ${cycle.pressureBar ?? "-"} BAR`,
          A4.margin,
          y,
        );
        y += 12;
      });
      y += 4;
    }

    if (cert.paintingChecks.length > 0) {
      doc.fontSize(9).font(FONT.BOLD).text("Painting Checks", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      cert.paintingChecks.forEach((pc) => {
        doc.text(
          `${pc.coat}: Batch ${pc.batchNumber ?? "-"} | DFT: ${pc.dftMicrons ?? "-"} μm | ${this.passFailBadge(pc.result)} | Inspector: ${pc.inspectorName ?? "-"}`,
          A4.margin,
          y,
        );
        y += 12;
      });
      y += 4;
    }

    if (cert.finalInspection) {
      if (y > 700) {
        doc.addPage();
        y = A4.margin + 20;
      }
      doc.fontSize(9).font(FONT.BOLD).text("Final Inspection", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      doc.text(
        `Lined as per drawing: ${this.passFailBadge(cert.finalInspection.linedAsPerDrawing)}`,
        A4.margin,
        y,
      );
      y += 12;
      doc.text(
        `Visual inspection: ${this.passFailBadge(cert.finalInspection.visualInspection)}`,
        A4.margin,
        y,
      );
      y += 12;
      doc.text(`Test plate: ${this.passFailBadge(cert.finalInspection.testPlate)}`, A4.margin, y);
      y += 12;
      doc.text(`Shore hardness: ${cert.finalInspection.shoreHardness ?? "-"}`, A4.margin, y);
      y += 12;
      doc.text(
        `Spark test: ${this.passFailBadge(cert.finalInspection.sparkTest)} | ${cert.finalInspection.sparkTestVoltagePerMm ?? "-"} V/mm`,
        A4.margin,
        y,
      );
      y += 12;
      doc.text(`Inspector: ${cert.finalInspection.inspectorName ?? "-"}`, A4.margin, y);
      y += 16;
    }

    if (cert.comments) {
      doc.fontSize(9).font(FONT.BOLD).text("Comments", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR).text(cert.comments, A4.margin, y);
      y += 16;
    }

    if (cert.finalApprovalName) {
      doc.fontSize(9).font(FONT.BOLD).text("Final Approval", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR);
      doc.text(
        `Name: ${cert.finalApprovalName}  |  Date: ${cert.finalApprovalDate ?? "-"}`,
        A4.margin,
        y,
      );
    }
  }

  private renderShoreHardness(
    doc: PDFDoc,
    ctx: DataBookContext,
    rec: QcShoreHardness,
    tocEntries: TocEntry[],
  ): void {
    this.sectionHeader(
      doc,
      ctx,
      "Shore Hardness Test Report",
      DOC_NUMBERS.shore_hardness,
      tocEntries,
    );

    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(
      `Rubber Spec: ${rec.rubberSpec}  |  Batch: ${rec.rubberBatchNumber ?? "-"}  |  Required Shore: ${rec.requiredShore}`,
      A4.margin,
      doc.y,
    );
    doc.text(
      `Date: ${rec.readingDate}  |  Captured by: ${rec.capturedByName}`,
      A4.margin,
      doc.y + 12,
    );
    doc.moveDown(1.5);

    const columns = ["column1", "column2", "column3", "column4"] as const;
    const maxRows = Math.max(...columns.map((col) => rec.readings[col]?.length ?? 0));

    const cols = [
      { label: "Item", x: A4.margin, width: 40, align: "center" as const },
      { label: "Col 1", x: A4.margin + 40, width: 80, align: "center" as const },
      { label: "Col 2", x: A4.margin + 120, width: 80, align: "center" as const },
      { label: "Col 3", x: A4.margin + 200, width: 80, align: "center" as const },
      { label: "Col 4", x: A4.margin + 280, width: 80, align: "center" as const },
    ];

    let y = this.tableHeader(doc, cols);

    Array.from({ length: maxRows }).forEach((_, rowIdx) => {
      if (y > 750) {
        doc.addPage();
        y = A4.margin + 20;
        y = this.tableHeader(doc, cols);
      }

      const rowCols = columns.map((col) => {
        const val = rec.readings[col]?.[rowIdx];
        const outOfSpec = val != null && Math.abs(val - rec.requiredShore) > 5;
        return {
          text: val != null ? String(val) : "",
          x: cols[columns.indexOf(col) + 1].x,
          width: 80,
          align: "center" as const,
          color: outOfSpec ? "#991b1b" : "#000000",
        };
      });

      const itemLabel = rec.readings.itemLabels?.[rowIdx]?.trim() || String(rowIdx + 1);

      y = this.tableRow(doc, y, [
        { text: itemLabel, x: A4.margin, width: 40, align: "center" },
        ...rowCols,
      ]);
    });

    y += 5;
    doc.fontSize(8).font(FONT.BOLD);

    const avgRow = columns.map((col) => {
      const avg = rec.averages[col];
      const outOfSpec = avg !== null && Math.abs(avg - rec.requiredShore) > 5;
      return {
        text: avg !== null ? avg.toFixed(1) : "-",
        x: cols[columns.indexOf(col) + 1].x,
        width: 80,
        align: "center" as const,
        bold: true,
        color: outOfSpec ? "#991b1b" : "#000000",
      };
    });

    y = this.tableRow(doc, y, [
      { text: "Average", x: A4.margin, width: 40, align: "center", bold: true },
      ...avgRow,
    ]);

    y += 5;
    const overallColor =
      rec.averages.overall !== null && Math.abs(rec.averages.overall - rec.requiredShore) > 5
        ? "#991b1b"
        : "#166534";
    doc
      .fontSize(9)
      .font(FONT.BOLD)
      .fillColor(overallColor)
      .text(
        `Overall Average: ${rec.averages.overall !== null ? rec.averages.overall.toFixed(1) : "-"}  |  Required: ${rec.requiredShore}`,
        A4.margin,
        y,
      );
    doc.fillColor("#000000");
  }

  private renderDftReport(
    doc: PDFDoc,
    ctx: DataBookContext,
    rec: QcDftReading,
    label: string,
    tocEntries: TocEntry[],
  ): void {
    const docEntry = label === "Primer" ? DOC_NUMBERS.primer_dft : DOC_NUMBERS.final_dft;
    this.sectionHeader(doc, ctx, `${label} Coat DFT Report`, docEntry, tocEntries);

    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(
      `Paint Product: ${rec.paintProduct}  |  Batch: ${rec.batchNumber ?? "-"}`,
      A4.margin,
      doc.y,
    );
    doc.text(
      `Spec Range: ${rec.specMinMicrons}-${rec.specMaxMicrons} μm  |  Date: ${rec.readingDate}  |  Captured by: ${rec.capturedByName}`,
      A4.margin,
      doc.y + 12,
    );
    doc.moveDown(1.5);

    const cols = [
      { label: "Item #", x: A4.margin, width: 60, align: "center" as const },
      { label: "Reading (μm)", x: A4.margin + 60, width: 100, align: "center" as const },
      { label: "Status", x: A4.margin + 160, width: 80, align: "center" as const },
    ];

    let y = this.tableHeader(doc, cols);

    rec.readings.forEach((entry) => {
      if (y > 750) {
        doc.addPage();
        y = A4.margin + 20;
        y = this.tableHeader(doc, cols);
      }

      const outOfSpec =
        entry.reading < Number(rec.specMinMicrons) || entry.reading > Number(rec.specMaxMicrons);
      y = this.tableRow(doc, y, [
        { text: String(entry.itemNumber), x: A4.margin, width: 60, align: "center" },
        {
          text: String(entry.reading),
          x: A4.margin + 60,
          width: 100,
          align: "center",
          color: outOfSpec ? "#991b1b" : "#000000",
        },
        {
          text: outOfSpec ? "OUT OF SPEC" : "OK",
          x: A4.margin + 160,
          width: 80,
          align: "center",
          bold: true,
          color: outOfSpec ? "#991b1b" : "#166534",
        },
      ]);
    });

    y += 10;
    const avgOutOfSpec =
      rec.averageMicrons !== null &&
      (Number(rec.averageMicrons) < Number(rec.specMinMicrons) ||
        Number(rec.averageMicrons) > Number(rec.specMaxMicrons));
    doc
      .fontSize(9)
      .font(FONT.BOLD)
      .fillColor(avgOutOfSpec ? "#991b1b" : "#166534")
      .text(
        `Average: ${rec.averageMicrons !== null ? Number(rec.averageMicrons).toFixed(1) : "-"} μm  |  Spec: ${rec.specMinMicrons}-${rec.specMaxMicrons} μm`,
        A4.margin,
        y,
      );
    doc.fillColor("#000000");
  }

  private renderBlastProfile(
    doc: PDFDoc,
    ctx: DataBookContext,
    rec: QcBlastProfile,
    tocEntries: TocEntry[],
  ): void {
    this.sectionHeader(doc, ctx, "Blast Profile Report", DOC_NUMBERS.blast_profile, tocEntries);

    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(
      `Spec Target: ${rec.specMicrons} μm  |  Date: ${rec.readingDate}  |  Captured by: ${rec.capturedByName}`,
      A4.margin,
      doc.y,
    );

    const envLine = [
      rec.temperature !== null ? `Temperature: ${rec.temperature}°C` : null,
      rec.humidity !== null ? `Humidity: ${rec.humidity}%` : null,
    ]
      .filter(Boolean)
      .join("  |  ");

    if (envLine) {
      doc.text(envLine, A4.margin, doc.y + 12);
    }
    doc.moveDown(1.5);

    const cols = [
      { label: "Item #", x: A4.margin, width: 60, align: "center" as const },
      { label: "Reading (μm)", x: A4.margin + 60, width: 100, align: "center" as const },
      { label: "Status", x: A4.margin + 160, width: 80, align: "center" as const },
    ];

    let y = this.tableHeader(doc, cols);

    rec.readings.forEach((entry) => {
      if (y > 750) {
        doc.addPage();
        y = A4.margin + 20;
        y = this.tableHeader(doc, cols);
      }

      const belowSpec = entry.reading < Number(rec.specMicrons);
      y = this.tableRow(doc, y, [
        { text: String(entry.itemNumber), x: A4.margin, width: 60, align: "center" },
        {
          text: String(entry.reading),
          x: A4.margin + 60,
          width: 100,
          align: "center",
          color: belowSpec ? "#991b1b" : "#000000",
        },
        {
          text: belowSpec ? "BELOW SPEC" : "OK",
          x: A4.margin + 160,
          width: 80,
          align: "center",
          bold: true,
          color: belowSpec ? "#991b1b" : "#166534",
        },
      ]);
    });

    y += 10;
    const avgBelowSpec =
      rec.averageMicrons !== null && Number(rec.averageMicrons) < Number(rec.specMicrons);
    doc
      .fontSize(9)
      .font(FONT.BOLD)
      .fillColor(avgBelowSpec ? "#991b1b" : "#166534")
      .text(
        `Average: ${rec.averageMicrons !== null ? Number(rec.averageMicrons).toFixed(1) : "-"} μm  |  Spec: ${rec.specMicrons} μm`,
        A4.margin,
        y,
      );
    doc.fillColor("#000000");
  }

  private renderDustDebris(
    doc: PDFDoc,
    ctx: DataBookContext,
    rec: QcDustDebrisTest,
    tocEntries: TocEntry[],
  ): void {
    this.sectionHeader(
      doc,
      ctx,
      "Dust and Debris Test Report",
      DOC_NUMBERS.dust_debris,
      tocEntries,
    );

    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(`Date: ${rec.readingDate}  |  Captured by: ${rec.capturedByName}`, A4.margin, doc.y);
    doc.moveDown(1);

    const cols = [
      { label: "Test #", x: A4.margin, width: 40, align: "center" as const },
      { label: "Item", x: A4.margin + 40, width: 70, align: "left" as const },
      { label: "Qty", x: A4.margin + 110, width: 50, align: "center" as const },
      { label: "Coating Type", x: A4.margin + 160, width: 120, align: "left" as const },
      { label: "Tested At", x: A4.margin + 280, width: 100, align: "left" as const },
      { label: "Result", x: A4.margin + 380, width: 60, align: "center" as const },
    ];

    let y = this.tableHeader(doc, cols);

    rec.tests.forEach((test) => {
      if (y > 750) {
        doc.addPage();
        y = A4.margin + 20;
        y = this.tableHeader(doc, cols);
      }

      const resultColor = test.result === "pass" ? "#166534" : "#991b1b";
      y = this.tableRow(doc, y, [
        { text: String(test.testNumber), x: A4.margin, width: 40, align: "center" },
        { text: test.itemNumber ?? "-", x: A4.margin + 40, width: 70 },
        {
          text: test.quantity !== null ? String(test.quantity) : "-",
          x: A4.margin + 110,
          width: 50,
          align: "center",
        },
        { text: test.coatingType ?? "-", x: A4.margin + 160, width: 120 },
        { text: test.testedAt ?? "-", x: A4.margin + 280, width: 100 },
        {
          text: this.passFailBadge(test.result),
          x: A4.margin + 380,
          width: 60,
          align: "center",
          bold: true,
          color: resultColor,
        },
      ]);
    });

    y += 10;
    const passCount = rec.tests.filter((t) => t.result === "pass").length;
    const failCount = rec.tests.filter((t) => t.result === "fail").length;
    doc
      .fontSize(9)
      .font(FONT.BOLD)
      .text(
        `Summary: ${passCount} pass, ${failCount} fail out of ${rec.tests.length} tests`,
        A4.margin,
        y,
      );
  }

  private renderPullTest(
    doc: PDFDoc,
    ctx: DataBookContext,
    rec: QcPullTest,
    tocEntries: TocEntry[],
  ): void {
    this.sectionHeader(doc, ctx, "Pull Test Certificate", DOC_NUMBERS.pull_test, tocEntries);

    doc.fontSize(8).font(FONT.REGULAR);
    let y = doc.y;

    if (rec.itemDescription) {
      doc.text(`Item: ${rec.itemDescription}`, A4.margin, y);
      y += 12;
    }
    if (rec.quantity !== null) {
      doc.text(`Quantity: ${rec.quantity}`, A4.margin, y);
      y += 12;
    }
    doc.text(`Date: ${rec.readingDate}  |  Captured by: ${rec.capturedByName}`, A4.margin, y);
    y += 16;

    doc.fontSize(9).font(FONT.BOLD).text("Force Gauge", A4.margin, y);
    y += 14;
    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(`Make: ${rec.forceGauge.make}`, A4.margin, y);
    y += 12;
    doc.text(`Certificate Number: ${rec.forceGauge.certificateNumber ?? "-"}`, A4.margin, y);
    y += 12;
    doc.text(`Expiry Date: ${rec.forceGauge.expiryDate ?? "-"}`, A4.margin, y);
    y += 16;

    if (rec.solutions.length > 0) {
      doc.fontSize(9).font(FONT.BOLD).text("Solutions Tested", A4.margin, y);
      y += 14;

      const solCols = [
        { label: "Product", x: A4.margin, width: 180, align: "left" as const },
        { label: "Batch", x: A4.margin + 180, width: 120, align: "left" as const },
        { label: "Result", x: A4.margin + 300, width: 60, align: "center" as const },
      ];

      doc.y = y;
      y = this.tableHeader(doc, solCols);

      rec.solutions.forEach((sol) => {
        const resultColor = sol.result === "pass" ? "#166534" : "#991b1b";
        y = this.tableRow(doc, y, [
          { text: sol.product, x: A4.margin, width: 180 },
          { text: sol.batchNumber ?? "-", x: A4.margin + 180, width: 120 },
          {
            text: this.passFailBadge(sol.result),
            x: A4.margin + 300,
            width: 60,
            align: "center",
            bold: true,
            color: resultColor,
          },
        ]);
      });

      y += 8;
    }

    if (rec.areaReadings.length > 0) {
      doc.fontSize(9).font(FONT.BOLD).text("Area Readings", A4.margin, y);
      y += 14;

      const areaCols = [
        { label: "Area", x: A4.margin, width: 150, align: "left" as const },
        { label: "Reading (kg)", x: A4.margin + 150, width: 100, align: "center" as const },
        { label: "Result", x: A4.margin + 250, width: 60, align: "center" as const },
      ];

      doc.y = y;
      y = this.tableHeader(doc, areaCols);

      rec.areaReadings.forEach((ar) => {
        const resultColor = ar.result === "pass" ? "#166534" : "#991b1b";
        y = this.tableRow(doc, y, [
          { text: ar.area, x: A4.margin, width: 150 },
          { text: ar.reading, x: A4.margin + 150, width: 100, align: "center" },
          {
            text: this.passFailBadge(ar.result),
            x: A4.margin + 250,
            width: 60,
            align: "center",
            bold: true,
            color: resultColor,
          },
        ]);
      });

      y += 8;
    }

    if (rec.comments) {
      doc.fontSize(9).font(FONT.BOLD).text("Comments", A4.margin, y);
      y += 14;
      doc.fontSize(8).font(FONT.REGULAR).text(rec.comments, A4.margin, y);
      y += 16;
    }

    if (rec.finalApprovalName) {
      doc.fontSize(9).font(FONT.BOLD).text("Approval", A4.margin, y);
      y += 14;
      doc
        .fontSize(8)
        .font(FONT.REGULAR)
        .text(
          `Name: ${rec.finalApprovalName}  |  Date: ${rec.finalApprovalDate ?? "-"}`,
          A4.margin,
          y,
        );
    }
  }

  private renderTraceabilityMatrix(
    doc: PDFDoc,
    ctx: DataBookContext,
    tocEntries: TocEntry[],
  ): void {
    const traceabilityDoc: DocNumberEntry = {
      docNumber: "QD_PLS_17",
      title: "Traceability Matrix",
      edition: "01",
      revision: "00",
    };
    this.sectionHeader(doc, ctx, "Traceability Matrix", traceabilityDoc, tocEntries);

    const fieldKeys = [
      "paint_blast_profile",
      "paint_dft_primer",
      "paint_dft_intermediate",
      "paint_dft_final",
      "rubber_blast_profile",
      "rubber_shore_hardness",
    ];
    const fieldLabels = ["Blast (P)", "DFT Primer", "DFT Inter", "DFT Final", "Blast (R)", "Shore"];

    const lineItems = ctx.jobCard.lineItems || [];
    const assignmentMap = new Map<string, string>();
    ctx.batchAssignments.forEach((a) => {
      const key = `${a.lineItemId}-${a.fieldKey}`;
      assignmentMap.set(key, a.notApplicable ? "N/A" : a.batchNumber);
    });

    const colItemNo = { label: "Item #", x: A4.margin, width: 40, align: "center" as const };
    const colItemCode = {
      label: "Item Code",
      x: A4.margin + 40,
      width: 80,
      align: "left" as const,
    };
    const colDesc = {
      label: "Description",
      x: A4.margin + 120,
      width: 100,
      align: "left" as const,
    };

    const fieldColWidth = Math.min(60, Math.floor((A4.contentWidth - 220) / fieldKeys.length));
    const fieldCols = fieldKeys.map((_, idx) => ({
      label: fieldLabels[idx],
      x: A4.margin + 220 + idx * fieldColWidth,
      width: fieldColWidth,
      align: "center" as const,
    }));

    const allCols = [colItemNo, colItemCode, colDesc, ...fieldCols];

    doc.fontSize(8).font(FONT.REGULAR);
    doc.text(`Job Card: ${ctx.jobCard.jobNumber || ctx.jobCard.id}`, A4.margin, doc.y);
    doc.moveDown(0.5);

    let y = this.tableHeader(doc, allCols);

    lineItems.forEach((item: any, idx: number) => {
      if (y > 750) {
        doc.addPage();
        y = A4.margin + 20;
        y = this.tableHeader(doc, allCols);
      }

      const itemNo = item.itemNo || String(idx + 1);
      const itemCode = item.itemCode || "-";
      const desc = item.itemDescription || "-";
      const truncDesc = desc.length > 18 ? `${desc.substring(0, 16)}...` : desc;

      const batchCols = fieldKeys.map((fk, fIdx) => {
        const key = `${item.id}-${fk}`;
        const batch = assignmentMap.get(key) || "-";
        return {
          text: batch,
          x: fieldCols[fIdx].x,
          width: fieldColWidth,
          align: "center" as const,
          color: batch === "N/A" ? "#9ca3af" : "#000000",
        };
      });

      y = this.tableRow(doc, y, [
        { text: itemNo, x: colItemNo.x, width: colItemNo.width, align: "center" },
        { text: itemCode, x: colItemCode.x, width: colItemCode.width, align: "left" },
        { text: truncDesc, x: colDesc.x, width: colDesc.width, align: "left" },
        ...batchCols,
      ]);
    });
  }

  private renderTocPage(
    doc: PDFDoc,
    ctx: DataBookContext,
    tocPageIndex: number,
    tocEntries: TocEntry[],
  ): void {
    doc.switchToPage(tocPageIndex);
    const brandColor = ctx.company?.primaryColor ?? "#0d9488";

    let y = A4.margin;

    if (ctx.company?.name) {
      doc
        .fontSize(10)
        .font(FONT.BOLD)
        .fillColor("#000000")
        .text(ctx.company.name, A4.margin, y, { width: A4.contentWidth / 2 });
    }

    doc
      .fontSize(7)
      .font(FONT.REGULAR)
      .fillColor("#6b7280")
      .text(
        `Doc: ${DOC_NUMBERS.toc.docNumber}  |  Ed: ${DOC_NUMBERS.toc.edition} Rev: ${DOC_NUMBERS.toc.revision}`,
        A4.margin,
        y + 2,
        { align: "right", width: A4.contentWidth },
      );

    doc.rect(A4.margin, y + 16, A4.contentWidth, 2).fill(brandColor);

    doc
      .fontSize(16)
      .font(FONT.BOLD)
      .fillColor("#111827")
      .text("Table of Contents", A4.margin, y + 26, { align: "center", width: A4.contentWidth });

    doc
      .moveTo(A4.margin, y + 48)
      .lineTo(A4.margin + A4.contentWidth, y + 48)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);

    y = A4.margin + 60;

    const totalPages = doc.bufferedPageRange().count;

    const cols = [
      { label: "#", x: A4.margin, width: 25 },
      { label: "Document No.", x: A4.margin + 25, width: 85 },
      { label: "Title", x: A4.margin + 110, width: 240 },
      { label: "Ed.", x: A4.margin + 350, width: 30 },
      { label: "Rev.", x: A4.margin + 380, width: 30 },
      { label: "Page", x: A4.margin + 410, width: 50 },
    ];

    doc.rect(A4.margin, y - 2, A4.contentWidth, 14).fill("#f3f4f6");
    doc.fillColor("#000000").fontSize(7).font(FONT.BOLD);

    cols.forEach((col) => {
      doc.text(col.label, col.x, y, { width: col.width, align: "left" });
    });

    y += 16;

    doc.fontSize(7).font(FONT.REGULAR).fillColor("#000000");

    tocEntries.forEach((entry, idx) => {
      const pageNum = entry.pageIndex + 1;

      doc.font(FONT.REGULAR).fillColor("#000000");
      doc.text(String(idx + 1), cols[0].x, y, { width: cols[0].width });
      doc.font(FONT.BOLD).fillColor(brandColor);
      doc.text(entry.docNumber, cols[1].x, y, { width: cols[1].width });
      doc.font(FONT.REGULAR).fillColor("#000000");
      doc.text(entry.title, cols[2].x, y, { width: cols[2].width });
      doc.text(entry.edition, cols[3].x, y, { width: cols[3].width });
      doc.text(entry.revision, cols[4].x, y, { width: cols[4].width });
      doc.text(String(pageNum), cols[5].x, y, { width: cols[5].width });

      y += 14;
    });

    y += 10;
    doc
      .moveTo(A4.margin, y)
      .lineTo(A4.margin + A4.contentWidth, y)
      .lineWidth(0.5)
      .stroke("#d1d5db");
    doc.lineWidth(1);

    y += 8;
    doc.fontSize(7).font(FONT.REGULAR).fillColor("#6b7280");
    doc.text(`Total sections: ${tocEntries.length}  |  Total pages: ${totalPages}`, A4.margin, y, {
      align: "center",
      width: A4.contentWidth,
    });
    doc.text(`Generated: ${now().toFormat("dd MMM yyyy HH:mm")}`, A4.margin, y + 10, {
      align: "center",
      width: A4.contentWidth,
    });
    doc.fillColor("#000000");
  }

  private renderPageFooters(doc: PDFDoc, ctx: DataBookContext, layoutOverride?: PageLayout): void {
    renderFooter(doc, {
      companyName: ctx.company?.name ?? "PLS",
      brandColor: ctx.company?.primaryColor ?? "#0d9488",
      extraCenterText: `Job: ${ctx.jobCard.jobNumber || ctx.jobCard.id}`,
      marginX: layoutOverride?.margin,
      pageWidth: layoutOverride?.pageWidth,
      pageHeight: layoutOverride?.pageHeight,
    });
  }
}
