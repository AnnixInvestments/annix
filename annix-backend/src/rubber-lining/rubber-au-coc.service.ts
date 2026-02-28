import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import { In, Repository } from "typeorm";
import { formatDateLongZA, generateUniqueId, now } from "../lib/datetime";
import {
  CreateAuCocDto,
  RubberAuCocDto,
  RubberAuCocItemDto,
  SendAuCocDto,
} from "./dto/rubber-coc.dto";
import { AuCocStatus, RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem, TestDataSummary } from "./entities/rubber-au-coc-item.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";

const AU_COC_STATUS_LABELS: Record<AuCocStatus, string> = {
  [AuCocStatus.DRAFT]: "Draft",
  [AuCocStatus.GENERATED]: "Generated",
  [AuCocStatus.SENT]: "Sent",
};

@Injectable()
export class RubberAuCocService {
  private readonly logger = new Logger(RubberAuCocService.name);

  constructor(
    @InjectRepository(RubberAuCoc)
    private auCocRepository: Repository<RubberAuCoc>,
    @InjectRepository(RubberAuCocItem)
    private auCocItemRepository: Repository<RubberAuCocItem>,
    @InjectRepository(RubberRollStock)
    private rollStockRepository: Repository<RubberRollStock>,
    @InjectRepository(RubberCompoundBatch)
    private compoundBatchRepository: Repository<RubberCompoundBatch>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    private readonly configService: ConfigService,
  ) {}

  async allAuCocs(filters?: {
    status?: AuCocStatus;
    customerCompanyId?: number;
  }): Promise<RubberAuCocDto[]> {
    const query = this.auCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.customerCompany", "customer")
      .orderBy("coc.created_at", "DESC");

    if (filters?.status) {
      query.andWhere("coc.status = :status", { status: filters.status });
    }
    if (filters?.customerCompanyId) {
      query.andWhere("coc.customer_company_id = :companyId", {
        companyId: filters.customerCompanyId,
      });
    }

    const cocs = await query.getMany();
    return cocs.map((coc) => this.mapAuCocToDto(coc));
  }

