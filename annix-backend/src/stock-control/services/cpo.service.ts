import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { fromJSDate, now, nowISO } from "../../lib/datetime";
import {
  CalloffStatus,
  CalloffType,
  CpoCalloffRecord,
} from "../entities/cpo-calloff-record.entity";
import {
  CpoPreviousVersion,
  CpoStatus,
  CustomerPurchaseOrder,
} from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { isValidLineItem } from "../lib/line-item-validation";
import { CoatingAnalysisService } from "./coating-analysis.service";
import { JobCardImportRow } from "./job-card-import.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

export interface CpoMatchResult {
  matched: boolean;
  cpoId: number | null;
  cpoNumber: string | null;
  matchedItems: number;
}

export interface CpoImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdCpoIds: number[];
}

@Injectable()
export class CpoService {
  private readonly logger = new Logger(CpoService.name);

  constructor(
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
    @InjectRepository(CustomerPurchaseOrderItem)
    private readonly cpoItemRepo: Repository<CustomerPurchaseOrderItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(CpoCalloffRecord)
    private readonly calloffRepo: Repository<CpoCalloffRecord>,
    @InjectRepository(Requisition)
    private readonly requisitionRepo: Repository<Requisition>,
    @InjectRepository(RequisitionItem)
    private readonly requisitionItemRepo: Repository<RequisitionItem>,
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @Inject(forwardRef(() => CoatingAnalysisService))
    private readonly coatingAnalysisService: CoatingAnalysisService,
    private readonly notificationService: WorkflowNotificationService,
  ) {}

