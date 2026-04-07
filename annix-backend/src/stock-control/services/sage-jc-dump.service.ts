import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import * as XLSX from "xlsx";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";

const WORKFLOW_STATUS_DRAFT = "draft";

const ASTERISK_PATTERN = /^\*+$/;

const NON_JT_VALUES = ["pricing"];

const PAGE_HEADER_PATTERN = /JOB CARD AND MATERIAL MOVEMENT/i;

const SPEC_ROW_PATTERN =
  /INT\s*:|EXT\s*:|R\/L|rubber|lining|lagging|shore|paint|blast|coat|primer|oxide|epoxy|polyurethane|zinc|silicate|nitrile|neoprene|butadiene|ceramic|\bROT\b/i;

const PAGE_PATTERN = /^Page\s+(\d+)\s+of\s+(\d+)$/i;

const ITEM_HEADER_ROW = ["Item Code", "Item Description"];

const FOOTER_LABELS = [
  "PRODUCTION",
  "Forman Sign",
  "Material Spec",
  "Job Comp Date",
  "Sage 200 Evolution",
];

export interface SageJcDumpParsedItem {
  itemCode: string;
  itemDescription: string;
  itemNo: string;
  itemNoBase: string;
  quantity: number;
  jtNo: string | null;
  category: "jt" | "asterisk" | "undelivered";
  pageNumber: number;
  specNotes: string | null;
}

export interface AsteriskItem {
  itemCode: string;
  itemDescription: string;
  itemNo: string;
  itemNoBase: string;
  cpoItemId: number;
  totalCpoQty: number;
  alreadyDeliveredQty: number;
  remainingQty: number;
  asteriskQtyInFile: number;
}

export interface SageJcDumpParseResult {
  cpoId: number;
  cpoNumber: string;
  jobNumber: string;
  customerName: string | null;
  documentNumber: string | null;
  specNotes: string | null;
  jtGroups: Record<string, SageJcDumpParsedItem[]>;
  asteriskItems: AsteriskItem[];
  skippedJtNumbers: string[];
  undeliveredItems: SageJcDumpParsedItem[];
}

export interface AsteriskAllocation {
  cpoItemId: number;
  allocations: Array<{ jtNumber: string; quantity: number }>;
}

export interface SageJcDumpConfirmRequest {
  cpoId: number;
  jtGroups: Record<string, SageJcDumpParsedItem[]>;
  asteriskAllocations: AsteriskAllocation[];
}

export interface SageJcDumpImportResult {
  createdJobCards: Array<{ id: number; jtNumber: string; itemCount: number }>;
  skippedJtNumbers: string[];
  totalCreated: number;
}

interface ParsedPage {
  pageNumber: number;
  documentNumber: string | null;
  jobNumber: string | null;
  jobFileNo: string | null;
  customerName: string | null;
  customerCode: string | null;
  orderDescription: string | null;
  specNotes: string[];
  lineItems: Array<{
    itemCode: string;
    itemDescription: string;
    itemNo: string;
    quantity: number;
    jtNo: string;
    specNotes: string | null;
  }>;
}

function deduplicateLines(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return [...new Set(lines)].join("\n");
}

function stripItemNoSequence(itemNo: string): string {
  return itemNo.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function isAsterisk(value: string): boolean {
  return ASTERISK_PATTERN.test(value.trim());
}

function isNonJtValue(value: string): boolean {
  return NON_JT_VALUES.includes(value.trim().toLowerCase());
}

function isRealJtNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isAsterisk(trimmed)) return false;
  if (isNonJtValue(trimmed)) return false;
  return true;
}

function isFooterRow(row: any[]): boolean {
  const first = String(row[0] || "").trim();
  return FOOTER_LABELS.some((label) => first.startsWith(label));
}

function matchCpoItem(
  cpoItems: CustomerPurchaseOrderItem[],
  itemNoBase: string,
  itemDescription: string,
): CustomerPurchaseOrderItem | null {
  const byItemNo = cpoItems.find((ci) => {
    if (!ci.itemNo) return false;
    return stripItemNoSequence(ci.itemNo).toLowerCase() === itemNoBase.toLowerCase();
  });
  if (byItemNo) return byItemNo;

  const byDescription = cpoItems.find((ci) => {
    if (!ci.itemDescription) return false;
    return ci.itemDescription.trim().toLowerCase() === itemDescription.trim().toLowerCase();
  });
  return byDescription || null;
}

