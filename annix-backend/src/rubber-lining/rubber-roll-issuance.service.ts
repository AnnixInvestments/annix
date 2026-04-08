import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { generateUniqueId, now } from "../lib/datetime";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { JobCard } from "../stock-control/entities/job-card.entity";
import { JobCardLineItem } from "../stock-control/entities/job-card-line-item.entity";
import {
  type CreateRollFromPhotoDto,
  type CreateRollIssuanceDto,
  type JcLineItemDto,
  type JcSearchResultDto,
  type RollPhotoExtractionDto,
  type RollPhotoIdentifyResponse,
  type RubberRollIssuanceDto,
  type RubberRollIssuanceRollDto,
} from "./dto/rubber-roll-issuance.dto";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import {
  RollIssuanceStatus,
  RubberRollIssuance,
  RubberRollIssuanceItem,
  RubberRollIssuanceLineItem,
} from "./entities/rubber-roll-issuance.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";

const SUPPLIER_ALIASES: Record<string, string[]> = {
  Impilo: ["Polymer Liners", "Polymer Lining Systems", "Polymer Lining System"],
};

const RUBBER_DENSITY_KG_PER_M3 = 1150;

@Injectable()
export class RubberRollIssuanceService {
  private readonly logger = new Logger(RubberRollIssuanceService.name);

  constructor(
    @InjectRepository(RubberRollIssuance)
    private readonly issuanceRepo: Repository<RubberRollIssuance>,
    @InjectRepository(RubberRollIssuanceItem)
    private readonly issuanceItemRepo: Repository<RubberRollIssuanceItem>,
    @InjectRepository(RubberRollIssuanceLineItem)
    private readonly issuanceLineItemRepo: Repository<RubberRollIssuanceLineItem>,
    @InjectRepository(RubberRollStock)
    private readonly rollStockRepo: Repository<RubberRollStock>,
    @InjectRepository(RubberProductCoding)
    private readonly codingRepo: Repository<RubberProductCoding>,
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    private readonly aiChatService: AiChatService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async identifyRollFromPhoto(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/webp",
  ): Promise<RollPhotoIdentifyResponse> {
    const systemPrompt = `You are an expert at reading handwritten labels on rubber roll packaging. The labels are typically written with marker pen on yellow plastic wrapping.

You must extract the following details from the photo:
{
  "date": "the date written on the label (DD/MM/YYYY format)",
  "supplier": "the company name written on the label",
  "compoundCode": "the compound/product code (e.g. RSCA40, AUA40RSC, SNR etc)",
  "thicknessMm": number or null (thickness in mm - first number in dimensions like 8x950x12.5),
  "widthMm": number or null (width in mm - second number in dimensions),
  "lengthM": number or null (length in metres - third number in dimensions),
  "batchNumber": "the batch/ticket number (a numeric code, often 5 digits)",
  "weightKg": number or null (weight in kg),
  "confidence": 0.0-1.0,
  "analysis": "brief description of what you see"
}

Common dimension format: thickness x width x length (e.g. "8x950x12.5" means 8mm thick, 950mm wide, 12.5m long)
The weight is usually at the bottom, written as "XXX kg"
Batch numbers are typically 4-5 digit numbers

Be precise — do not guess characters you cannot read clearly.
Respond ONLY with valid JSON.`;

    const { content: response } = await this.aiChatService.chatWithImage(
      imageBase64,
      mediaType,
      "Please read the handwritten label on this rubber roll and extract all details.",
      systemPrompt,
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed: Record<string, unknown> = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const extraction: RollPhotoExtractionDto = {
      date: (parsed.date as string) || null,
      supplier: (parsed.supplier as string) || null,
      compoundCode: (parsed.compoundCode as string) || null,
      thicknessMm: (parsed.thicknessMm as number) || null,
      widthMm: (parsed.widthMm as number) || null,
      lengthM: (parsed.lengthM as number) || null,
      batchNumber: (parsed.batchNumber as string) || null,
      weightKg: (parsed.weightKg as number) || null,
      confidence: (parsed.confidence as number) || 0,
      analysis: (parsed.analysis as string) || "",
    };

    const supplierResolved = this.resolveSupplierAlias(extraction.supplier);

    const matchedRoll = await this.matchRollFromExtraction(extraction);

    return { extraction, matchedRoll, supplierResolved };
  }

  private resolveSupplierAlias(supplierName: string | null): string | null {
    if (!supplierName) return null;
    const normalized = supplierName.trim().toLowerCase();

    for (const [canonical, aliases] of Object.entries(SUPPLIER_ALIASES)) {
      const isAlias = aliases.some((alias) => normalized.includes(alias.toLowerCase()));
      if (isAlias) return canonical;
    }

    return supplierName;
  }

  private async matchRollFromExtraction(
    extraction: RollPhotoExtractionDto,
  ): Promise<RubberRollIssuanceRollDto | null> {
    if (extraction.batchNumber) {
      const byBatch = await this.rollStockRepo.findOne({
        where: { rollNumber: extraction.batchNumber },
        relations: ["compoundCoding"],
      });
      if (byBatch) return this.mapRollToDto(byBatch);

      const byBatchLike = await this.rollStockRepo.findOne({
        where: { rollNumber: ILike(`%${extraction.batchNumber}%`) },
        relations: ["compoundCoding"],
      });
      if (byBatchLike) return this.mapRollToDto(byBatchLike);
    }

    if (extraction.weightKg && extraction.compoundCode) {
      const coding = await this.codingRepo.findOne({
        where: { code: ILike(`%${extraction.compoundCode}%`) },
      });
      if (coding) {
        const byAttributes = await this.rollStockRepo.findOne({
          where: {
            compoundCodingId: coding.id,
            weightKg: extraction.weightKg,
            status: RollStockStatus.IN_STOCK,
          },
          relations: ["compoundCoding"],
        });
        if (byAttributes) return this.mapRollToDto(byAttributes);
      }
    }

    return null;
  }

  async createRollFromPhoto(dto: CreateRollFromPhotoDto): Promise<RubberRollIssuanceRollDto> {
    const existing = await this.rollStockRepo.findOne({
      where: { rollNumber: dto.rollNumber },
      relations: ["compoundCoding"],
    });
    if (existing) return this.mapRollToDto(existing);

    let compoundCodingId: number | null = null;
    if (dto.compoundCode) {
      const coding = await this.codingRepo.findOne({
        where: { code: ILike(`%${dto.compoundCode}%`) },
      });
      if (coding) {
        compoundCodingId = coding.id;
      }
    }

    const roll = this.rollStockRepo.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      rollNumber: dto.rollNumber,
      compoundCodingId,
      weightKg: dto.weightKg,
      widthMm: dto.widthMm ?? null,
      thicknessMm: dto.thicknessMm ?? null,
      lengthM: dto.lengthM ?? null,
      status: RollStockStatus.IN_STOCK,
      linkedBatchIds: [],
      notes: "Auto-created from photo identification",
    });

    const saved = await this.rollStockRepo.save(roll);
    const result = await this.rollStockRepo.findOne({
      where: { id: saved.id },
      relations: ["compoundCoding"],
    });

    this.logger.log(`Created roll ${dto.rollNumber} from photo (weight: ${dto.weightKg} kg)`);
    return this.mapRollToDto(result!);
  }