  async auCocById(id: number): Promise<RubberAuCocDto | null> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
      relations: ["customerCompany"],
    });
    if (!coc) return null;

    const items = await this.auCocItemRepository.find({
      where: { auCocId: id },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });

    const dto = this.mapAuCocToDto(coc);
    dto.items = items.map((item) => this.mapAuCocItemToDto(item));
    return dto;
  }

  async createAuCoc(dto: CreateAuCocDto, createdBy?: string): Promise<RubberAuCocDto> {
    const customer = await this.companyRepository.findOne({
      where: { id: dto.customerCompanyId },
    });
    if (!customer) {
      throw new BadRequestException("Customer company not found");
    }

    const rolls = await this.rollStockRepository.find({
      where: { id: In(dto.rollIds) },
      relations: ["compoundCoding"],
    });

    if (rolls.length !== dto.rollIds.length) {
      throw new BadRequestException("Some roll IDs not found");
    }

    const unavailableRolls = rolls.filter(
      (r) => r.status !== RollStockStatus.IN_STOCK && r.status !== RollStockStatus.RESERVED,
    );
    if (unavailableRolls.length > 0) {
      throw new BadRequestException(
        `Rolls not available: ${unavailableRolls.map((r) => r.rollNumber).join(", ")}`,
      );
    }

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId: dto.customerCompanyId,
      poNumber: dto.poNumber ?? null,
      deliveryNoteRef: dto.deliveryNoteRef ?? null,
      status: AuCocStatus.DRAFT,
      notes: dto.notes ?? null,
      createdBy: createdBy ?? null,
    });

    const savedCoc = await this.auCocRepository.save(auCoc);

    const items = await Promise.all(
      rolls.map(async (roll) => {
        const testDataSummary = await this.aggregateTestData(roll.linkedBatchIds);
        return this.auCocItemRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          auCocId: savedCoc.id,
          rollStockId: roll.id,
          testDataSummary,
        });
      }),
    );

    await this.auCocItemRepository.save(items);

    await this.rollStockRepository.update({ id: In(dto.rollIds) }, { auCocId: savedCoc.id });

    const result = await this.auCocRepository.findOne({
      where: { id: savedCoc.id },
      relations: ["customerCompany"],
    });

    const savedItems = await this.auCocItemRepository.find({
      where: { auCocId: savedCoc.id },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });

    const cocDto = this.mapAuCocToDto(result!);
    cocDto.items = savedItems.map((item) => this.mapAuCocItemToDto(item));
    return cocDto;
  }

  async generatePdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
      relations: ["customerCompany"],
    });
    if (!coc) {
      throw new BadRequestException("AU CoC not found");
    }

    const items = await this.auCocItemRepository.find({
      where: { auCocId: id },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });

    const buffer = await this.createPdf(coc, items);
    const filename = `${coc.cocNumber}.pdf`;

    coc.status = AuCocStatus.GENERATED;
    coc.generatedPdfPath = `au-cocs/${filename}`;
    await this.auCocRepository.save(coc);

    return { buffer, filename };
  }

  async sendToCustomer(id: number, dto: SendAuCocDto): Promise<RubberAuCocDto> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
      relations: ["customerCompany"],
    });
    if (!coc) {
      throw new BadRequestException("AU CoC not found");
    }

    coc.sentToEmail = dto.email;
    coc.sentAt = now().toJSDate();
    coc.status = AuCocStatus.SENT;
    await this.auCocRepository.save(coc);

    this.logger.log(`AU CoC ${coc.cocNumber} marked as sent to ${dto.email}`);

    return this.mapAuCocToDto(coc);
  }

  async deleteAuCoc(id: number): Promise<boolean> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
    });
    if (!coc) return false;

    if (coc.status === AuCocStatus.SENT) {
      throw new BadRequestException("Sent CoCs cannot be deleted");
    }

    await this.rollStockRepository.update({ auCocId: id }, { auCocId: null });

    await this.auCocItemRepository.delete({ auCocId: id });
    const result = await this.auCocRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  private async generateCocNumber(): Promise<string> {
    const result = await this.auCocRepository.query(
      `SELECT nextval('rubber_au_coc_number_seq') as seq`,
    );
    const seq = result[0]?.seq || 1;
    return `AU-COC-${String(seq).padStart(5, "0")}`;
  }

  private async aggregateTestData(batchIds: number[]): Promise<TestDataSummary | null> {
    if (!batchIds || batchIds.length === 0) {
      return null;
    }

    const batches = await this.compoundBatchRepository.find({
      where: { id: In(batchIds) },
    });

    if (batches.length === 0) {
      return null;
    }

    const aggregate = (field: keyof RubberCompoundBatch) => {
      const values = batches
        .map((b) => b[field])
        .filter((v): v is number => v !== null && v !== undefined)
        .map((v) => Number(v));
      if (values.length === 0) return undefined;
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
      };
    };

    const allPassed = batches.every(
      (b) => b.passFailStatus === "PASS" || b.passFailStatus === null,
    );

    return {
      batchNumbers: batches.map((b) => b.batchNumber),
      shoreAHardness: aggregate("shoreAHardness"),
      specificGravity: aggregate("specificGravity"),
      reboundPercent: aggregate("reboundPercent"),
      tearStrengthKnM: aggregate("tearStrengthKnM"),
      tensileStrengthMpa: aggregate("tensileStrengthMpa"),
      elongationPercent: aggregate("elongationPercent"),
      rheometerSMin: aggregate("rheometerSMin"),
      rheometerSMax: aggregate("rheometerSMax"),
      rheometerTs2: aggregate("rheometerTs2"),
      rheometerTc90: aggregate("rheometerTc90"),
      allBatchesPassed: allPassed,
    };
  }

  private async createPdf(coc: RubberAuCoc, items: RubberAuCocItem[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.drawCocHeader(doc, coc);
      this.drawCustomerDetails(doc, coc);
      let currentY = this.drawRollsTable(doc, items, 200);
      currentY = this.drawTestDataTable(doc, items, currentY + 20);
      this.drawCocFooter(doc, coc);

      doc.end();
    });
  }

  private drawCocHeader(doc: typeof PDFDocument, coc: RubberAuCoc): void {
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("AU INDUSTRIES", 50, 50, { align: "left" })
      .fontSize(12)
      .font("Helvetica")
      .text("CERTIFICATE OF CONFORMANCE", 50, 75, { align: "left" });

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(coc.cocNumber, 400, 50, { align: "right" })
      .fontSize(10)
      .font("Helvetica")
      .text(`Date: ${formatDateLongZA(now().toJSDate())}`, 400, 70, { align: "right" });

    doc.moveTo(50, 95).lineTo(545, 95).stroke();
  }

  private drawCustomerDetails(doc: typeof PDFDocument, coc: RubberAuCoc): void {
    let y = 110;

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Customer:", 50, y);
    doc.font("Helvetica").text(coc.customerCompany?.name || "-", 120, y);

    y += 15;
    if (coc.poNumber) {
      doc.font("Helvetica-Bold").text("PO Number:", 50, y);
      doc.font("Helvetica").text(coc.poNumber, 120, y);
      y += 15;
    }

    if (coc.deliveryNoteRef) {
      doc.font("Helvetica-Bold").text("Delivery Note:", 50, y);
      doc.font("Helvetica").text(coc.deliveryNoteRef, 120, y);
    }

    doc.moveTo(50, 180).lineTo(545, 180).stroke();
  }

  private drawRollsTable(
    doc: typeof PDFDocument,
    items: RubberAuCocItem[],
    startY: number,
  ): number {
    doc.fontSize(12).font("Helvetica-Bold").text("Roll Details", 50, startY);

    let y = startY + 20;
    const headers = ["Roll Number", "Compound", "Weight (kg)", "Dimensions"];
    const colWidths = [120, 150, 80, 145];
    let x = 50;

    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;

    doc.font("Helvetica").fontSize(9);
    items.forEach((item) => {
      x = 50;
      const roll = item.rollStock;
      const dimensions = roll
        ? [
            roll.widthMm ? `${Number(roll.widthMm)}mm W` : null,
            roll.thicknessMm ? `${Number(roll.thicknessMm)}mm T` : null,
            roll.lengthM ? `${Number(roll.lengthM)}m L` : null,
          ]
            .filter(Boolean)
            .join(" x ")
        : "-";

      doc.text(roll?.rollNumber || "-", x, y, { width: colWidths[0] });
      x += colWidths[0];
      doc.text(roll?.compoundCoding?.name || "-", x, y, { width: colWidths[1] });
      x += colWidths[1];
      doc.text(roll ? String(Number(roll.weightKg).toFixed(1)) : "-", x, y, {
        width: colWidths[2],
      });
      x += colWidths[2];
      doc.text(dimensions, x, y, { width: colWidths[3] });
      y += 15;
    });

    return y;
  }

  private drawTestDataTable(
    doc: typeof PDFDocument,
    items: RubberAuCocItem[],
    startY: number,
  ): number {
    const allTestData = items
      .map((item) => item.testDataSummary)
      .filter((data): data is TestDataSummary => data !== null);

    if (allTestData.length === 0) {
      return startY;
    }

    if (startY > 650) {
      doc.addPage();
      startY = 50;
    }

    doc.fontSize(12).font("Helvetica-Bold").text("Test Data Summary", 50, startY);

    let y = startY + 20;
    const testProperties = [
      { key: "shoreAHardness", label: "Shore A Hardness", unit: "" },
      { key: "specificGravity", label: "Specific Gravity", unit: "" },
      { key: "tensileStrengthMpa", label: "Tensile Strength", unit: "MPa" },
      { key: "elongationPercent", label: "Elongation", unit: "%" },
      { key: "tearStrengthKnM", label: "Tear Strength", unit: "kN/m" },
      { key: "reboundPercent", label: "Rebound", unit: "%" },
    ];

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Property", 50, y, { width: 120 });
    doc.text("Min", 170, y, { width: 60, align: "right" });
    doc.text("Max", 240, y, { width: 60, align: "right" });
    doc.text("Avg", 310, y, { width: 60, align: "right" });
    doc.text("Unit", 380, y, { width: 50 });

    y += 15;
    doc.moveTo(50, y).lineTo(430, y).stroke();
    y += 5;

    doc.font("Helvetica");
    testProperties.forEach((prop) => {
      const values = allTestData
        .map((data) => data[prop.key as keyof TestDataSummary])
        .filter(
          (v): v is { min: number; max: number; avg: number } =>
            v !== undefined && typeof v === "object",
        );

      if (values.length > 0) {
        const mins = values.map((v) => v.min);
        const maxs = values.map((v) => v.max);
        const avgs = values.map((v) => v.avg);

        doc.text(prop.label, 50, y, { width: 120 });
        doc.text(Math.min(...mins).toFixed(1), 170, y, { width: 60, align: "right" });
        doc.text(Math.max(...maxs).toFixed(1), 240, y, { width: 60, align: "right" });
        doc.text((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1), 310, y, {
          width: 60,
          align: "right",
        });
        doc.text(prop.unit, 380, y, { width: 50 });
        y += 15;
      }
    });

    const allBatchNumbers = allTestData.flatMap((data) => data.batchNumbers);
    const uniqueBatchNumbers = [...new Set(allBatchNumbers)];

    if (uniqueBatchNumbers.length > 0) {
      y += 10;
      doc.font("Helvetica-Bold").text("Batch Numbers:", 50, y);
      doc.font("Helvetica").text(uniqueBatchNumbers.join(", "), 140, y, { width: 400 });
      y += 15;
    }

    const allPassed = allTestData.every((data) => data.allBatchesPassed);
    y += 10;
    doc.font("Helvetica-Bold").text("Test Result:", 50, y);
    doc
      .font("Helvetica")
      .fillColor(allPassed ? "green" : "red")
      .text(allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED", 140, y)
      .fillColor("black");

    return y + 20;
  }

  private drawCocFooter(doc: typeof PDFDocument, coc: RubberAuCoc): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 120;

    doc.moveTo(50, footerY).lineTo(545, footerY).stroke();

    doc.fontSize(10).font("Helvetica");
    doc.text(
      "This Certificate of Conformance certifies that the above materials comply with the specified requirements.",
      50,
      footerY + 10,
      { width: 495, align: "center" },
    );

    doc.text("Authorized Signature:", 50, footerY + 50);
    doc
      .moveTo(160, footerY + 60)
      .lineTo(300, footerY + 60)
      .stroke();

    doc.text("Date:", 350, footerY + 50);
    doc
      .moveTo(380, footerY + 60)
      .lineTo(480, footerY + 60)
      .stroke();

    doc
      .fontSize(8)
      .fillColor("gray")
      .text("AU Industries - Certificate of Conformance", 50, pageHeight - 40, {
        align: "center",
        width: 495,
      })
      .fillColor("black");
  }

  private mapAuCocToDto(coc: RubberAuCoc): RubberAuCocDto {
    return {
      id: coc.id,
      firebaseUid: coc.firebaseUid,
      cocNumber: coc.cocNumber,
      customerCompanyId: coc.customerCompanyId,
      customerCompanyName: coc.customerCompany?.name ?? null,
      poNumber: coc.poNumber,
      deliveryNoteRef: coc.deliveryNoteRef,
      status: coc.status,
      statusLabel: AU_COC_STATUS_LABELS[coc.status],
      generatedPdfPath: coc.generatedPdfPath,
      sentToEmail: coc.sentToEmail,
      sentAt: coc.sentAt?.toISOString() ?? null,
      createdBy: coc.createdBy,
      notes: coc.notes,
      createdAt: coc.createdAt.toISOString(),
      updatedAt: coc.updatedAt.toISOString(),
    };
  }

  private mapAuCocItemToDto(item: RubberAuCocItem): RubberAuCocItemDto {
    return {
      id: item.id,
      firebaseUid: item.firebaseUid,
      auCocId: item.auCocId,
      rollStockId: item.rollStockId,
      rollNumber: item.rollStock?.rollNumber ?? null,
      testDataSummary: item.testDataSummary,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
