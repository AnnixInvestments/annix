import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import PDFDocument from "pdfkit";
import { In, Repository } from "typeorm";
import { formatDateZA, generateUniqueId, now } from "../lib/datetime";
import {
  CreateAuCocDto,
  RubberAuCocDto,
  RubberAuCocItemDto,
  SendAuCocDto,
} from "./dto/rubber-coc.dto";
import { AuCocStatus, RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";

const AU_COC_STATUS_LABELS: Record<AuCocStatus, string> = {
  [AuCocStatus.DRAFT]: "Draft",
  [AuCocStatus.GENERATED]: "Generated",
  [AuCocStatus.SENT]: "Sent",
};

interface BatchTestData {
  batchNumber: string;
  shoreA: number | null;
  density: number | null;
  rebound: number | null;
  tearStrength: number | null;
  tensile: number | null;
  elongation: number | null;
}

interface CocPdfData {
  coc: RubberAuCoc;
  compoundCode: string;
  compoundDescription: string;
  productionDate: string;
  rollSizesQty: string;
  batches: BatchTestData[];
  rollNumber: string;
  qualityConfig: RubberCompoundQualityConfig | null;
}

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
    @InjectRepository(RubberCompoundQualityConfig)
    private qualityConfigRepository: Repository<RubberCompoundQualityConfig>,
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
    try {
      this.logger.debug(`Fetching AU CoC with id: ${id}`);
      const coc = await this.auCocRepository.findOne({
        where: { id },
        relations: ["customerCompany"],
      });
      if (!coc) return null;

      this.logger.debug(`Found AU CoC: ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.find({
        where: { auCocId: id },
        relations: ["rollStock", "rollStock.compoundCoding"],
      });

      this.logger.debug(`Found ${items.length} items, mapping to DTO...`);
      const dto = this.mapAuCocToDto(coc);
      dto.items = items.map((item) => this.mapAuCocItemToDto(item));
      return dto;
    } catch (error) {
      this.logger.error(`Error fetching AU CoC ${id}:`, error);
      throw error;
    }
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
      approvedByName: dto.approvedByName ?? null,
    });

    const savedCoc = await this.auCocRepository.save(auCoc);

    const items = rolls.map((roll) =>
      this.auCocItemRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        auCocId: savedCoc.id,
        rollStockId: roll.id,
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
    try {
      this.logger.debug(`Generating PDF for AU CoC ${id}...`);
      const coc = await this.auCocRepository.findOne({
        where: { id },
        relations: ["customerCompany"],
      });
      if (!coc) {
        throw new BadRequestException("AU CoC not found");
      }

      this.logger.debug(`Found CoC ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.find({
        where: { auCocId: id },
        relations: ["rollStock", "rollStock.compoundCoding"],
      });

      if (items.length === 0) {
        throw new BadRequestException("No rolls found for this CoC");
      }

      this.logger.debug(`Found ${items.length} items, preparing PDF data...`);
      const pdfData = await this.preparePdfData(coc, items);
      this.logger.debug("PDF data prepared, creating PDF...");
      const buffer = await this.createPdf(pdfData);
      const filename = `${coc.cocNumber}.pdf`;

      this.logger.debug(`PDF created (${buffer.length} bytes), updating status...`);
      coc.status = AuCocStatus.GENERATED;
      coc.generatedPdfPath = `au-cocs/${filename}`;
      await this.auCocRepository.save(coc);

      this.logger.log(`PDF generated for AU CoC ${coc.cocNumber}`);
      return { buffer, filename };
    } catch (error) {
      this.logger.error(`Error generating PDF for AU CoC ${id}:`, error);
      throw error;
    }
  }

  async pdfBuffer(id: number): Promise<{ buffer: Buffer; filename: string }> {
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

    if (items.length === 0) {
      throw new BadRequestException("No rolls found for this CoC");
    }

    const pdfData = await this.preparePdfData(coc, items);
    const buffer = await this.createPdf(pdfData);
    const filename = `${coc.cocNumber}.pdf`;

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
    return `COC-${String(seq).padStart(5, "0")}`;
  }

  private async preparePdfData(coc: RubberAuCoc, items: RubberAuCocItem[]): Promise<CocPdfData> {
    const firstRoll = items[0]?.rollStock;
    const compoundCoding = firstRoll?.compoundCoding;

    const allBatchIds = items.flatMap((item) => item.rollStock?.linkedBatchIds || []);
    const uniqueBatchIds = [...new Set(allBatchIds)];

    const batches =
      uniqueBatchIds.length > 0
        ? await this.compoundBatchRepository.find({
            where: { id: In(uniqueBatchIds) },
            relations: ["supplierCoc"],
            order: { batchNumber: "ASC" },
          })
        : [];

    const compoundCode = batches[0]?.supplierCoc?.compoundCode || compoundCoding?.code || "Unknown";

    let qualityConfig: RubberCompoundQualityConfig | null = null;
    if (compoundCode) {
      qualityConfig = await this.qualityConfigRepository.findOne({
        where: { compoundCode },
      });
    }

    const rollDimensions = firstRoll
      ? `${Number(firstRoll.thicknessMm)}mm x ${Number(firstRoll.widthMm)}mm x ${Number(firstRoll.lengthM)}m`
      : "-";
    const rollSizesQty = `${rollDimensions} ${items.length} roll${items.length !== 1 ? "s" : ""}`;

    const rollNumber = firstRoll?.rollNumber || "-";

    const batchTestData: BatchTestData[] = batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      shoreA: batch.shoreAHardness ? Number(batch.shoreAHardness) : null,
      density: batch.specificGravity ? Number(batch.specificGravity) : null,
      rebound: batch.reboundPercent ? Number(batch.reboundPercent) : null,
      tearStrength: batch.tearStrengthKnM ? Number(batch.tearStrengthKnM) : null,
      tensile: batch.tensileStrengthMpa ? Number(batch.tensileStrengthMpa) : null,
      elongation: batch.elongationPercent ? Number(batch.elongationPercent) : null,
    }));

    const compoundDescription =
      qualityConfig?.compoundDescription || compoundCoding?.name || "Rubber Compound";

    const productionDate = firstRoll?.productionDate
      ? formatDateZA(firstRoll.productionDate)
      : formatDateZA(now().toJSDate());

    return {
      coc,
      compoundCode,
      compoundDescription,
      productionDate,
      rollSizesQty,
      batches: batchTestData,
      rollNumber,
      qualityConfig,
    };
  }

  private async createPdf(data: CocPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.drawHeader(doc);
      this.drawDetailsSection(doc, data);
      this.drawLabDataTable(doc, data);
      this.drawComments(doc);
      this.drawFooter(doc, data);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument): void {
    const headerPath = path.join(__dirname, "..", "..", "assets", "au-header.jpg");
    this.logger.debug(`Header image path: ${headerPath}`);
    this.logger.debug(`Header file exists: ${fs.existsSync(headerPath)}`);

    if (fs.existsSync(headerPath)) {
      doc.image(headerPath, 40, 30, { width: 515 });
    } else {
      this.logger.warn(`Header image not found at: ${headerPath}`);
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#D4A537")
        .text("AU", 270, 40)
        .fillColor("black");
      doc.fontSize(8).font("Helvetica").text("INDUSTRIES", 270, 55, { align: "center" });
    }

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("CERTIFICATE OF CONFORMANCE", 40, 140, { align: "center", width: 515 });

    doc.moveTo(40, 165).lineTo(555, 165).lineWidth(0.5).stroke();
  }

  private drawDetailsSection(doc: PDFKit.PDFDocument, data: CocPdfData): void {
    const leftCol = 40;
    const rightCol = 250;
    let y = 180;
    const lineHeight = 16;

    doc.fontSize(9).font("Helvetica");

    const details = [
      { label: "COMPOUND CODE", value: data.compoundCode },
      { label: "CALENDER ROLL DESCRIPTION", value: data.compoundDescription },
      { label: "PRODUCTION DATE OF CALENDER ROLLS", value: data.productionDate },
      { label: "PURCHASE ORDER NUMBER", value: data.coc.poNumber || "-" },
      { label: "DELIVERY NOTE", value: data.coc.deliveryNoteRef || "-" },
      { label: "ROLL SIZES & QTY", value: data.rollSizesQty },
    ];

    details.forEach((detail) => {
      doc.font("Helvetica").text(detail.label, leftCol, y);
      doc.font("Helvetica-Bold").text(detail.value, rightCol, y);
      y += lineHeight;
    });

    y += 5;
    doc.font("Helvetica-Bold").text("LABORATORY ANALYSIS DATA", leftCol, y);
  }

  private drawLabDataTable(doc: PDFKit.PDFDocument, data: CocPdfData): void {
    const tableTop = 295;
    const colWidths = [85, 55, 55, 55, 55, 65, 65, 65];
    const colStarts = [40];
    colWidths.forEach((w, i) => {
      if (i > 0) colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
    });

    const headers = [
      "Compound\nDetails",
      "Batches\nUsed",
      "Shore A\nlast\ntestpoint",
      "Density",
      "Rebound",
      "Tear\nStrength",
      "Tensile\nstrength",
      "Elongation\nbreak",
    ];

    let y = tableTop;

    doc.rect(40, y, 515, 35).fillAndStroke("#f5f5f5", "#cccccc");

    doc.fillColor("black").fontSize(7).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, colStarts[i] + 2, y + 3, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 35;

    const units = ["Unit", "", "[Shore A]", "[g/cm³]", "[%]", "[N/mm]", "[Mpa]", "[%]"];
    doc.rect(40, y, 515, 15).fillAndStroke("#ffffff", "#cccccc");
    doc.fillColor("black").fontSize(7).font("Helvetica");
    units.forEach((unit, i) => {
      doc.text(unit, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    const config = data.qualityConfig;
    const nominals = [
      "Nominal",
      "",
      config?.shoreANominal ? String(Number(config.shoreANominal)) : "-",
      config?.densityNominal ? Number(config.densityNominal).toFixed(3) : "-",
      config?.reboundNominal ? Number(config.reboundNominal).toFixed(2) : "-",
      config?.tearStrengthNominal ? Number(config.tearStrengthNominal).toFixed(1) : "-",
      config?.tensileNominal ? String(Number(config.tensileNominal)) : "-",
      config?.elongationNominal ? String(Number(config.elongationNominal)) : "-",
    ];

    doc.rect(40, y, 515, 15).fillAndStroke("#ffffff", "#cccccc");
    doc.fillColor("black").fontSize(7).font("Helvetica-Bold");
    nominals.forEach((val, i) => {
      doc.text(val, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    const formatRange = (min: number | null | undefined, max: number | null | undefined) => {
      if (min === null || min === undefined || max === null || max === undefined) return "-";
      return `${Number(min)}-${Number(max)}`;
    };

    const ranges = [
      "Ranges",
      "",
      formatRange(config?.shoreAMin, config?.shoreAMax),
      formatRange(config?.densityMin, config?.densityMax),
      formatRange(config?.reboundMin, config?.reboundMax),
      formatRange(config?.tearStrengthMin, config?.tearStrengthMax),
      formatRange(config?.tensileMin, config?.tensileMax),
      formatRange(config?.elongationMin, config?.elongationMax),
    ];

    doc.rect(40, y, 515, 15).fillAndStroke("#FFF9E6", "#cccccc");
    doc.fillColor("#B8860B").fontSize(7).font("Helvetica-Bold");
    ranges.forEach((val, i) => {
      doc.text(val, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    doc.fillColor("black").font("Helvetica").fontSize(7);

    const formatVal = (val: number | null, decimals = 1): string => {
      if (val === null || val === undefined) return "";
      return val.toFixed(decimals);
    };

    data.batches.forEach((batch, index) => {
      const isEven = index % 2 === 0;
      doc.rect(40, y, 515, 13).fillAndStroke(isEven ? "#ffffff" : "#f9f9f9", "#cccccc");
      doc.fillColor("black");

      const rowData = [
        index === 0 ? `Roll No. ${data.rollNumber}` : "",
        batch.batchNumber,
        batch.shoreA !== null ? String(Math.round(batch.shoreA)) : "",
        formatVal(batch.density, 3),
        formatVal(batch.rebound, 2),
        formatVal(batch.tearStrength, 2),
        formatVal(batch.tensile, 1),
        batch.elongation !== null ? String(Math.round(batch.elongation)) : "",
      ];

      rowData.forEach((val, i) => {
        doc.text(val, colStarts[i] + 2, y + 3, {
          width: colWidths[i] - 4,
          align: i === 0 ? "left" : "center",
        });
      });

      y += 13;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.rect(40, y, 515, 0).stroke("#cccccc");
  }

  private drawComments(doc: PDFKit.PDFDocument): void {
    const y = 680;

    doc.fontSize(8).font("Helvetica-Bold").fillColor("black").text("Comments:", 40, y);

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text(
        "This is to confirm that the compound listed above has been mixed using the specified materials, and used for calender production rolls.",
        40,
        y + 12,
        { width: 515, align: "center" },
      );
    doc.text("The rheology (cure rate) data meets the compound requirements.", 40, y + 24, {
      width: 515,
      align: "center",
    });
  }

  private drawFooter(doc: PDFKit.PDFDocument, data: CocPdfData): void {
    const y = 720;

    doc.fontSize(9).font("Helvetica").fillColor("black");

    doc.text("Approved By:", 40, y);
    doc.font("Helvetica-Bold").text(data.coc.approvedByName || "Ron Govender", 115, y);

    doc.font("Helvetica").text("Signed", 300, y);
    doc
      .moveTo(340, y + 10)
      .lineTo(430, y + 10)
      .lineWidth(0.5)
      .stroke();

    doc.text("Date:", 470, y);
    doc
      .font("Helvetica-Bold")
      .text(
        data.coc.approvedAt ? formatDateZA(data.coc.approvedAt) : formatDateZA(now().toJSDate()),
        500,
        y,
      );

    const footerPath = path.join(__dirname, "..", "..", "assets", "au-footer.jpg");
    this.logger.debug(`Footer image path: ${footerPath}`);
    this.logger.debug(`Footer file exists: ${fs.existsSync(footerPath)}`);

    if (fs.existsSync(footerPath)) {
      doc.image(footerPath, 40, y + 25, { width: 515 });
    } else {
      this.logger.warn(`Footer image not found at: ${footerPath}`);
      doc
        .moveTo(40, y + 25)
        .lineTo(555, y + 25)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor("#B8860B")
        .text(
          "AU Industries (Pty)Ltd Registration No. 2020/803314/07 - VAT number : 4650300389",
          40,
          y + 32,
          { align: "center", width: 515 },
        );
      doc.text(
        "50 Paul Smit Street, Dunswart, Boksburg, 1458  Tel: 072 039 8429  www.auind.co.za",
        40,
        y + 42,
        { align: "center", width: 515 },
      );
      doc.text("Directors: A. Barrett and S.Govender", 40, y + 52, {
        align: "center",
        width: 515,
      });
    }
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
      approvedByName: coc.approvedByName,
      approvedAt: coc.approvedAt?.toISOString() ?? null,
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
      createdAt: item.createdAt.toISOString(),
    };
  }
}