  async findAll(
    companyId: number,
    status?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<CustomerPurchaseOrder[]> {
    const where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }
    return this.cpoRepo.find({
      where,
      relations: ["items"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
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
      updated: 0,
      skipped: 0,
      errors: [],
      createdCpoIds: [],
    };

    return rows.reduce(async (accPromise, row, i) => {
      const acc = await accPromise;

      if (!row.jobNumber || !row.jobName) {
        return {
          ...acc,
          errors: [...acc.errors, { row: i + 1, message: "Job Number and Job Name are required" }],
        };
      }

      try {
        const cpoNumber = this.generateCpoNumber(row.jobNumber, row.jcNumber);

        const existing = await this.cpoRepo.findOne({
          where: { cpoNumber, companyId },
          relations: ["items"],
        });

        const validLineItems = (row.lineItems || []).filter(isValidLineItem);
        const totalQuantity = validLineItems.reduce((sum, li) => {
          const qty = li.quantity ? parseFloat(li.quantity) : 0;
          return sum + (Number.isNaN(qty) ? 0 : qty);
        }, 0);

        const customFields =
          row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

        if (existing) {
          const updatedId = await this.archiveAndOverwriteCpo(
            existing,
            row,
            validLineItems,
            totalQuantity,
            customFields,
            companyId,
            createdBy,
          );

          return {
            ...acc,
            updated: acc.updated + 1,
            createdCpoIds: [...acc.createdCpoIds, updatedId],
          };
        }

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

        this.initialiseCpoCoatingAndRequisition(companyId, saved, createdBy).catch((err) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          this.logger.error(`Failed post-creation tasks for CPO ${saved.cpoNumber}: ${msg}`);
        });

        return {
          ...acc,
          created: acc.created + 1,
          createdCpoIds: [...acc.createdCpoIds, saved.id],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create CPO for row ${i + 1}: ${message}`);
        return {
          ...acc,
          errors: [...acc.errors, { row: i + 1, message }],
        };
      }
    }, Promise.resolve(result));
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

  async matchJobCardToCpo(companyId: number, jobCardId: number): Promise<CpoMatchResult> {
    const noMatch: CpoMatchResult = {
      matched: false,
      cpoId: null,
      cpoNumber: null,
      matchedItems: 0,
    };

    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      return noMatch;
    }

    const cpos = await this.cpoRepo.find({
      where: { companyId, jobNumber: jobCard.jobNumber, status: CpoStatus.ACTIVE },
      relations: ["items"],
    });

    if (cpos.length === 0) {
      return noMatch;
    }

    const cpo = cpos[0];
    const jcLineItems = jobCard.lineItems || [];

    const matchedItemIds = jcLineItems.reduce<number[]>((acc, jcItem) => {
      const cpoItem = cpo.items.find((ci) => {
        if (ci.itemCode && jcItem.itemCode) {
          return ci.itemCode.trim().toLowerCase() === jcItem.itemCode.trim().toLowerCase();
        }
        if (ci.itemDescription && jcItem.itemDescription) {
          return (
            ci.itemDescription.trim().toLowerCase() === jcItem.itemDescription.trim().toLowerCase()
          );
        }
        return false;
      });

      if (cpoItem) {
        return [...acc, cpoItem.id];
      }
      return acc;
    }, []);

    const uniqueMatchedIds = [...new Set(matchedItemIds)];

    if (uniqueMatchedIds.length > 0) {
      await this.jobCardRepo.update(jobCardId, { cpoId: cpo.id, isCpoCalloff: true });

      const fulfilmentUpdates = uniqueMatchedIds.map(async (cpoItemId) => {
        const cpoItem = cpo.items.find((ci) => ci.id === cpoItemId);
        if (!cpoItem) {
          return;
        }

        const jcMatches = jcLineItems.filter((jcItem) => {
          if (cpoItem.itemCode && jcItem.itemCode) {
            return cpoItem.itemCode.trim().toLowerCase() === jcItem.itemCode.trim().toLowerCase();
          }
          if (cpoItem.itemDescription && jcItem.itemDescription) {
            return (
              cpoItem.itemDescription.trim().toLowerCase() ===
              jcItem.itemDescription.trim().toLowerCase()
            );
          }
          return false;
        });

        const fulfilledQty = jcMatches.reduce((sum, jcItem) => sum + (jcItem.quantity || 0), 0);
        const newFulfilled = Math.min(
          Number(cpoItem.quantityFulfilled) + fulfilledQty,
          Number(cpoItem.quantityOrdered),
        );

        await this.cpoItemRepo.update(cpoItemId, { quantityFulfilled: newFulfilled });
      });

      await Promise.all(fulfilmentUpdates);

      const updatedCpo = await this.cpoRepo.findOne({
        where: { id: cpo.id },
        relations: ["items"],
      });

      if (updatedCpo) {
        const totalFulfilled = updatedCpo.items.reduce(
          (sum, item) => sum + Number(item.quantityFulfilled),
          0,
        );
        const updateFields: Partial<CustomerPurchaseOrder> = { fulfilledQuantity: totalFulfilled };

        if (
          totalFulfilled >= Number(updatedCpo.totalQuantity) &&
          Number(updatedCpo.totalQuantity) > 0
        ) {
          updateFields.status = CpoStatus.FULFILLED;
        }

        await this.cpoRepo.update(cpo.id, updateFields);
      }

      this.logger.log(
        `Matched JC #${jobCard.jobNumber} to CPO ${cpo.cpoNumber} (${uniqueMatchedIds.length} items)`,
      );

      return {
        matched: true,
        cpoId: cpo.id,
        cpoNumber: cpo.cpoNumber,
        matchedItems: uniqueMatchedIds.length,
      };
    }

    return noMatch;
  }

  async initialiseCpoCoatingAndRequisition(
    companyId: number,
    cpo: CustomerPurchaseOrder,
    createdBy: string | null,
  ): Promise<Requisition | null> {
    const existingReq = await this.requisitionRepo.findOne({
      where: { cpoId: cpo.id, companyId },
    });

    if (existingReq) {
      this.logger.log(`Call-off requisition already exists for CPO ${cpo.cpoNumber}, skipping`);
      return existingReq;
    }

    const linkedJobCards = await this.jobCardRepo.find({
      where: { cpoId: cpo.id, companyId },
    });

    const analysisResults = await Promise.all(
      linkedJobCards.map(async (jc) => {
        try {
          return await this.coatingAnalysisService.analyseJobCard(jc.id, companyId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          this.logger.warn(
            `Coating analysis failed for JC ${jc.id} (CPO ${cpo.cpoNumber}): ${msg}`,
          );
          return null;
        }
      }),
    );

    const allCoats = analysisResults
      .filter((a): a is NonNullable<typeof a> => a !== null && a.coats.length > 0)
      .flatMap((a) => a.coats);

    if (allCoats.length === 0) {
      this.logger.log(`No coating data found for CPO ${cpo.cpoNumber}, skipping requisition`);
      return null;
    }

    const requisition = this.requisitionRepo.create({
      requisitionNumber: `CALLOFF-${cpo.cpoNumber}`,
      jobCardId: null,
      cpoId: cpo.id,
      source: RequisitionSource.CPO,
      isCalloffOrder: true,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy,
      notes: `Auto-generated call-off requisition for CPO ${cpo.cpoNumber}`,
    });
    const savedReq = await this.requisitionRepo.save(requisition);

    const items = allCoats.map((coat) =>
      this.requisitionItemRepo.create({
        requisitionId: savedReq.id,
        productName: coat.product,
        area: coat.area,
        litresRequired: coat.litersRequired,
        packSizeLitres: 20,
        packsToOrder: Math.ceil(coat.litersRequired / 20),
        companyId,
      }),
    );
    await this.requisitionItemRepo.save(items);

    this.logger.log(
      `Created call-off requisition ${savedReq.requisitionNumber} with ${items.length} item(s) for CPO ${cpo.cpoNumber}`,
    );

    return savedReq;
  }

  async createCalloffRecords(companyId: number, jobCardId: number): Promise<CpoCalloffRecord[]> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard || !jobCard.cpoId) {
      return [];
    }

    const cpo = await this.cpoRepo.findOne({
      where: { id: jobCard.cpoId, companyId },
    });

    if (!cpo) {
      return [];
    }

    const existing = await this.calloffRepo.find({
      where: { jobCardId, companyId },
    });

    if (existing.length > 0) {
      this.logger.log(`Calloff records already exist for JC ${jobCardId}, skipping`);
      return existing;
    }

    const calloffRequisition = await this.requisitionRepo.findOne({
      where: { cpoId: cpo.id, companyId, isCalloffOrder: true },
    });

    const records = [CalloffType.RUBBER, CalloffType.PAINT, CalloffType.SOLUTION].map((type) =>
      this.calloffRepo.create({
        companyId,
        cpoId: cpo.id,
        jobCardId,
        requisitionId: calloffRequisition?.id ?? null,
        calloffType: type,
        status: CalloffStatus.PENDING,
      }),
    );

    const saved = await this.calloffRepo.save(records);

    this.logger.log(
      `Created ${saved.length} calloff records for JC ${jobCard.jobNumber} / CPO ${cpo.cpoNumber}`,
    );

    await this.notificationService.notifyCpoCalloffNeeded(companyId, jobCard, cpo);

    return saved;
  }

  async calloffRecordsForCpo(companyId: number, cpoId: number): Promise<CpoCalloffRecord[]> {
    return this.calloffRepo.find({
      where: { cpoId, companyId },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  async deliveryHistoryForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<{
    deliveries: {
      jobCardId: number;
      jobNumber: string;
      jtDnNumber: string | null;
      status: string;
      importedAt: string;
      items: { itemCode: string | null; description: string | null; quantity: number }[];
      totalQuantity: number;
    }[];
    runningTotals: {
      itemCode: string | null;
      description: string | null;
      ordered: number;
      fulfilled: number;
      remaining: number;
      deliveries: { jtDnNumber: string | null; quantity: number; date: string }[];
    }[];
  }> {
    const cpo = await this.cpoRepo.findOne({
      where: { id: cpoId, companyId },
      relations: ["items"],
    });

    if (!cpo) {
      throw new NotFoundException(`CPO ${cpoId} not found`);
    }

    const linkedJobCards = await this.jobCardRepo.find({
      where: { cpoId, companyId },
      relations: ["lineItems"],
      order: { createdAt: "ASC" },
    });

    const matchesCpoItem = (
      liCode: string,
      liDesc: string,
      ciCode: string,
      ciDesc: string,
    ): boolean => {
      const hasCode = ciCode.length > 0 && liCode.length > 0;
      const hasDesc = ciDesc.length > 0 && liDesc.length > 0;
      if (hasCode && hasDesc) return ciCode === liCode && ciDesc === liDesc;
      if (hasCode) return ciCode === liCode;
      if (hasDesc) return ciDesc === liDesc;
      return false;
    };

    const deliveries = linkedJobCards.map((jc) => {
      const matchedItems = (jc.lineItems || [])
        .filter((li) => {
          const code = (li.itemCode || "").trim().toLowerCase();
          const desc = (li.itemDescription || "").trim().toLowerCase();
          return cpo.items.some((ci) => {
            const ciCode = (ci.itemCode || "").trim().toLowerCase();
            const ciDesc = (ci.itemDescription || "").trim().toLowerCase();
            return matchesCpoItem(code, desc, ciCode, ciDesc);
          });
        })
        .map((li) => ({
          itemCode: li.itemCode,
          description: li.itemDescription,
          quantity: Number(li.quantity) || 0,
        }));

      const totalQuantity = matchedItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        jobCardId: jc.id,
        jobNumber: jc.jobNumber,
        jtDnNumber: jc.jtDnNumber,
        status: jc.status,
        importedAt: fromJSDate(jc.createdAt).toISO() || "",
        items: matchedItems,
        totalQuantity,
      };
    });

    const runningTotals = cpo.items
      .filter((ci) => Number(ci.quantityOrdered) > 0)
      .map((ci) => {
        const ciCode = (ci.itemCode || "").trim().toLowerCase();
        const ciDesc = (ci.itemDescription || "").trim().toLowerCase();

        const itemDeliveries = deliveries
          .map((d) => {
            const matchedQty = d.items
              .filter((di) => {
                const diCode = (di.itemCode || "").trim().toLowerCase();
                const diDesc = (di.description || "").trim().toLowerCase();
                return matchesCpoItem(diCode, diDesc, ciCode, ciDesc);
              })
              .reduce((sum, di) => sum + di.quantity, 0);

            if (matchedQty === 0) return null;

            return {
              jtDnNumber: d.jtDnNumber,
              quantity: matchedQty,
              date: d.importedAt || "",
            };
          })
          .filter((d): d is NonNullable<typeof d> => d !== null);

        const ordered = Number(ci.quantityOrdered) || 0;
        const fulfilled = itemDeliveries.reduce((sum, d) => sum + d.quantity, 0);

        return {
          itemCode: ci.itemCode,
          description: ci.itemDescription,
          ordered,
          fulfilled,
          remaining: Math.max(0, ordered - fulfilled),
          deliveries: itemDeliveries,
        };
      });

    return { deliveries, runningTotals };
  }

  async updateCalloffStatus(
    companyId: number,
    recordId: number,
    status: CalloffStatus,
  ): Promise<CpoCalloffRecord> {
    const record = await this.calloffRepo.findOne({
      where: { id: recordId, companyId },
    });

    if (!record) {
      throw new NotFoundException(`Calloff record ${recordId} not found`);
    }

    record.status = status;

    if (status === CalloffStatus.CALLED_OFF && !record.calledOffAt) {
      record.calledOffAt = now().toJSDate();
    } else if (status === CalloffStatus.DELIVERED && !record.deliveredAt) {
      record.deliveredAt = now().toJSDate();
    } else if (status === CalloffStatus.INVOICED && !record.invoicedAt) {
      record.invoicedAt = now().toJSDate();
    }

    return this.calloffRepo.save(record);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: "stock-control:uninvoiced-arrivals" })
  async uninvoicedArrivalCheck(): Promise<void> {
    this.logger.log("Running daily CPO uninvoiced arrival check...");

    const twentyOneDaysAgo = now().minus({ days: 21 }).toJSDate();

    const overdueRecords = await this.calloffRepo.find({
      where: {
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
      relations: ["cpo", "jobCard"],
    });

    if (overdueRecords.length === 0) {
      this.logger.log("No overdue uninvoiced CPO items found");
      return;
    }

    const recordsByCpo = overdueRecords.reduce<Record<number, CpoCalloffRecord[]>>(
      (acc, record) => ({
        ...acc,
        [record.cpoId]: [...(acc[record.cpoId] || []), record],
      }),
      {},
    );

    await Promise.all(
      Object.entries(recordsByCpo).map(async ([cpoIdStr, records]) => {
        const cpoId = Number(cpoIdStr);
        const cpo = records[0]?.cpo;
        if (!cpo) return;

        await this.notificationService.notifyCpoInvoiceOverdue(cpo.companyId, cpo, records);
      }),
    );

    this.logger.log(
      `Sent overdue invoice notifications for ${Object.keys(recordsByCpo).length} CPO(s), ${overdueRecords.length} record(s)`,
    );
  }

  async cpoSummary(companyId: number): Promise<{
    activeCpos: number;
    awaitingCalloff: number;
    overdueInvoices: number;
  }> {
    const activeCpos = await this.cpoRepo.count({
      where: { companyId, status: CpoStatus.ACTIVE },
    });

    const awaitingCalloff = await this.calloffRepo.count({
      where: { companyId, status: CalloffStatus.PENDING },
    });

    const twentyOneDaysAgo = now().minus({ days: 21 }).toJSDate();
    const overdueInvoices = await this.calloffRepo.count({
      where: {
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
    });

    return { activeCpos, awaitingCalloff, overdueInvoices };
  }

  async overdueCalloffRecordsForCpo(companyId: number, cpoId: number): Promise<CpoCalloffRecord[]> {
    const twentyOneDaysAgo = now().minus({ days: 21 }).toJSDate();
    return this.calloffRepo.find({
      where: {
        cpoId,
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
      relations: ["jobCard"],
    });
  }

  async linkDeliveryToCalloffs(
    companyId: number,
    supplierName: string,
    deliveryNoteId: number,
  ): Promise<CpoCalloffRecord[]> {
    const calledOffRecords = await this.calloffRepo.find({
      where: { companyId, status: CalloffStatus.CALLED_OFF },
      relations: ["cpo", "jobCard"],
    });

    if (calledOffRecords.length === 0) {
      return [];
    }

    const normalised = supplierName.toLowerCase();
    const matchedType = this.inferCalloffTypeFromSupplier(normalised);

    if (!matchedType) {
      this.logger.log(
        `DN ${deliveryNoteId}: supplier "${supplierName}" did not match any calloff type`,
      );
      return [];
    }

    const matching = calledOffRecords.filter((r) => r.calloffType === matchedType);

    if (matching.length === 0) {
      return [];
    }

    const updated = await Promise.all(
      matching.map(async (record) => {
        record.status = CalloffStatus.DELIVERED;
        record.deliveredAt = now().toJSDate();
        record.notes = `Auto-delivered from DN #${deliveryNoteId} (${supplierName})`;
        return this.calloffRepo.save(record);
      }),
    );

    this.logger.log(
      `DN ${deliveryNoteId}: auto-advanced ${updated.length} ${matchedType} calloff record(s) to delivered`,
    );

    return updated;
  }

  async fulfillmentReport(companyId: number): Promise<
    {
      cpoId: number;
      cpoNumber: string;
      jobNumber: string;
      customerName: string | null;
      status: string;
      items: {
        itemCode: string | null;
        itemDescription: string | null;
        quantityOrdered: number;
        quantityFulfilled: number;
        remaining: number;
        percentComplete: number;
      }[];
      totalOrdered: number;
      totalFulfilled: number;
      totalRemaining: number;
      percentComplete: number;
    }[]
  > {
    const cpos = await this.cpoRepo.find({
      where: { companyId },
      relations: ["items"],
      order: { createdAt: "DESC" },
    });

    return cpos.map((cpo) => {
      const items = (cpo.items || []).map((item) => {
        const ordered = Number(item.quantityOrdered) || 0;
        const fulfilled = Number(item.quantityFulfilled) || 0;
        const remaining = Math.max(0, ordered - fulfilled);
        return {
          itemCode: item.itemCode,
          itemDescription: item.itemDescription,
          quantityOrdered: ordered,
          quantityFulfilled: fulfilled,
          remaining,
          percentComplete: ordered > 0 ? Math.round((fulfilled / ordered) * 100) : 0,
        };
      });

      const totalOrdered = items.reduce((sum, i) => sum + i.quantityOrdered, 0);
      const totalFulfilled = items.reduce((sum, i) => sum + i.quantityFulfilled, 0);
      const totalRemaining = Math.max(0, totalOrdered - totalFulfilled);

      return {
        cpoId: cpo.id,
        cpoNumber: cpo.cpoNumber,
        jobNumber: cpo.jobNumber,
        customerName: cpo.customerName,
        status: cpo.status,
        items,
        totalOrdered,
        totalFulfilled,
        totalRemaining,
        percentComplete: totalOrdered > 0 ? Math.round((totalFulfilled / totalOrdered) * 100) : 0,
      };
    });
  }

  async calloffStatusBreakdown(companyId: number): Promise<{
    summary: {
      pending: number;
      calledOff: number;
      delivered: number;
      invoiced: number;
      total: number;
    };
    byCpo: {
      cpoId: number;
      cpoNumber: string;
      pending: number;
      calledOff: number;
      delivered: number;
      invoiced: number;
    }[];
  }> {
    const records = await this.calloffRepo.find({
      where: { companyId },
      relations: ["cpo"],
    });

    const summary = records.reduce(
      (acc, r) => ({
        pending: acc.pending + (r.status === CalloffStatus.PENDING ? 1 : 0),
        calledOff: acc.calledOff + (r.status === CalloffStatus.CALLED_OFF ? 1 : 0),
        delivered: acc.delivered + (r.status === CalloffStatus.DELIVERED ? 1 : 0),
        invoiced: acc.invoiced + (r.status === CalloffStatus.INVOICED ? 1 : 0),
        total: acc.total + 1,
      }),
      { pending: 0, calledOff: 0, delivered: 0, invoiced: 0, total: 0 },
    );

    const byCpoMap = records.reduce<
      Record<
        number,
        {
          cpoId: number;
          cpoNumber: string;
          pending: number;
          calledOff: number;
          delivered: number;
          invoiced: number;
        }
      >
    >((acc, r) => {
      const existing = acc[r.cpoId] || {
        cpoId: r.cpoId,
        cpoNumber: r.cpo?.cpoNumber || `CPO-${r.cpoId}`,
        pending: 0,
        calledOff: 0,
        delivered: 0,
        invoiced: 0,
      };
      return {
        ...acc,
        [r.cpoId]: {
          ...existing,
          pending: existing.pending + (r.status === CalloffStatus.PENDING ? 1 : 0),
          calledOff: existing.calledOff + (r.status === CalloffStatus.CALLED_OFF ? 1 : 0),
          delivered: existing.delivered + (r.status === CalloffStatus.DELIVERED ? 1 : 0),
          invoiced: existing.invoiced + (r.status === CalloffStatus.INVOICED ? 1 : 0),
        },
      };
    }, {});

    return { summary, byCpo: Object.values(byCpoMap) };
  }

  async overdueInvoiceReport(companyId: number): Promise<
    {
      recordId: number;
      cpoNumber: string;
      jobCardNumber: string | null;
      calloffType: string;
      deliveredAt: Date | null;
      daysSinceDelivery: number;
    }[]
  > {
    const twentyOneDaysAgo = now().minus({ days: 21 }).toJSDate();
    const records = await this.calloffRepo.find({
      where: {
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
      relations: ["cpo", "jobCard"],
    });

    return records.map((r) => ({
      recordId: r.id,
      cpoNumber: r.cpo?.cpoNumber || `CPO-${r.cpoId}`,
      jobCardNumber: r.jobCard?.jobNumber || null,
      calloffType: r.calloffType,
      deliveredAt: r.deliveredAt,
      daysSinceDelivery: r.deliveredAt
        ? Math.floor(now().diff(fromJSDate(r.deliveredAt), "days").days)
        : 0,
    }));
  }

  async exportCsv(companyId: number): Promise<string> {
    const cpos = await this.cpoRepo.find({
      where: { companyId },
      relations: ["items"],
      order: { createdAt: "DESC" },
    });

    const calloffRecords = await this.calloffRepo.find({
      where: { companyId },
      relations: ["cpo", "jobCard"],
    });

    const calloffByCpo = calloffRecords.reduce<Record<number, CpoCalloffRecord[]>>(
      (acc, r) => ({
        ...acc,
        [r.cpoId]: [...(acc[r.cpoId] || []), r],
      }),
      {},
    );

    const headers = [
      "CPO Number",
      "Job Number",
      "Customer",
      "Status",
      "Item Code",
      "Description",
      "Qty Ordered",
      "Qty Fulfilled",
      "Remaining",
      "% Complete",
      "Rubber Status",
      "Paint Status",
      "Solution Status",
    ];

    const rows = cpos.flatMap((cpo) => {
      const records = calloffByCpo[cpo.id] || [];
      const rubberStatus = records.find((r) => r.calloffType === CalloffType.RUBBER)?.status || "-";
      const paintStatus = records.find((r) => r.calloffType === CalloffType.PAINT)?.status || "-";
      const solutionStatus =
        records.find((r) => r.calloffType === CalloffType.SOLUTION)?.status || "-";

      if (!cpo.items || cpo.items.length === 0) {
        return [
          [
            cpo.cpoNumber,
            cpo.jobNumber,
            cpo.customerName || "",
            cpo.status,
            "",
            "",
            "0",
            "0",
            "0",
            "0",
            rubberStatus,
            paintStatus,
            solutionStatus,
          ],
        ];
      }

      return cpo.items.map((item) => {
        const ordered = Number(item.quantityOrdered) || 0;
        const fulfilled = Number(item.quantityFulfilled) || 0;
        const remaining = Math.max(0, ordered - fulfilled);
        const pct = ordered > 0 ? Math.round((fulfilled / ordered) * 100) : 0;
        return [
          cpo.cpoNumber,
          cpo.jobNumber,
          cpo.customerName || "",
          cpo.status,
          item.itemCode || "",
          item.itemDescription || "",
          String(ordered),
          String(fulfilled),
          String(remaining),
          String(pct),
          rubberStatus,
          paintStatus,
          solutionStatus,
        ];
      });
    });

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  private cpoDataUnchanged(
    existing: CustomerPurchaseOrder,
    row: JobCardImportRow,
    validLineItems: {
      itemCode?: string;
      itemDescription?: string;
      itemNo?: string;
      quantity?: string;
      jtNo?: string;
      m2?: number;
    }[],
    totalQuantity: number,
  ): boolean {
    if (
      (existing.jobName || null) !== (row.jobName || null) ||
      (existing.customerName || null) !== (row.customerName || null) ||
      (existing.poNumber || null) !== (row.poNumber || null) ||
      existing.totalItems !== validLineItems.length ||
      Number(existing.totalQuantity) !== totalQuantity
    ) {
      return false;
    }

    const existingItems = (existing.items || [])
      .map((item) => `${item.itemCode}|${item.itemDescription}|${Number(item.quantityOrdered)}`)
      .sort();
    const incomingItems = validLineItems
      .map(
        (li) =>
          `${li.itemCode || ""}|${li.itemDescription || ""}|${li.quantity ? parseFloat(li.quantity) : 0}`,
      )
      .sort();

    if (existingItems.length !== incomingItems.length) return false;
    return existingItems.every((item, idx) => item === incomingItems[idx]);
  }

  private async archiveAndOverwriteCpo(
    existing: CustomerPurchaseOrder,
    row: JobCardImportRow,
    validLineItems: {
      itemCode?: string;
      itemDescription?: string;
      itemNo?: string;
      quantity?: string;
      jtNo?: string;
      m2?: number;
    }[],
    totalQuantity: number,
    customFields: Record<string, string> | null,
    companyId: number,
    createdBy: string | null,
  ): Promise<number> {
    if (this.cpoDataUnchanged(existing, row, validLineItems, totalQuantity)) {
      this.logger.log(`CPO ${existing.cpoNumber} data unchanged, skipping version bump`);
      return existing.id;
    }

    const versionSnapshot: CpoPreviousVersion = {
      versionNumber: existing.versionNumber,
      archivedAt: nowISO(),
      jobName: existing.jobName,
      customerName: existing.customerName,
      poNumber: existing.poNumber,
      totalItems: existing.totalItems,
      totalQuantity: Number(existing.totalQuantity),
      items: (existing.items || []).map((item) => ({
        itemCode: item.itemCode,
        itemDescription: item.itemDescription,
        itemNo: item.itemNo,
        quantityOrdered: Number(item.quantityOrdered),
        quantityFulfilled: Number(item.quantityFulfilled),
        jtNo: item.jtNo,
        m2: item.m2 !== null ? Number(item.m2) : null,
      })),
    };

    existing.previousVersions = [...(existing.previousVersions || []), versionSnapshot];
    existing.versionNumber = existing.versionNumber + 1;
    existing.jobName = row.jobName || null;
    existing.customerName = row.customerName || null;
    existing.poNumber = row.poNumber || null;
    existing.siteLocation = row.siteLocation || null;
    existing.contactPerson = row.contactPerson || null;
    existing.dueDate = row.dueDate || null;
    existing.notes = row.notes || null;
    existing.reference = row.reference || null;
    existing.customFields = customFields;
    existing.totalItems = validLineItems.length;
    existing.totalQuantity = totalQuantity;
    existing.fulfilledQuantity = 0;
    existing.status = CpoStatus.ACTIVE;

    const saved = await this.cpoRepo.save(existing);

    await this.cpoItemRepo.delete({ cpoId: saved.id });

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

    this.initialiseCpoCoatingAndRequisition(companyId, saved, createdBy).catch((err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed post-creation tasks for CPO ${saved.cpoNumber}: ${msg}`);
    });

    this.logger.log(`Archived and overwrote CPO ${existing.cpoNumber} as v${saved.versionNumber}`);

    return saved.id;
  }

  private inferCalloffTypeFromSupplier(normalisedName: string): CalloffType | null {
    const rubberKeywords = ["rubber", "lining", "polycorp", "trelleborg", "rema"];
    const paintKeywords = [
      "paint",
      "coating",
      "dulux",
      "sigma",
      "jotun",
      "hempel",
      "international",
    ];
    const solutionKeywords = ["solution", "chemical", "solvent", "thinner", "adhesive"];

    if (rubberKeywords.some((kw) => normalisedName.includes(kw))) {
      return CalloffType.RUBBER;
    }
    if (paintKeywords.some((kw) => normalisedName.includes(kw))) {
      return CalloffType.PAINT;
    }
    if (solutionKeywords.some((kw) => normalisedName.includes(kw))) {
      return CalloffType.SOLUTION;
    }
    return null;
  }

  private generateCpoNumber(jobNumber: string, jcNumber?: string): string {
    const base = jobNumber.trim().toUpperCase();
    if (jcNumber) {
      return `CPO-${base}-${jcNumber.trim()}`;
    }
    return `CPO-${base}`;
  }
}