@Injectable()
export class SageJcDumpService {
  private readonly logger = new Logger(SageJcDumpService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
    @InjectRepository(CustomerPurchaseOrderItem)
    private readonly cpoItemRepo: Repository<CustomerPurchaseOrderItem>,
    private readonly dataSource: DataSource,
    private readonly qcMeasurementService: QcMeasurementService,
  ) {}

  async parseSageJcDump(
    buffer: Buffer,
    companyId: number,
    cpoId: number,
  ): Promise<SageJcDumpParseResult> {
    const cpo = await this.cpoRepo.findOne({
      where: { id: cpoId, companyId },
      relations: ["items"],
    });
    if (!cpo) {
      throw new NotFoundException("CPO not found");
    }

    const pages = this.parseExcelPages(buffer);
    if (pages.length === 0) {
      throw new BadRequestException("No pages found in the uploaded file");
    }

    const firstPage = pages[0];
    const documentNumber = firstPage.documentNumber;
    const jobNumber = cpo.jobNumber;
    const customerName = firstPage.customerName;

    const allSpecNotes = [
      ...new Set(pages.reduce<string[]>((acc, page) => [...acc, ...page.specNotes], [])),
    ];
    const specNotesText = allSpecNotes.length > 0 ? allSpecNotes.join("\n") : null;

    const coatingSpecsIsFooterOnly = cpo.coatingSpecs
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .every((line) => FOOTER_LABELS.some((label) => line.startsWith(label)));

    if (specNotesText && specNotesText !== cpo.coatingSpecs) {
      cpo.coatingSpecs = specNotesText;
      await this.cpoRepo.save(cpo);
    } else if (coatingSpecsIsFooterOnly) {
      cpo.coatingSpecs = null;
      await this.cpoRepo.save(cpo);
    }

    const allItems = this.classifyItems(pages);

    this.logger.log(
      `Parsed ${pages.length} page(s), ${allItems.length} total items from ${pages.reduce((sum, p) => sum + p.lineItems.length, 0)} line items`,
    );

    const jtItems = allItems.filter((item) => item.category === "jt");
    const asteriskRawItems = allItems.filter((item) => item.category === "asterisk");
    const undeliveredItems = allItems.filter((item) => item.category === "undelivered");

    this.logger.log(
      `Classification: ${jtItems.length} JT items, ${asteriskRawItems.length} asterisk, ${undeliveredItems.length} undelivered`,
    );

    const jtGroups = jtItems.reduce<Record<string, SageJcDumpParsedItem[]>>((acc, item) => {
      const jt = item.jtNo as string;
      return { ...acc, [jt]: [...(acc[jt] || []), item] };
    }, {});

    Object.entries(jtGroups).forEach(([jt, items]) => {
      this.logger.log(`JT ${jt}: ${items.length} item(s)`);
    });

    const parentJc = await this.jobCardRepo.findOne({
      where: { companyId, cpoId: cpo.id, parentJobCardId: IsNull() },
    });

    const existingJtNumbers = parentJc
      ? await this.jobCardRepo
          .find({
            where: { companyId, parentJobCardId: parentJc.id },
            select: ["jtDnNumber"],
          })
          .then((jcs) => jcs.map((jc) => jc.jtDnNumber).filter((jt): jt is string => jt !== null))
      : [];

    const existingJtSet = new Set(existingJtNumbers.map((jt) => jt.toUpperCase()));

    const skippedJtNumbers = Object.keys(jtGroups).filter((jt) =>
      existingJtSet.has(jt.toUpperCase()),
    );
    const newJtGroups = Object.keys(jtGroups)
      .filter((jt) => !existingJtSet.has(jt.toUpperCase()))
      .reduce<Record<string, SageJcDumpParsedItem[]>>((acc, jt) => {
        return { ...acc, [jt]: jtGroups[jt] };
      }, {});

    const asteriskItems = this.buildAsteriskItems(asteriskRawItems, jtItems, cpo);

    return {
      cpoId: cpo.id,
      cpoNumber: cpo.cpoNumber,
      jobNumber,
      customerName,
      documentNumber,
      specNotes: specNotesText,
      jtGroups: newJtGroups,
      asteriskItems,
      skippedJtNumbers,
      undeliveredItems,
    };
  }