  async searchJobCards(query: string): Promise<JcSearchResultDto[]> {
    const scCompanyIds = [1, 3, 4];
    const results = await this.jobCardRepo.find({
      where: [
        { companyId: In(scCompanyIds), jcNumber: ILike(`%${query}%`) },
        { companyId: In(scCompanyIds), jobNumber: ILike(`%${query}%`) },
        { companyId: In(scCompanyIds), jobName: ILike(`%${query}%`) },
      ],
      order: { createdAt: "DESC" },
      take: 20,
    });

    return results.map((jc) => ({
      id: jc.id,
      jcNumber: jc.jcNumber,
      jobNumber: jc.jobNumber,
      jobName: jc.jobName,
      customerName: jc.customerName,
      status: jc.status,
    }));
  }

  async jobCardLineItems(jobCardId: number): Promise<JcLineItemDto[]> {
    const items = await this.lineItemRepo.find({
      where: { jobCardId },
      order: { sortOrder: "ASC" },
    });

    return items.map((li) => ({
      id: li.id,
      itemNo: li.itemNo,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      quantity: li.quantity ? Number(li.quantity) : null,
      m2: li.m2 ? Number(li.m2) : null,
    }));
  }

  async createIssuance(dto: CreateRollIssuanceDto): Promise<RubberRollIssuanceDto> {
    const roll = await this.rollStockRepo.findOne({
      where: { id: dto.rollStockId },
      relations: ["compoundCoding"],
    });
    if (!roll) {
      throw new BadRequestException("Roll not found");
    }

    if (dto.jobCards.length === 0) {
      throw new BadRequestException("At least one job card must be selected");
    }

    const allLineItems = dto.jobCards.flatMap((jc) => jc.lineItems);
    const thicknessMm = roll.thicknessMm ? Number(roll.thicknessMm) : null;

    const totalEstimatedUsageKg = allLineItems.reduce((sum, li) => {
      if (li.m2 && thicknessMm) {
        const volumeM3 = Number(li.m2) * (thicknessMm / 1000);
        return sum + volumeM3 * RUBBER_DENSITY_KG_PER_M3;
      }
      return sum;
    }, 0);

    const rollWeight = Number(roll.weightKg);
    const expectedReturn = totalEstimatedUsageKg > 0 ? rollWeight - totalEstimatedUsageKg : null;

    const issuance = this.issuanceRepo.create({
      rollStockId: dto.rollStockId,
      issuedBy: dto.issuedBy,
      issuedAt: now().toJSDate(),
      rollWeightAtIssueKg: rollWeight,
      totalEstimatedUsageKg:
        totalEstimatedUsageKg > 0 ? Math.round(totalEstimatedUsageKg * 1000) / 1000 : null,
      expectedReturnKg: expectedReturn !== null ? Math.round(expectedReturn * 1000) / 1000 : null,
      photoPath: dto.photoPath ?? null,
      notes: dto.notes ?? null,
      status: RollIssuanceStatus.ACTIVE,
    });

    const savedIssuance = await this.issuanceRepo.save(issuance);

    for (const jcDto of dto.jobCards) {
      const item = this.issuanceItemRepo.create({
        issuanceId: savedIssuance.id,
        jobCardId: jcDto.jobCardId,
        jcNumber: jcDto.jcNumber,
        jobName: jcDto.jobName ?? null,
      });
      const savedItem = await this.issuanceItemRepo.save(item);

      const lineItemEntities = jcDto.lineItems.map((li) => {
        const m2Val = li.m2 ? Number(li.m2) : null;
        let estimatedWeightKg: number | null = null;
        if (m2Val && thicknessMm) {
          const volumeM3 = m2Val * (thicknessMm / 1000);
          estimatedWeightKg = Math.round(volumeM3 * RUBBER_DENSITY_KG_PER_M3 * 1000) / 1000;
        }

        return this.issuanceLineItemRepo.create({
          issuanceItemId: savedItem.id,
          lineItemId: li.lineItemId,
          itemDescription: li.itemDescription ?? null,
          itemNo: li.itemNo ?? null,
          quantity: li.quantity ?? null,
          m2: m2Val,
          estimatedWeightKg,
        });
      });

      if (lineItemEntities.length > 0) {
        await this.issuanceLineItemRepo.save(lineItemEntities);
      }
    }

    roll.status = RollStockStatus.RESERVED;
    roll.reservedBy = dto.issuedBy;
    roll.reservedAt = now().toJSDate();
    await this.rollStockRepo.save(roll);

    this.sendReturnNotifications(savedIssuance.id).catch((err) =>
      this.logger.error(`Failed to send return notifications: ${err.message}`),
    );

    this.logger.log(
      `Roll issuance created: roll ${roll.rollNumber} issued by ${dto.issuedBy} to ${dto.jobCards.length} JC(s)`,
    );

    return this.issuanceById(savedIssuance.id);
  }

