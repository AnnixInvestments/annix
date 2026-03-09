import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCardImportRow, LineItemImportRow } from "./job-card-import.service";

export interface CpoImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdCpoIds: number[];
}

const INVALID_LINE_ITEM_PATTERNS = [
  /^production\b/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp(letion)?\s*date/i,
  /^completion\s*date/i,
  /^supervisor/i,
  /^quality\s*control/i,
  /^qc\s*sign/i,
  /^inspector/i,
  /^approved\s*by/i,
  /^checked\s*by/i,
  /^date$/i,
  /^signature$/i,
  /^sign$/i,
  /^remarks$/i,
  /^comments$/i,
  /^notes$/i,
];

function isValidLineItem(li: LineItemImportRow): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textsToCheck = [itemCode, description].filter(Boolean);

  if (textsToCheck.length === 0) {
    return false;
  }

  const isFormLabel = textsToCheck.some((text) =>
    INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(text)),
  );
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity ? parseFloat(li.quantity) : null;
  const hasNoData = !description && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    if (looksLikeLabel) {
      return false;
    }
  }

  return true;
}

@Injectable()
export class CpoService {
  private readonly logger = new Logger(CpoService.name);

  constructor(
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
    @InjectRepository(CustomerPurchaseOrderItem)
    private readonly cpoItemRepo: Repository<CustomerPurchaseOrderItem>,
  ) {}

  async findAll(companyId: number, status?: string): Promise<CustomerPurchaseOrder[]> {
    const where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }
    return this.cpoRepo.find({
      where,
      relations: ["items"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<CustomerPurchaseOrder> {
    const cpo = await this.cpoRepo.findOne({
      where: { id, companyId },
      relations: ["items"],
    });
    if (!cpo) {
      throw new NotFoundException(`CPO ${id} not found`);
    }
    return cpo;
  }

  async createFromImportRows(
    companyId: number,
    rows: JobCardImportRow[],
    createdBy: string | null,
  ): Promise<CpoImportResult> {
    const result: CpoImportResult = {
      totalRows: rows.length,
      created: 0,
      skipped: 0,
      errors: [],
      createdCpoIds: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.jobNumber || !row.jobName) {
        result.errors.push({ row: i + 1, message: "Job Number and Job Name are required" });
        continue;
      }

      try {
        const cpoNumber = this.generateCpoNumber(row.jobNumber, row.jcNumber);

        const existing = await this.cpoRepo.findOne({
          where: { cpoNumber, companyId },
        });

        if (existing) {
          result.errors.push({
            row: i + 1,
            message: `CPO ${cpoNumber} already exists`,
          });
          result.skipped++;
          continue;
        }

        const validLineItems = (row.lineItems || []).filter(isValidLineItem);
        const totalQuantity = validLineItems.reduce((sum, li) => {
          const qty = li.quantity ? parseFloat(li.quantity) : 0;
          return sum + (Number.isNaN(qty) ? 0 : qty);
        }, 0);

        const customFields =
          row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

        const cpo = this.cpoRepo.create({
          companyId,
          cpoNumber,
          jobNumber: row.jobNumber,
          jobName: row.jobName || null,
          customerName: row.customerName || null,
          poNumber: row.poNumber || null,
          siteLocation: row.siteLocation || null,
          contactPerson: row.contactPerson || null,
          dueDate: row.dueDate || null,
          notes: row.notes || null,
          reference: row.reference || null,
          customFields,
          status: CpoStatus.ACTIVE,
          totalItems: validLineItems.length,
          totalQuantity,
          fulfilledQuantity: 0,
          createdBy,
        });
        const saved = await this.cpoRepo.save(cpo);

        if (validLineItems.length > 0) {
          const itemEntities = validLineItems.map((li, idx) =>
            this.cpoItemRepo.create({
              cpoId: saved.id,
              companyId,
              itemCode: li.itemCode || null,
              itemDescription: li.itemDescription || null,
              itemNo: li.itemNo || null,
              quantityOrdered: li.quantity ? parseFloat(li.quantity) : 0,
              quantityFulfilled: 0,
              jtNo: li.jtNo || null,
              m2: li.m2 ?? null,
              sortOrder: idx,
            }),
          );
          await this.cpoItemRepo.save(itemEntities);
        }

        result.created++;
        result.createdCpoIds.push(saved.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create CPO for row ${i + 1}: ${message}`);
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }

  async deleteCpo(companyId: number, id: number): Promise<void> {
    const cpo = await this.cpoRepo.findOne({ where: { id, companyId } });
    if (!cpo) {
      throw new NotFoundException(`CPO ${id} not found`);
    }
    await this.cpoRepo.remove(cpo);
  }

  async updateStatus(
    companyId: number,
    id: number,
    status: CpoStatus,
  ): Promise<CustomerPurchaseOrder> {
    const cpo = await this.findById(companyId, id);
    cpo.status = status;
    return this.cpoRepo.save(cpo);
  }

  private generateCpoNumber(jobNumber: string, jcNumber?: string): string {
    const base = jobNumber.trim().toUpperCase();
    if (jcNumber) {
      return `CPO-${base}-${jcNumber.trim()}`;
    }
    return `CPO-${base}`;
  }
}