  async confirmSageJcDump(
    companyId: number,
    request: SageJcDumpConfirmRequest,
    userName: string | null,
  ): Promise<SageJcDumpImportResult> {
    const cpo = await this.cpoRepo.findOne({
      where: { id: request.cpoId, companyId },
      relations: ["items"],
    });
    if (!cpo) {
      throw new NotFoundException("CPO not found");
    }

    const cpoJcNumber = this.extractJcNumber(cpo.cpoNumber);

    let parentJc = await this.jobCardRepo.findOne({
      where: { companyId, cpoId: cpo.id, parentJobCardId: IsNull() },
    });
    if (!parentJc) {
      const newJc = this.jobCardRepo.create({
        jobNumber: cpo.jobNumber,
        jcNumber: cpoJcNumber,
        jobName: cpo.jobName || cpo.cpoNumber,
        customerName: cpo.customerName,
        poNumber: cpo.poNumber,
        siteLocation: cpo.siteLocation,
        contactPerson: cpo.contactPerson,
        description: cpo.notes || null,
        notes: cpo.coatingSpecs ? deduplicateLines(cpo.coatingSpecs) : null,
        status: JobCardStatus.DRAFT,
        workflowStatus: WORKFLOW_STATUS_DRAFT,
        versionNumber: 1,
        cpoId: cpo.id,
        isCpoCalloff: true,
        companyId,
      });
      parentJc = await this.jobCardRepo.save(newJc);
      this.logger.log(`Auto-created parent JC #${parentJc.id} for CPO ${cpo.cpoNumber}`);
    } else {
      let parentNeedsUpdate = false;
      if (!parentJc.jcNumber && cpoJcNumber) {
        parentJc.jcNumber = cpoJcNumber;
        parentNeedsUpdate = true;
      }
      if (cpo.coatingSpecs && !parentJc.notes) {
        parentJc.notes = deduplicateLines(cpo.coatingSpecs);
        parentNeedsUpdate = true;
      }
      if (parentNeedsUpdate) {
        await this.jobCardRepo.save(parentJc);
      }
    }

    const parentJcId = parentJc.id;

    const existingJcs = await this.jobCardRepo.find({
      where: { companyId, parentJobCardId: parentJcId },
      select: ["jtDnNumber"],
    });
    const existingJtSet = new Set(
      existingJcs
        .map((jc) => jc.jtDnNumber)
        .filter((jt): jt is string => jt !== null)
        .map((jt) => jt.toUpperCase()),
    );

    const mergedGroups = { ...request.jtGroups };

    request.asteriskAllocations.forEach((alloc) => {
      const cpoItem = cpo.items.find((ci) => ci.id === alloc.cpoItemId);
      if (!cpoItem) return;

      alloc.allocations.forEach((a) => {
        if (!a.jtNumber || a.quantity <= 0) return;
        const jtKey = a.jtNumber.trim().toUpperCase();
        const syntheticItem: SageJcDumpParsedItem = {
          itemCode: cpoItem.itemCode || "",
          itemDescription: cpoItem.itemDescription || "",
          itemNo: cpoItem.itemNo || "",
          itemNoBase: stripItemNoSequence(cpoItem.itemNo || ""),
          quantity: a.quantity,
          jtNo: a.jtNumber.trim(),
          category: "jt",
          pageNumber: 0,
          specNotes: null,
        };
        mergedGroups[jtKey] = [...(mergedGroups[jtKey] || []), syntheticItem];
      });
    });

    const skippedJtNumbers: string[] = [];
    const createdJobCards: Array<{ id: number; jtNumber: string; itemCount: number }> = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const jtEntries = Object.entries(mergedGroups);

      for (const [jtNumber, items] of jtEntries) {
        if (existingJtSet.has(jtNumber.toUpperCase())) {
          skippedJtNumbers.push(jtNumber);
          continue;
        }

        const itemPages = items.map((item) => item.pageNumber).filter((p) => p > 0);
        const pageNumber = itemPages.length > 0 ? String(Math.min(...itemPages)) : null;

        const jtSpecNotes = [
          ...new Set(items.map((item) => item.specNotes).filter((s): s is string => s !== null)),
        ];
        const jtNotes =
          jtSpecNotes.length > 0
            ? deduplicateLines(jtSpecNotes.join("\n"))
            : (() => {
                const raw = cpo.coatingSpecs || parentJc.notes || null;
                return raw ? deduplicateLines(raw) : null;
              })();

        const deliveryJc = this.jobCardRepo.create({
          jobNumber: parentJc.jobNumber,
          jcNumber: cpoJcNumber || parentJc.jcNumber || undefined,
          pageNumber,
          jobName: parentJc.jobName,
          customerName: parentJc.customerName,
          description: parentJc.description || undefined,
          notes: jtNotes,
          poNumber: parentJc.poNumber,
          siteLocation: parentJc.siteLocation,
          contactPerson: parentJc.contactPerson,
          status: JobCardStatus.DRAFT,
          workflowStatus: WORKFLOW_STATUS_DRAFT,
          versionNumber: 1,
          parentJobCardId: parentJcId,
          jtDnNumber: jtNumber,
          cpoId: cpo.id,
          isCpoCalloff: true,
          companyId,
        });

        const savedJc = await queryRunner.manager.save(JobCard, deliveryJc);

        const lineItemEntities = items.map((item, idx) =>
          this.lineItemRepo.create({
            jobCardId: savedJc.id,
            itemCode: item.itemCode || null,
            itemDescription: item.itemDescription || null,
            itemNo: item.itemNo || null,
            quantity: item.quantity,
            jtNo: jtNumber,
            sortOrder: idx,
            companyId,
            notes: item.specNotes,
          }),
        );

        await queryRunner.manager.save(JobCardLineItem, lineItemEntities);

        this.updateCpoFulfillment(items, cpo, queryRunner);

        createdJobCards.push({
          id: savedJc.id,
          jtNumber,
          itemCount: items.length,
        });

        this.logger.log(
          `Created delivery JC #${savedJc.id} for JT ${jtNumber} with ${items.length} items`,
        );
      }

      for (const alloc of request.asteriskAllocations) {
        const totalAllocated = alloc.allocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
        if (totalAllocated > 0) {
          const cpoItem = cpo.items.find((ci) => ci.id === alloc.cpoItemId);
          if (cpoItem) {
            const newFulfilled = Math.min(
              Number(cpoItem.quantityFulfilled) + totalAllocated,
              Number(cpoItem.quantityOrdered),
            );
            await queryRunner.manager.update(CustomerPurchaseOrderItem, alloc.cpoItemId, {
              quantityFulfilled: newFulfilled,
            });
          }
        }
      }

      const updatedItems = await queryRunner.manager.find(CustomerPurchaseOrderItem, {
        where: { cpoId: cpo.id },
      });
      const totalFulfilled = updatedItems.reduce(
        (sum, item) => sum + Number(item.quantityFulfilled),
        0,
      );
      const totalOrdered = updatedItems.reduce(
        (sum, item) => sum + Number(item.quantityOrdered),
        0,
      );

      const updates: Partial<CustomerPurchaseOrder> = {
        fulfilledQuantity: totalFulfilled,
      };
      if (totalFulfilled >= totalOrdered && totalOrdered > 0) {
        updates.status = CpoStatus.FULFILLED;
      }
      await queryRunner.manager.update(CustomerPurchaseOrder, cpo.id, updates);

      await queryRunner.commitTransaction();

      for (const jc of createdJobCards) {
        await this.qcMeasurementService
          .propagateCpoQcpsToJobCard(companyId, cpo.id, jc.id)
          .catch((err) => {
            this.logger.warn(
              `QCP propagation failed for JC ${jc.id}: ${err instanceof Error ? err.message : "Unknown"}`,
            );
          });
      }

      return {
        createdJobCards,
        skippedJtNumbers,
        totalCreated: createdJobCards.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parseExcelPages(buffer: Buffer): ParsedPage[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const pageBoundaries: number[] = [];
    grid.forEach((row, idx) => {
      const first = String(row[0] || "").trim();
      if (PAGE_HEADER_PATTERN.test(first)) {
        pageBoundaries.push(idx);
      }
    });

    if (pageBoundaries.length === 0) {
      return [];
    }

    return pageBoundaries.map((startRow, pageIdx) => {
      const endRow =
        pageIdx < pageBoundaries.length - 1 ? pageBoundaries[pageIdx + 1] : grid.length;
      const pageRows = grid.slice(startRow, endRow);

      return this.parseSinglePage(pageRows, pageIdx + 1);
    });
  }

  private parseSinglePage(rows: any[][], pageNumber: number): ParsedPage {
    let documentNumber: string | null = null;
    let jobNumber: string | null = null;
    let jobFileNo: string | null = null;
    let customerName: string | null = null;
    let customerCode: string | null = null;
    let orderDescription: string | null = null;

    const lineItems: ParsedPage["lineItems"] = [];
    const specNotes: string[] = [];

    rows.forEach((row) => {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();

      if (col0 === "CUSTOMER") {
        customerName = col1 || null;
        customerCode = String(row[5] || "").trim() || null;
      }

      if (col0 === "ORDER NO") {
        orderDescription = col1 || null;
        const jobFileLabel = String(row[4] || "").trim();
        if (jobFileLabel === "JOB FILE NO") {
          jobFileNo = String(row[5] || "").trim() || null;
        }
        const docLabel = String(row[6] || "").trim();
        if (docLabel === "Doc") {
          documentNumber = String(row[7] || "").trim() || null;
        }
        jobNumber = jobFileNo;
      }
    });

    let itemHeaderIdx = -1;
    rows.forEach((row, idx) => {
      if (
        String(row[0] || "").trim() === ITEM_HEADER_ROW[0] &&
        String(row[1] || "")
          .trim()
          .startsWith(ITEM_HEADER_ROW[1])
      ) {
        itemHeaderIdx = idx;
      }
    });

    if (itemHeaderIdx >= 0) {
      const itemRows = rows.slice(itemHeaderIdx + 1);

      const pendingItems: Array<{
        itemCode: string;
        itemDescription: string;
        itemNo: string;
        quantity: number;
        jtNo: string;
      }> = [];
      const pendingSpecLines: string[] = [];
      let collectingSpecs = false;

      const flushGroup = () => {
        const specText = pendingSpecLines.length > 0 ? pendingSpecLines.join("\n") : null;
        pendingItems.forEach((item) => {
          lineItems.push({ ...item, specNotes: specText });
        });
        if (specText) {
          pendingSpecLines.forEach((line) => {
            specNotes.push(line);
          });
        }
        pendingItems.length = 0;
        pendingSpecLines.length = 0;
        collectingSpecs = false;
      };

      let lastItemCode = "";
      let lastJtNo = "";

      itemRows.forEach((row) => {
        const rawItemCode = String(row[0] || "").trim();
        const itemDesc = String(row[1] || "").trim();

        if (isFooterRow(row)) return;
        if (rawItemCode && FOOTER_LABELS.some((label) => rawItemCode.startsWith(label))) return;

        const itemNo = String(row[4] || "").trim();
        const rawQty = row[5];
        const quantity = typeof rawQty === "number" ? rawQty : parseFloat(String(rawQty || "0"));
        const rawJtNo = String(row[6] || "").trim();
        const hasNoData =
          !rawItemCode &&
          !itemDesc &&
          !itemNo &&
          !rawJtNo &&
          (Number.isNaN(quantity) || quantity <= 0);

        if (hasNoData) return;

        if (
          !itemDesc &&
          !itemNo &&
          !rawJtNo &&
          (Number.isNaN(quantity) || quantity <= 0) &&
          SPEC_ROW_PATTERN.test(rawItemCode)
        ) {
          const specText = rawItemCode.replace(/\s+PRODUCTION\s*$/i, "").trim();
          if (specText) {
            pendingSpecLines.push(specText);
            collectingSpecs = true;
          }
          return;
        }

        if (Number.isNaN(quantity) || quantity <= 0) return;

        const itemCode = rawItemCode || lastItemCode;
        if (rawItemCode) {
          lastItemCode = rawItemCode;
        }
        if (rawJtNo) {
          lastJtNo = rawJtNo;
        }

        const jtNo = rawJtNo || lastJtNo;
        if (rawJtNo) {
          lastJtNo = rawJtNo;
        }

        if (collectingSpecs) {
          flushGroup();
        }

        pendingItems.push({
          itemCode,
          itemDescription: itemDesc,
          itemNo,
          quantity,
          jtNo,
        });
      });

      flushGroup();
    }

    return {
      pageNumber,
      documentNumber,
      jobNumber,
      jobFileNo,
      customerName,
      customerCode,
      orderDescription,
      specNotes,
      lineItems,
    };
  }

  private classifyItems(pages: ParsedPage[]): SageJcDumpParsedItem[] {
    return pages.reduce<SageJcDumpParsedItem[]>((acc, page) => {
      const items = page.lineItems.map((li) => {
        const itemNoBase = stripItemNoSequence(li.itemNo);
        let category: SageJcDumpParsedItem["category"] = "undelivered";

        if (li.jtNo && isAsterisk(li.jtNo)) {
          category = "asterisk";
        } else if (li.jtNo && isRealJtNumber(li.jtNo)) {
          category = "jt";
        }

        return {
          itemCode: li.itemCode,
          itemDescription: li.itemDescription,
          itemNo: li.itemNo,
          itemNoBase,
          quantity: li.quantity,
          jtNo: category === "jt" ? li.jtNo : null,
          category,
          pageNumber: page.pageNumber,
          specNotes: li.specNotes,
        };
      });

      return [...acc, ...items];
    }, []);
  }

  private buildAsteriskItems(
    rawItems: SageJcDumpParsedItem[],
    jtItems: SageJcDumpParsedItem[],
    cpo: CustomerPurchaseOrder,
  ): AsteriskItem[] {
    const jtQtyByItemBase = jtItems.reduce<Record<string, number>>((acc, item) => {
      const key = item.itemNoBase.toLowerCase();
      return { ...acc, [key]: (acc[key] || 0) + item.quantity };
    }, {});

    const grouped = rawItems.reduce<Record<string, SageJcDumpParsedItem[]>>((acc, item) => {
      const key = item.itemNoBase.toLowerCase();
      return { ...acc, [key]: [...(acc[key] || []), item] };
    }, {});

    return Object.entries(grouped).reduce<AsteriskItem[]>((acc, [key, items]) => {
      const representative = items[0];
      const totalAsteriskQty = items.reduce((sum, i) => sum + i.quantity, 0);

      const cpoItem = matchCpoItem(
        cpo.items,
        representative.itemNoBase,
        representative.itemDescription,
      );
      if (!cpoItem) return acc;

      const jtQtyInDump = jtQtyByItemBase[key] || 0;
      const alreadyDelivered = Number(cpoItem.quantityFulfilled) + jtQtyInDump;
      const remaining = Number(cpoItem.quantityOrdered) - alreadyDelivered;
      if (remaining <= 0) return acc;

      return [
        ...acc,
        {
          itemCode: representative.itemCode,
          itemDescription: representative.itemDescription,
          itemNo: representative.itemNo,
          itemNoBase: representative.itemNoBase,
          cpoItemId: cpoItem.id,
          totalCpoQty: Number(cpoItem.quantityOrdered),
          alreadyDeliveredQty: alreadyDelivered,
          remainingQty: remaining,
          asteriskQtyInFile: totalAsteriskQty,
        },
      ];
    }, []);
  }

  private extractJcNumber(cpoNumber: string): string | null {
    const match = cpoNumber.match(/-(JC\d+)$/i);
    return match ? match[1] : null;
  }

  private updateCpoFulfillment(
    items: SageJcDumpParsedItem[],
    cpo: CustomerPurchaseOrder,
    queryRunner: any,
  ): void {
    items.forEach((item) => {
      const cpoItem = matchCpoItem(cpo.items, item.itemNoBase, item.itemDescription);
      if (!cpoItem) return;

      const newFulfilled = Math.min(
        Number(cpoItem.quantityFulfilled) + item.quantity,
        Number(cpoItem.quantityOrdered),
      );

      queryRunner.manager.update(CustomerPurchaseOrderItem, cpoItem.id, {
        quantityFulfilled: newFulfilled,
      });

      cpoItem.quantityFulfilled = newFulfilled;
    });
  }
}
