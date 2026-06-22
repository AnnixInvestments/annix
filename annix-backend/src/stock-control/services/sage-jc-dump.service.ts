import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as XLSX from "xlsx";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCardStatus } from "../entities/job-card.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
import { CustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository";
import { CustomerPurchaseOrderItemRepository } from "../repositories/customer-purchase-order-item.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";

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
  mergedJtNumbers: string[];
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
  mergedJobCards: Array<{ id: number; jtNumber: string; addedItemCount: number }>;
  totalCreated: number;
  totalMerged: number;
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

function isFooterLabel(value: string): boolean {
  return FOOTER_LABELS.some((label) => value.startsWith(label));
}

function isFooterRow(row: any[]): boolean {
  const first = String(row[0] || "").trim();
  return isFooterLabel(first);
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
    private readonly jobCardRepo: JobCardRepository,
    private readonly lineItemRepo: JobCardLineItemRepository,
    private readonly cpoRepo: CustomerPurchaseOrderRepository,
    private readonly cpoItemRepo: CustomerPurchaseOrderItemRepository,
    private readonly txRunner: TransactionRunner,
    private readonly qcMeasurementService: QcMeasurementService,
  ) {}

  async parseSageJcDump(
    buffer: Buffer,
    companyId: number,
    cpoId: number,
  ): Promise<SageJcDumpParseResult> {
    const cpo = await this.cpoRepo.findOneForCompanyWithItems(cpoId, companyId);
    if (!cpo) {
      throw new NotFoundException("CPO not found");
    }

    const allPages = this.parseExcelPages(buffer);
    if (allPages.length === 0) {
      throw new BadRequestException("No pages found in the uploaded file");
    }

    const cpoJcNumber = this.extractJcNumber(cpo.cpoNumber);
    const pages = cpoJcNumber ? allPages.filter((p) => p.documentNumber === cpoJcNumber) : allPages;

    if (pages.length === 0) {
      throw new BadRequestException(
        `Sage dump contains no delivery pages matching ${cpoJcNumber}. Make sure you're uploading the dump for this CPO's delivery sheet.`,
      );
    }

    if (allPages.length > pages.length) {
      this.logger.log(
        `Filtered Sage dump pages by documentNumber=${cpoJcNumber}: kept ${pages.length} of ${allPages.length} parsed page(s)`,
      );
    }

    const firstPage = pages[0];
    const documentNumber = firstPage.documentNumber;
    const jobNumber = cpo.jobNumber;
    const customerName = firstPage.customerName;

    const allSpecNotes = [
      ...new Set(pages.reduce<string[]>((acc, page) => [...acc, ...page.specNotes], [])),
    ].filter((line) => !isFooterLabel(line.trim()));
    const specNotesText = allSpecNotes.length > 0 ? allSpecNotes.join("\n") : null;

    const existingSpecs = cpo.coatingSpecs || null;
    const existingIsFooterOnly = existingSpecs
      ?.split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .every((l) => isFooterLabel(l));

    let cpoNeedsSave = false;

    if (specNotesText && specNotesText !== cpo.coatingSpecs) {
      cpo.coatingSpecs = specNotesText;
      cpoNeedsSave = true;
    } else if (!specNotesText && existingIsFooterOnly) {
      cpo.coatingSpecs = null;
      cpoNeedsSave = true;
    }

    if (cpo.reference && SPEC_ROW_PATTERN.test(cpo.reference)) {
      const cleanedRef = FOOTER_LABELS.reduce(
        (text, label) =>
          text.replace(
            new RegExp(`\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "gi"),
            " ",
          ),
        cpo.reference,
      ).trim();

      if (!cpo.coatingSpecs) {
        cpo.coatingSpecs = cleanedRef;
      } else if (!cpo.coatingSpecs.includes(cleanedRef)) {
        cpo.coatingSpecs = [cpo.coatingSpecs, cleanedRef].join("\n");
      }
      cpo.reference = null;
      cpoNeedsSave = true;
    }

    if (
      cpo.notes
        ?.split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .every((l) => isFooterLabel(l))
    ) {
      cpo.notes = null;
      cpoNeedsSave = true;
    }

    if (cpoNeedsSave) {
      await this.cpoRepo.saveForCompany(cpo.companyId, cpo);
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

    const existingJtNumbers = await this.jobCardRepo
      .findChildJobCardsByJobNumber(companyId, cpo.jobNumber)
      .then((jcs) => jcs.map((jc) => jc.jtDnNumber).filter((jt): jt is string => jt !== null));

    const existingJtSet = new Set(existingJtNumbers.map((jt) => jt.toUpperCase()));

    const mergedJtNumbers = Object.keys(jtGroups).filter((jt) =>
      existingJtSet.has(jt.toUpperCase()),
    );

    const asteriskItems = this.buildAsteriskItems(asteriskRawItems, jtItems, cpo);

    return {
      cpoId: cpo.id,
      cpoNumber: cpo.cpoNumber,
      jobNumber,
      customerName,
      documentNumber,
      specNotes: specNotesText,
      jtGroups,
      asteriskItems,
      mergedJtNumbers,
      undeliveredItems,
    };
  }

  async confirmSageJcDump(
    companyId: number,
    request: SageJcDumpConfirmRequest,
    userName: string | null,
  ): Promise<SageJcDumpImportResult> {
    const cpo = await this.cpoRepo.findOneForCompanyWithItems(request.cpoId, companyId);
    if (!cpo) {
      throw new NotFoundException("CPO not found");
    }

    const cpoJcNumber = this.extractJcNumber(cpo.cpoNumber);

    let parentJc = await this.jobCardRepo.findParentForCpo(cpo.id, companyId);
    if (!parentJc) {
      const newJc = this.jobCardRepo.build({
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
      parentJc = await this.jobCardRepo.saveForCompany(companyId, newJc);
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
        await this.jobCardRepo.saveForCompany(companyId, parentJc);
      }
    }

    const parentJcId = parentJc.id;

    const existingChildJcs = await this.jobCardRepo.findChildJobCardsByJobNumber(
      companyId,
      parentJc.jobNumber,
    );
    const existingJtMap = new Map<string, number>();
    existingChildJcs.forEach((jc) => {
      if (jc.jtDnNumber) {
        existingJtMap.set(jc.jtDnNumber.toUpperCase(), jc.id);
      }
    });

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

    const createdJobCards: Array<{ id: number; jtNumber: string; itemCount: number }> = [];
    const mergedJobCards: Array<{ id: number; jtNumber: string; addedItemCount: number }> = [];

    const transactionResult = await this.txRunner.run(async (ctx) => {
      const jobCardTx = this.jobCardRepo.withTransaction(ctx);
      const lineItemTx = this.lineItemRepo.withTransaction(ctx);
      const cpoTx = this.cpoRepo.withTransaction(ctx);
      const cpoItemTx = this.cpoItemRepo.withTransaction(ctx);
      const jtEntries = Object.entries(mergedGroups);

      for (const [jtNumber, items] of jtEntries) {
        const existingJcId = existingJtMap.get(jtNumber.toUpperCase());
        if (existingJcId) {
          const gated = await this.gateItemsByCpo(items, cpo, cpoItemTx);
          if (gated.length === 0) {
            this.logger.log(
              `Skipped JT ${jtNumber} for JC #${existingJcId}: all items already called off against CPO ${cpo.cpoNumber}`,
            );
            continue;
          }
          const priorItemCount = await lineItemTx.count({ jobCardId: existingJcId });
          const appendedLineItems = this.lineItemRepo.buildMany(
            gated.map(({ item, qty }, idx) => ({
              jobCardId: existingJcId,
              itemCode: item.itemCode || null,
              itemDescription: item.itemDescription || null,
              itemNo: item.itemNo || null,
              quantity: qty,
              jtNo: jtNumber,
              sortOrder: priorItemCount + idx,
              companyId,
              notes: item.specNotes || null,
            })),
          );
          for (const lineItem of appendedLineItems) {
            await lineItemTx.saveForCompany(companyId, lineItem);
          }
          mergedJobCards.push({
            id: existingJcId,
            jtNumber,
            addedItemCount: appendedLineItems.length,
          });
          this.logger.log(
            `Pooled ${appendedLineItems.length} new item(s) into existing JC #${existingJcId} for JT ${jtNumber} (job ${parentJc.jobNumber})`,
          );
          continue;
        }

        const gated = await this.gateItemsByCpo(items, cpo, cpoItemTx);
        if (gated.length === 0) {
          this.logger.log(
            `Skipped JT ${jtNumber}: all items already called off against CPO ${cpo.cpoNumber}`,
          );
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

        const deliveryJc = this.jobCardRepo.build({
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

        const savedJc = await jobCardTx.saveForCompany(companyId, deliveryJc);

        const lineItemEntities = this.lineItemRepo.buildMany(
          gated.map(({ item, qty }, idx) => ({
            jobCardId: savedJc.id,
            itemCode: item.itemCode || null,
            itemDescription: item.itemDescription || null,
            itemNo: item.itemNo || null,
            quantity: qty,
            jtNo: jtNumber,
            sortOrder: idx,
            companyId,
            notes: item.specNotes || jtNotes,
          })),
        );

        for (const lineItem of lineItemEntities) {
          await lineItemTx.saveForCompany(companyId, lineItem);
        }

        createdJobCards.push({
          id: savedJc.id,
          jtNumber,
          itemCount: lineItemEntities.length,
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
            cpoItem.quantityFulfilled = newFulfilled;
            await cpoItemTx.saveForCompany(cpo.companyId, cpoItem);
          }
        }
      }

      const updatedItems = await cpoItemTx.findForCpoOrdered(cpo.id, cpo.companyId);
      const totalFulfilled = updatedItems.reduce(
        (sum, item) => sum + Number(item.quantityFulfilled),
        0,
      );
      const totalOrdered = updatedItems.reduce(
        (sum, item) => sum + Number(item.quantityOrdered),
        0,
      );

      cpo.fulfilledQuantity = totalFulfilled;
      if (totalFulfilled >= totalOrdered && totalOrdered > 0) {
        cpo.status = CpoStatus.FULFILLED;
      }
      await cpoTx.saveForCompany(cpo.companyId, cpo);

      return {
        createdJobCards,
        mergedJobCards,
        totalCreated: createdJobCards.length,
        totalMerged: mergedJobCards.length,
      };
    });

    for (const jc of transactionResult.createdJobCards) {
      await this.qcMeasurementService
        .propagateCpoQcpsToJobCard(companyId, cpo.id, jc.id)
        .catch((err) => {
          this.logger.warn(
            `QCP propagation failed for JC ${jc.id}: ${err instanceof Error ? err.message : "Unknown"}`,
          );
        });
    }

    return transactionResult;
  }

  private parseExcelPages(buffer: Buffer): ParsedPage[] {
    let workbook: ReturnType<typeof XLSX.read>;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch {
      throw new BadRequestException(
        "Could not read the uploaded file. Please ensure it is a valid Excel (.xlsx) file exported from Sage.",
      );
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new BadRequestException(
        "The uploaded file contains no sheets. Please ensure it is a valid Sage JC dump export.",
      );
    }
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
      let lastSpec: string | null = null;

      const flushGroup = () => {
        const specText = pendingSpecLines.length > 0 ? pendingSpecLines.join("\n") : lastSpec;
        pendingItems.forEach((item) => {
          lineItems.push({ ...item, specNotes: specText });
        });
        if (pendingSpecLines.length > 0) {
          lastSpec = pendingSpecLines.join("\n");
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
        if (rawItemCode && isFooterLabel(rawItemCode)) return;

        const itemNo = String(row[4] || "").trim();
        const rawQty = row[5];
        const rawQtyStr = String(rawQty || "").trim();
        const quantity = typeof rawQty === "number" ? rawQty : parseFloat(rawQtyStr || "0");
        const rawJtNo = String(row[6] || "").trim();

        const itemNoIsFooter = itemNo && isFooterLabel(itemNo);
        const rawQtyIsFooter = rawQtyStr && isFooterLabel(rawQtyStr);
        const rawJtNoIsFooter = rawJtNo && isFooterLabel(rawJtNo);

        const effectiveItemNo = itemNoIsFooter ? "" : itemNo;
        const effectiveQty = rawQtyIsFooter ? NaN : quantity;
        const effectiveJtNo = rawJtNoIsFooter ? "" : rawJtNo;

        const hasNoData =
          !rawItemCode &&
          !itemDesc &&
          !effectiveItemNo &&
          !effectiveJtNo &&
          (Number.isNaN(effectiveQty) || effectiveQty <= 0);

        if (hasNoData) return;

        const specCandidate = rawItemCode || itemDesc;
        if (
          SPEC_ROW_PATTERN.test(specCandidate) &&
          (!effectiveItemNo || effectiveItemNo === rawItemCode) &&
          !effectiveJtNo &&
          (Number.isNaN(effectiveQty) || effectiveQty <= 0)
        ) {
          const specText = specCandidate.replace(/\s+PRODUCTION\s*$/i, "").trim();
          if (specText) {
            pendingSpecLines.push(specText);
            collectingSpecs = true;
          }
          return;
        }

        if (Number.isNaN(effectiveQty) || effectiveQty <= 0) return;

        const itemCode = rawItemCode || lastItemCode;
        if (rawItemCode) {
          lastItemCode = rawItemCode;
        }
        if (effectiveJtNo) {
          lastJtNo = effectiveJtNo;
        }

        const jtNo = effectiveJtNo || lastJtNo;
        if (effectiveJtNo) {
          lastJtNo = effectiveJtNo;
        }

        if (collectingSpecs) {
          flushGroup();
        }

        pendingItems.push({
          itemCode,
          itemDescription: itemDesc,
          itemNo: effectiveItemNo,
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

  private extractJcNumber(cpoNumber: string | null | undefined): string | null {
    if (!cpoNumber) return null;
    const match = cpoNumber.match(/-(JC\d+)$/i);
    return match ? match[1] : null;
  }

  private async gateItemsByCpo(
    items: SageJcDumpParsedItem[],
    cpo: CustomerPurchaseOrder,
    cpoItemTx: CustomerPurchaseOrderItemRepository,
  ): Promise<Array<{ item: SageJcDumpParsedItem; qty: number }>> {
    const gated: Array<{ item: SageJcDumpParsedItem; qty: number }> = [];

    for (const item of items) {
      const cpoItem = matchCpoItem(cpo.items, item.itemNoBase, item.itemDescription);

      if (!cpoItem) {
        gated.push({ item, qty: item.quantity });
        continue;
      }

      const remaining = Number(cpoItem.quantityOrdered) - Number(cpoItem.quantityFulfilled);
      if (remaining <= 0) {
        continue;
      }

      const qty = Math.min(item.quantity, remaining);
      cpoItem.quantityFulfilled = Number(cpoItem.quantityFulfilled) + qty;
      await cpoItemTx.saveForCompany(cpo.companyId, cpoItem);

      gated.push({ item, qty });
    }

    return gated;
  }
}