  async allIssuances(): Promise<RubberRollIssuanceDto[]> {
    const issuances = await this.issuanceRepo.find({
      relations: ["rollStock", "rollStock.compoundCoding", "items", "items.lineItems"],
      order: { createdAt: "DESC" },
    });

    return issuances.map((i) => this.mapIssuanceToDto(i));
  }

  async issuanceById(id: number): Promise<RubberRollIssuanceDto> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id },
      relations: ["rollStock", "rollStock.compoundCoding", "items", "items.lineItems"],
    });

    if (!issuance) {
      throw new BadRequestException("Issuance not found");
    }

    return this.mapIssuanceToDto(issuance);
  }

  async cancelIssuance(id: number): Promise<RubberRollIssuanceDto> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id },
      relations: ["rollStock"],
    });

    if (!issuance) {
      throw new BadRequestException("Issuance not found");
    }

    if (issuance.status !== RollIssuanceStatus.ACTIVE) {
      throw new BadRequestException("Only active issuances can be cancelled");
    }

    issuance.status = RollIssuanceStatus.CANCELLED;
    await this.issuanceRepo.save(issuance);

    if (issuance.rollStock) {
      issuance.rollStock.status = RollStockStatus.IN_STOCK;
      issuance.rollStock.reservedBy = null;
      issuance.rollStock.reservedAt = null;
      await this.rollStockRepo.save(issuance.rollStock);
    }

    this.logger.log(`Roll issuance ${id} cancelled`);
    return this.issuanceById(id);
  }

  private async sendReturnNotifications(issuanceId: number): Promise<void> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id: issuanceId },
      relations: ["rollStock", "rollStock.compoundCoding", "items"],
    });

    if (!issuance || issuance.expectedReturnKg === null) return;

    const rollNumber = issuance.rollStock?.rollNumber || "Unknown";
    const compound = issuance.rollStock?.compoundCoding?.code || "Unknown";
    const jcNumbers = issuance.items.map((i) => i.jcNumber).join(", ");
    const expectedReturn = Number(issuance.expectedReturnKg);
    const usageKg = Number(issuance.totalEstimatedUsageKg || 0);

    const issuerSubject = `Roll Issuance Return Notice — ${rollNumber}`;
    const issuerHtml = [
      `<p>Roll <strong>${rollNumber}</strong> (${compound}) has been issued to JC: ${jcNumbers}.</p>`,
      `<p><strong>Roll weight at issue:</strong> ${Number(issuance.rollWeightAtIssueKg).toFixed(1)} kg</p>`,
      `<p><strong>Estimated usage:</strong> ${usageKg.toFixed(1)} kg</p>`,
      `<p><strong>Workers must return:</strong> ${expectedReturn.toFixed(1)} kg to stock</p>`,
      "<p>Please ensure the offcut is weighed and returned to the store.</p>",
      "<p>Kind regards,<br/>AU Industries</p>",
    ].join("\n");

    const pmSubject = `Waste Allocation Required — Roll ${rollNumber}`;
    const pmHtml = [
      `<p>Roll <strong>${rollNumber}</strong> (${compound}) has been issued to JC: ${jcNumbers}.</p>`,
      `<p><strong>Expected return:</strong> ${expectedReturn.toFixed(1)} kg</p>`,
      "<p>Please allocate any waste before the offcut is returned to stock.</p>",
      "<p>Kind regards,<br/>AU Industries</p>",
    ].join("\n");

    const storeEmail = this.configService.get<string>("AU_STORE_EMAIL");
    const pmEmail = this.configService.get<string>("AU_PM_EMAIL");

    if (storeEmail) {
      await this.emailService.sendEmail({
        to: storeEmail,
        subject: issuerSubject,
        fromName: "AU Industries",
        html: issuerHtml,
      });
    }

    if (pmEmail) {
      await this.emailService.sendEmail({
        to: pmEmail,
        subject: pmSubject,
        fromName: "AU Industries",
        html: pmHtml,
      });
    }

    this.logger.log(`Return notifications sent for issuance ${issuanceId}`);
  }

  private mapRollToDto(roll: RubberRollStock): RubberRollIssuanceRollDto {
    return {
      id: roll.id,
      rollNumber: roll.rollNumber,
      compoundCode: roll.compoundCoding?.code || null,
      compoundName: roll.compoundCoding?.name || null,
      weightKg: Number(roll.weightKg),
      widthMm: roll.widthMm ? Number(roll.widthMm) : null,
      thicknessMm: roll.thicknessMm ? Number(roll.thicknessMm) : null,
      lengthM: roll.lengthM ? Number(roll.lengthM) : null,
      status: roll.status,
    };
  }

  private mapIssuanceToDto(issuance: RubberRollIssuance): RubberRollIssuanceDto {
    const statusLabels: Record<RollIssuanceStatus, string> = {
      ACTIVE: "Active",
      RETURNED: "Returned",
      CANCELLED: "Cancelled",
    };

    return {
      id: issuance.id,
      rollStockId: issuance.rollStockId,
      rollNumber: issuance.rollStock?.rollNumber || "",
      compoundCode: issuance.rollStock?.compoundCoding?.code || null,
      issuedBy: issuance.issuedBy,
      issuedAt: issuance.issuedAt.toISOString(),
      rollWeightAtIssueKg: Number(issuance.rollWeightAtIssueKg),
      totalEstimatedUsageKg: issuance.totalEstimatedUsageKg
        ? Number(issuance.totalEstimatedUsageKg)
        : null,
      expectedReturnKg: issuance.expectedReturnKg ? Number(issuance.expectedReturnKg) : null,
      photoPath: issuance.photoPath,
      notes: issuance.notes,
      status: issuance.status,
      statusLabel: statusLabels[issuance.status],
      items: (issuance.items || []).map((item) => ({
        id: item.id,
        jobCardId: item.jobCardId,
        jcNumber: item.jcNumber,
        jobName: item.jobName,
        lineItems: (item.lineItems || []).map((li) => ({
          id: li.id,
          lineItemId: li.lineItemId,
          itemDescription: li.itemDescription,
          itemNo: li.itemNo,
          quantity: li.quantity ? Number(li.quantity) : null,
          m2: li.m2 ? Number(li.m2) : null,
          estimatedWeightKg: li.estimatedWeightKg ? Number(li.estimatedWeightKg) : null,
        })),
      })),
      createdAt: issuance.createdAt.toISOString(),
    };
  }
}
