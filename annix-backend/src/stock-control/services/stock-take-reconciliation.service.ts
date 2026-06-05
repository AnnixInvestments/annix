import { Injectable, Logger } from "@nestjs/common";
import { fromISO } from "../../lib/datetime";
import { selectSheetForMonth } from "../../lib/xlsx-sheet-select";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { DeliveryService } from "./delivery.service";
import { ImportService } from "./import.service";
import { MovementService } from "./movement.service";

export interface ReconciliationInvoiceRef {
  invoice: string;
  supplier: string | null;
  columnIndex: number;
}

export interface ParsedReconciliationItem {
  rowIndex: number;
  name: string | null;
  sku: string | null;
  category: string | null;
  opening: number;
  statedClosing: number;
  totalIntake: number;
  totalIssues: number;
  actualCount: number | null;
  diff: number | null;
  unitPrice: number | null;
  totalValue: number | null;
  intakeByInvoice: Array<{ invoice: string; supplier: string | null; quantity: number }>;
}

export interface ParsedReconciliationSheet {
  invoiceRefs: ReconciliationInvoiceRef[];
  issueDates: string[];
  items: ParsedReconciliationItem[];
  warnings: string[];
  selectedSheet: string | null;
  availableSheets: string[];
}

export type ReconciliationFlag =
  | "UNMATCHED_ITEM"
  | "INTAKE_MISMATCH"
  | "ISSUE_MISMATCH"
  | "COUNT_VARIANCE"
  | "SHEET_MATH_MISMATCH";

export interface ReconciliationDocumentCheck {
  invoice: string;
  supplier: string | null;
  foundAs: "supplier_invoice" | "delivery_note" | null;
  foundId: number | null;
  status: "present" | "missing";
}

export type DocVerificationStatus = "present" | "missing_in_app" | "missing_on_manual";

export interface DocVerificationRow {
  supplier: string;
  invoice: string;
  status: DocVerificationStatus;
  foundAs: "supplier_invoice" | "delivery_note" | null;
}

export interface DocVerificationGroup {
  supplier: string;
  rows: DocVerificationRow[];
}

export interface ReconciliationItemAnalysis {
  rowIndex: number;
  name: string | null;
  sku: string | null;
  category: string | null;
  matchedStockItemId: number | null;
  matchedName: string | null;
  matchConfidence: number;
  sheetOpening: number;
  sheetIntake: number;
  sheetIssues: number;
  sheetExpectedClosing: number;
  sheetStatedClosing: number;
  sheetActualCount: number | null;
  sheetDiff: number | null;
  sheetTotalValue: number | null;
  appCurrentSoh: number | null;
  appDeliveryTotal: number;
  appIssueTotal: number;
  flags: ReconciliationFlag[];
}

export interface CreateMissingDeliveryResult {
  created: boolean;
  deliveryId: number | null;
  deliveryNumber: string;
  supplierName: string;
  lineCount: number;
  totalQuantity: number;
  skippedItems: string[];
  message: string;
}

export type IssuanceFixMode = "adjustment" | "staff" | "jobcard";

export interface CreateMissingIssuanceInput {
  stockItemId: number;
  quantity: number;
  direction: "out" | "in";
  mode: IssuanceFixMode;
  staffName: string | null;
  jobCardId: number | null;
  jobCardLabel: string | null;
  periodLabel: string | null;
}

export interface CreateMissingIssuanceResult {
  created: boolean;
  movementId: number | null;
  quantity: number;
  direction: "out" | "in";
  message: string;
}

export interface ReconciliationReport {
  periodLabel: string | null;
  periodStart: string;
  periodEnd: string;
  itemCount: number;
  totalInvoices: number;
  missingDocuments: ReconciliationDocumentCheck[];
  presentDocuments: ReconciliationDocumentCheck[];
  items: ReconciliationItemAnalysis[];
  unmatchedItemCount: number;
  intakeMismatchCount: number;
  issueMismatchCount: number;
  countVarianceCount: number;
  missingDocumentCount: number;
  totalCountVarianceValue: number;
  warnings: string[];
  selectedSheet: string | null;
  availableSheets: string[];
  documentGroups: DocVerificationGroup[];
}

interface ColumnRoles {
  nameCol: number;
  skuCol: number;
  openingCol: number | null;
  closingCol: number | null;
  totalIntakeCol: number | null;
  movementCol: number | null;
  countCol: number | null;
  diffCol: number | null;
  unitPriceCol: number | null;
  valueCol: number | null;
  invoiceCols: number[];
  issueCols: number[];
  headerRowIndex: number;
  supplierBandRowIndex: number | null;
}

@Injectable()
export class StockTakeReconciliationService {
  private readonly logger = new Logger(StockTakeReconciliationService.name);

  constructor(
    private readonly movementRepo: StockMovementRepository,
    private readonly deliveryNoteRepo: DeliveryNoteRepository,
    private readonly supplierInvoiceRepo: SupplierInvoiceRepository,
    private readonly importService: ImportService,
    private readonly deliveryService: DeliveryService,
    private readonly movementService: MovementService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  async createMissingIssuance(
    companyId: number,
    input: CreateMissingIssuanceInput,
    createdBy: string | null,
  ): Promise<CreateMissingIssuanceResult> {
    if (input.quantity <= 0) {
      return {
        created: false,
        movementId: null,
        quantity: 0,
        direction: input.direction,
        message: "There is no issue difference to record for this item.",
      };
    }

    const movementType = input.direction === "out" ? MovementType.OUT : MovementType.IN;
    const referenceType =
      input.mode === "adjustment" ? ReferenceType.MANUAL : ReferenceType.ISSUANCE;
    const attribution =
      input.mode === "staff" && input.staffName !== null
        ? ` — issued to ${input.staffName}`
        : input.mode === "jobcard" && input.jobCardLabel !== null
          ? ` — issued to ${input.jobCardLabel}`
          : "";
    const periodSuffix = input.periodLabel === null ? "" : ` (${input.periodLabel})`;
    const reason =
      input.direction === "out"
        ? "unrecorded issues from stock-take"
        : "reversed over-recorded issues from stock-take";
    const notes = `Stock-take reconciliation${periodSuffix}: ${reason}${attribution}`;

    const movement = await this.movementService.createManualAdjustment(companyId, {
      stockItemId: input.stockItemId,
      movementType,
      quantity: input.quantity,
      notes,
      createdBy: createdBy ?? undefined,
      referenceType,
      referenceId:
        input.mode === "jobcard" && input.jobCardId !== null ? input.jobCardId : undefined,
    });

    return {
      created: true,
      movementId: movement.id,
      quantity: input.quantity,
      direction: input.direction,
      message: `Recorded ${input.quantity} unit(s) ${input.direction === "out" ? "out" : "back in"}${attribution}.`,
    };
  }

  async analyzeUpload(
    companyId: number,
    buffer: Buffer,
    periodLabel: string | null,
    periodStart: string,
    periodEnd: string,
    sheetName?: string | null,
  ): Promise<ReconciliationReport> {
    return this.extractionMetricService.time(
      "stock-take-reconcile",
      "analyze",
      async () => {
        const parsed = await this.parseMatrix(buffer, periodLabel, sheetName);
        return this.analyze(companyId, parsed, periodLabel, periodStart, periodEnd);
      },
      buffer.length,
    );
  }

  async parseMatrix(
    buffer: Buffer,
    monthLabel?: string | null,
    explicitSheetName?: string | null,
  ): Promise<ParsedReconciliationSheet> {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const selection = selectSheetForMonth(
      workbook.SheetNames,
      monthLabel ?? null,
      explicitSheetName ?? null,
    );
    const sheetName = selection.sheetName;

    if (sheetName === null) {
      return {
        invoiceRefs: [],
        issueDates: [],
        items: [],
        warnings: ["The workbook has no sheets."],
        selectedSheet: null,
        availableSheets: selection.availableSheets,
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const grid = xlsx.utils
      .sheet_to_json<string[]>(worksheet, { header: 1, defval: "" })
      .map((row) => row.map((cell) => String(cell)));

    if (grid.length === 0) {
      return {
        invoiceRefs: [],
        issueDates: [],
        items: [],
        warnings: [`Sheet "${sheetName}" was empty.`],
        selectedSheet: sheetName,
        availableSheets: selection.availableSheets,
      };
    }

    const roles = this.detectColumnRoles(grid);
    const warnings: string[] = [];
    if (selection.availableSheets.length > 1 && !selection.matchedMonth) {
      warnings.push(
        `Could not match a tab to ${monthLabel ?? "the selected month"} — read the first tab "${sheetName}". Pick the correct tab if this is wrong.`,
      );
    }
    if (roles.openingCol === null) warnings.push("Could not find an OPENING column.");
    if (roles.closingCol === null) warnings.push("Could not find a CLOSING column.");
    if (roles.invoiceCols.length === 0) warnings.push("Could not find any invoice/intake columns.");

    const supplierForColumn = this.supplierByColumn(grid, roles);
    const headerRow = grid[roles.headerRowIndex];
    const invoiceRefs: ReconciliationInvoiceRef[] = roles.invoiceCols
      .map((col) => {
        const raw = (headerRow[col] ?? "").trim();
        return { invoice: raw, supplier: supplierForColumn(col), columnIndex: col };
      })
      .filter((ref) => ref.invoice !== "");

    const issueDates = roles.issueCols
      .map((col) => (headerRow[col] ?? "").trim())
      .filter((label) => label !== "");

    const dataRows = grid.slice(roles.headerRowIndex + 1);
    const seed: { category: string | null; items: ParsedReconciliationItem[] } = {
      category: null,
      items: [],
    };
    const built = dataRows.reduce((acc, row, offset) => {
      const cellText = (col: number | null): string | null => {
        if (col === null || col < 0 || col >= row.length) return null;
        const value = (row[col] ?? "").trim();
        return value === "" ? null : value;
      };
      const cellNumber = (col: number | null): number | null => {
        const text = cellText(col);
        if (text === null) return null;
        const num = Number(text.replace(/,/g, ""));
        return Number.isNaN(num) ? null : num;
      };

      const name = cellText(roles.nameCol);
      const sku = cellText(roles.skuCol);
      if (name === null && sku === null) {
        return acc;
      }

      const opening = cellNumber(roles.openingCol) ?? 0;
      const statedClosing = cellNumber(roles.closingCol) ?? 0;
      const actualCount = cellNumber(roles.countCol);
      const intakeByInvoice = roles.invoiceCols
        .map((col) => {
          const quantity = cellNumber(col) ?? 0;
          const invoice = (headerRow[col] ?? "").trim();
          return { invoice, supplier: supplierForColumn(col), quantity };
        })
        .filter((entry) => entry.invoice !== "" && entry.quantity !== 0);
      const totalIntake = intakeByInvoice.reduce((sum, entry) => sum + entry.quantity, 0);
      const totalIssues = roles.issueCols.reduce((sum, col) => sum + (cellNumber(col) ?? 0), 0);

      const hasNumericValue =
        opening !== 0 || statedClosing !== 0 || totalIntake !== 0 || totalIssues !== 0;
      const hasDigit = name !== null && /\d/.test(name);
      const isSectionHeader = name !== null && sku === null && !hasNumericValue && !hasDigit;
      if (isSectionHeader) {
        return { category: name, items: acc.items };
      }

      const item: ParsedReconciliationItem = {
        rowIndex: roles.headerRowIndex + 1 + offset,
        name,
        sku,
        category: acc.category,
        opening,
        statedClosing,
        totalIntake,
        totalIssues,
        actualCount,
        diff: cellNumber(roles.diffCol),
        unitPrice: cellNumber(roles.unitPriceCol),
        totalValue: cellNumber(roles.valueCol),
        intakeByInvoice,
      };
      return { category: acc.category, items: [...acc.items, item] };
    }, seed);

    this.logger.log(
      `Reconciliation parse: ${built.items.length} items, ${invoiceRefs.length} invoice columns, ${issueDates.length} issue dates`,
    );

    return {
      invoiceRefs,
      issueDates,
      items: built.items,
      warnings,
      selectedSheet: sheetName,
      availableSheets: selection.availableSheets,
    };
  }

  private detectColumnRoles(grid: string[][]): ColumnRoles {
    const headerRowIndex = this.detectMatrixHeaderRow(grid);
    const headerRow = grid[headerRowIndex].map((cell) => cell.toLowerCase().trim());
    const findCol = (predicate: (label: string) => boolean): number | null => {
      const index = headerRow.findIndex((label) => label !== "" && predicate(label));
      return index === -1 ? null : index;
    };

    const skuCol = findCol(
      (l) => l.includes("product code") || l.includes("stock code") || l === "code",
    );
    const openingCol = findCol((l) => l.includes("opening"));
    const closingCol = findCol((l) => l.includes("closing"));
    const totalIntakeCol = findCol(
      (l) => l.includes("intake") || (l.includes("total") && l.includes("stock")),
    );
    const movementCol = findCol((l) => l === "movement" || l.includes("movement"));
    const countCol = findCol(
      (l) => l.includes("stock count") || l === "count" || l.includes("actual"),
    );
    const diffCol = findCol((l) => l.includes("diff") || l.includes("variance"));
    const unitPriceCol = findCol(
      (l) => l.includes("r/p") || l.includes("unit") || l.includes("rate"),
    );
    const valueCol = findCol((l) => l.includes("total value") || l === "value");

    const resolvedSkuCol = skuCol ?? 1;
    const nameCol = resolvedSkuCol > 0 ? resolvedSkuCol - 1 : 0;

    const intakeStart = (openingCol ?? resolvedSkuCol) + 1;
    const intakeEnd = totalIntakeCol ?? movementCol ?? headerRow.length;
    const invoiceCols = this.rangeColumns(intakeStart, intakeEnd, headerRow);

    const issueStart = totalIntakeCol === null ? intakeEnd : totalIntakeCol + 1;
    const issueEnd = movementCol ?? countCol ?? headerRow.length;
    const issueCols = this.rangeColumns(issueStart, issueEnd, headerRow);

    const supplierBandRowIndex = headerRowIndex > 0 ? headerRowIndex - 1 : null;

    return {
      nameCol,
      skuCol: resolvedSkuCol,
      openingCol,
      closingCol,
      totalIntakeCol,
      movementCol,
      countCol,
      diffCol,
      unitPriceCol,
      valueCol,
      invoiceCols,
      issueCols,
      headerRowIndex,
      supplierBandRowIndex,
    };
  }

  private rangeColumns(start: number, end: number, headerRow: string[]): number[] {
    if (start >= end) return [];
    return Array.from({ length: end - start }, (_, i) => start + i).filter(
      (col) => (headerRow[col] ?? "").trim() !== "",
    );
  }

  private detectMatrixHeaderRow(grid: string[][]): number {
    const maxScan = Math.min(grid.length, 15);
    const markers = ["product code", "opening", "closing", "intake", "stock count"];
    const scored = Array.from({ length: maxScan }, (_, i) => i).map((i) => {
      const row = grid[i].map((cell) => cell.toLowerCase());
      const hits = markers.filter((marker) => row.some((cell) => cell.includes(marker))).length;
      return { i, hits };
    });
    const best = scored.reduce((acc, candidate) => (candidate.hits > acc.hits ? candidate : acc), {
      i: 0,
      hits: 0,
    });
    return best.hits > 0 ? best.i : 0;
  }

  private supplierByColumn(grid: string[][], roles: ColumnRoles): (col: number) => string | null {
    if (roles.supplierBandRowIndex === null) {
      return () => null;
    }
    const band = grid[roles.supplierBandRowIndex] ?? [];
    return (col: number): string | null => {
      const carried = Array.from({ length: col + 1 }, (_, i) => i)
        .map((i) => (band[i] ?? "").trim())
        .filter((value) => value !== "");
      const last = carried.length > 0 ? carried[carried.length - 1] : "";
      return last === "" ? null : last;
    };
  }

  private async analyze(
    companyId: number,
    parsed: ParsedReconciliationSheet,
    periodLabel: string | null,
    periodStart: string,
    periodEnd: string,
  ): Promise<ReconciliationReport> {
    const matchRows = parsed.items.map((item) => ({
      sku: item.sku ?? undefined,
      name: item.name ?? undefined,
      quantity: item.actualCount ?? item.statedClosing,
    }));
    const matches = await this.importService.matchRowsToInventory(companyId, matchRows);
    const matchByIndex = new Map(matches.map((m) => [m.index, m]));

    const movementsByItem = await this.appMovementsByItem(companyId, periodStart, periodEnd);
    const documents = await this.checkDocuments(companyId, parsed.invoiceRefs);
    const documentGroups = await this.buildDocumentGroups(
      companyId,
      documents,
      parsed.invoiceRefs,
      periodStart,
      periodEnd,
    );

    const items: ReconciliationItemAnalysis[] = parsed.items.map((item, index) => {
      const match = matchByIndex.get(index) ?? null;
      const matched = match?.match ?? null;
      const appMovements = matched === null ? null : (movementsByItem.get(matched.id) ?? null);
      const appDeliveryTotal =
        appMovements === null
          ? 0
          : appMovements
              .filter((m) => m.referenceType === ReferenceType.DELIVERY)
              .reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);
      const appIssueTotal =
        appMovements === null
          ? 0
          : appMovements
              .filter((m) => m.referenceType === ReferenceType.ISSUANCE)
              .reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);

      const sheetExpectedClosing = item.opening + item.totalIntake - item.totalIssues;
      const flags: ReconciliationFlag[] = [];
      if (matched === null) flags.push("UNMATCHED_ITEM");
      if (matched !== null && Math.abs(item.totalIntake - appDeliveryTotal) > 0.001)
        flags.push("INTAKE_MISMATCH");
      if (matched !== null && Math.abs(item.totalIssues - appIssueTotal) > 0.001)
        flags.push("ISSUE_MISMATCH");
      const actualCount = item.actualCount;
      if (actualCount !== null && Math.abs(actualCount - item.statedClosing) > 0.001)
        flags.push("COUNT_VARIANCE");
      if (Math.abs(sheetExpectedClosing - item.statedClosing) > 0.001)
        flags.push("SHEET_MATH_MISMATCH");

      return {
        rowIndex: item.rowIndex,
        name: item.name,
        sku: item.sku,
        category: item.category,
        matchedStockItemId: matched?.id ?? null,
        matchedName: matched?.name ?? null,
        matchConfidence: match?.matchConfidence ?? 0,
        sheetOpening: item.opening,
        sheetIntake: item.totalIntake,
        sheetIssues: item.totalIssues,
        sheetExpectedClosing,
        sheetStatedClosing: item.statedClosing,
        sheetActualCount: item.actualCount,
        sheetDiff: item.diff,
        sheetTotalValue: item.totalValue,
        appCurrentSoh: matched === null ? null : Number(matched.quantity) || 0,
        appDeliveryTotal,
        appIssueTotal,
        flags,
      };
    });

    const missingDocuments = documents.filter((d) => d.status === "missing");
    const presentDocuments = documents.filter((d) => d.status === "present");
    const totalCountVarianceValue = items.reduce((sum, item) => {
      const actualCount = item.sheetActualCount;
      if (actualCount === null) return sum;
      const unitValue =
        item.sheetTotalValue !== null && item.sheetStatedClosing !== 0
          ? item.sheetTotalValue / item.sheetStatedClosing
          : 0;
      return sum + Math.abs(actualCount - item.sheetStatedClosing) * unitValue;
    }, 0);

    return {
      periodLabel,
      periodStart,
      periodEnd,
      itemCount: items.length,
      totalInvoices: documents.length,
      missingDocuments,
      presentDocuments,
      items,
      unmatchedItemCount: items.filter((i) => i.flags.includes("UNMATCHED_ITEM")).length,
      intakeMismatchCount: items.filter((i) => i.flags.includes("INTAKE_MISMATCH")).length,
      issueMismatchCount: items.filter((i) => i.flags.includes("ISSUE_MISMATCH")).length,
      countVarianceCount: items.filter((i) => i.flags.includes("COUNT_VARIANCE")).length,
      missingDocumentCount: missingDocuments.length,
      totalCountVarianceValue: Math.round(totalCountVarianceValue * 100) / 100,
      warnings: parsed.warnings,
      selectedSheet: parsed.selectedSheet,
      availableSheets: parsed.availableSheets,
      documentGroups,
    };
  }

  private withinPeriod(date: Date | null, periodStart: string, periodEnd: string): boolean {
    if (date === null) return true;
    const time = date.getTime();
    if (periodStart !== "" && time < fromISO(periodStart).startOf("day").toJSDate().getTime()) {
      return false;
    }
    if (periodEnd !== "" && time > fromISO(periodEnd).endOf("day").toJSDate().getTime()) {
      return false;
    }
    return true;
  }

  private async buildDocumentGroups(
    companyId: number,
    documents: ReconciliationDocumentCheck[],
    invoiceRefs: ReconciliationInvoiceRef[],
    periodStart: string,
    periodEnd: string,
  ): Promise<DocVerificationGroup[]> {
    const rows: DocVerificationRow[] = documents.map((d) => ({
      supplier: d.supplier ?? "Unknown supplier",
      invoice: d.invoice,
      status: d.status === "present" ? "present" : "missing_in_app",
      foundAs: d.foundAs,
    }));

    const sheetNorms = new Set(invoiceRefs.map((ref) => this.normalizeRef(ref.invoice)));
    const deliveries = await this.deliveryNoteRepo.findAllForCompanyByReceivedDate(companyId);
    deliveries
      .filter((dn) => this.withinPeriod(dn.receivedDate, periodStart, periodEnd))
      .filter((dn) => dn.deliveryNumber && !sheetNorms.has(this.normalizeRef(dn.deliveryNumber)))
      .forEach((dn) => {
        rows.push({
          supplier: dn.supplierName ?? "Unknown supplier",
          invoice: dn.deliveryNumber,
          status: "missing_on_manual",
          foundAs: "delivery_note",
        });
      });

    const bySupplier = rows.reduce((acc, row) => {
      const list = acc.get(row.supplier) ?? [];
      list.push(row);
      acc.set(row.supplier, list);
      return acc;
    }, new Map<string, DocVerificationRow[]>());

    return Array.from(bySupplier.entries())
      .map(([supplier, groupRows]) => ({
        supplier,
        rows: [...groupRows].sort((a, b) => a.invoice.localeCompare(b.invoice)),
      }))
      .sort((a, b) => a.supplier.localeCompare(b.supplier));
  }

  private async appMovementsByItem(
    companyId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<Map<number, Array<{ referenceType: ReferenceType | null; quantity: number }>>> {
    const movements = await this.movementRepo.movementHistoryForCompany(companyId, {
      startDate: periodStart,
      endDate: periodEnd,
    });
    return movements.reduce((acc, movement) => {
      const itemId = movement.stockItem?.id ?? null;
      if (itemId === null) return acc;
      const existing = acc.get(itemId) ?? [];
      existing.push({
        referenceType: movement.referenceType,
        quantity: Number(movement.quantity) || 0,
      });
      acc.set(itemId, existing);
      return acc;
    }, new Map<number, Array<{ referenceType: ReferenceType | null; quantity: number }>>());
  }

  private async checkDocuments(
    companyId: number,
    invoiceRefs: ReconciliationInvoiceRef[],
  ): Promise<ReconciliationDocumentCheck[]> {
    const uniqueRefs = Array.from(
      invoiceRefs
        .reduce((acc, ref) => {
          if (!acc.has(ref.invoice)) acc.set(ref.invoice, ref);
          return acc;
        }, new Map<string, ReconciliationInvoiceRef>())
        .values(),
    );

    const deliveries = await this.deliveryNoteRepo.findAllForCompanyByReceivedDate(companyId);
    const deliveryByNorm = deliveries.reduce((acc, dn) => {
      acc.set(this.normalizeRef(dn.deliveryNumber), dn.id);
      return acc;
    }, new Map<string, number>());

    const checks = await Promise.all(
      uniqueRefs.map(async (ref): Promise<ReconciliationDocumentCheck> => {
        const norm = this.normalizeRef(ref.invoice);
        const deliveryId = deliveryByNorm.get(norm) ?? null;
        if (deliveryId !== null) {
          return {
            invoice: ref.invoice,
            supplier: ref.supplier,
            foundAs: "delivery_note",
            foundId: deliveryId,
            status: "present",
          };
        }
        const invoiceMatches = await this.supplierInvoiceRepo.searchSummaryForCompany(
          companyId,
          ref.invoice,
          5,
        );
        const invoiceHit = invoiceMatches.find(
          (inv) => this.normalizeRef(inv.invoiceNumber) === norm,
        );
        if (invoiceHit) {
          return {
            invoice: ref.invoice,
            supplier: ref.supplier,
            foundAs: "supplier_invoice",
            foundId: invoiceHit.id,
            status: "present",
          };
        }
        return {
          invoice: ref.invoice,
          supplier: ref.supplier,
          foundAs: null,
          foundId: null,
          status: "missing",
        };
      }),
    );

    return checks;
  }

  async createMissingDelivery(
    companyId: number,
    buffer: Buffer,
    invoice: string,
    receivedDate: string,
    receivedBy: string | null,
    monthLabel?: string | null,
    sheetName?: string | null,
  ): Promise<CreateMissingDeliveryResult> {
    return this.extractionMetricService.time("stock-take-reconcile", "create-delivery", () =>
      this.createMissingDeliveryInner(
        companyId,
        buffer,
        invoice,
        receivedDate,
        receivedBy,
        monthLabel ?? null,
        sheetName ?? null,
      ),
    );
  }

  private async createMissingDeliveryInner(
    companyId: number,
    buffer: Buffer,
    invoice: string,
    receivedDate: string,
    receivedBy: string | null,
    monthLabel: string | null,
    sheetName: string | null,
  ): Promise<CreateMissingDeliveryResult> {
    const parsed = await this.parseMatrix(buffer, monthLabel, sheetName);
    const targetNorm = this.normalizeRef(invoice);
    const ref = parsed.invoiceRefs.find((r) => this.normalizeRef(r.invoice) === targetNorm);
    if (!ref) {
      return {
        created: false,
        deliveryId: null,
        deliveryNumber: invoice,
        supplierName: "",
        lineCount: 0,
        totalQuantity: 0,
        skippedItems: [],
        message: `Invoice ${invoice} was not found on the sheet.`,
      };
    }

    const lines = parsed.items
      .map((item) => {
        const entry = item.intakeByInvoice.find((e) => this.normalizeRef(e.invoice) === targetNorm);
        return entry === undefined ? null : { item, quantity: entry.quantity };
      })
      .filter(
        (line): line is { item: ParsedReconciliationItem; quantity: number } => line !== null,
      );

    const matches = await this.importService.matchRowsToInventory(
      companyId,
      lines.map((line) => ({
        sku: line.item.sku ?? undefined,
        name: line.item.name ?? undefined,
        quantity: line.quantity,
      })),
    );
    const matchByIndex = new Map(matches.map((m) => [m.index, m]));

    const deliveryItems = lines
      .map((line, index) => {
        const matched = matchByIndex.get(index)?.match ?? null;
        return matched === null
          ? null
          : { stockItemId: matched.id, quantityReceived: line.quantity };
      })
      .filter(
        (entry): entry is { stockItemId: number; quantityReceived: number } => entry !== null,
      );
    const skippedItems = lines
      .filter((line, index) => (matchByIndex.get(index)?.match ?? null) === null)
      .map((line) => line.item.name ?? line.item.sku ?? "Unknown item");

    if (deliveryItems.length === 0) {
      return {
        created: false,
        deliveryId: null,
        deliveryNumber: ref.invoice,
        supplierName: ref.supplier ?? "",
        lineCount: 0,
        totalQuantity: 0,
        skippedItems,
        message: "None of the items on this invoice could be matched to existing stock items.",
      };
    }

    const supplierName = ref.supplier ?? "Unknown supplier";
    const delivery = await this.deliveryService.create(companyId, {
      deliveryNumber: ref.invoice,
      supplierName,
      receivedDate: receivedDate === "" ? null : fromISO(receivedDate).toJSDate(),
      notes: "Created from stock-take reconciliation",
      receivedBy: receivedBy ?? undefined,
      items: deliveryItems,
    });
    const totalQuantity = deliveryItems.reduce((sum, item) => sum + item.quantityReceived, 0);

    return {
      created: true,
      deliveryId: delivery.id,
      deliveryNumber: ref.invoice,
      supplierName,
      lineCount: deliveryItems.length,
      totalQuantity,
      skippedItems,
      message: `Created delivery ${ref.invoice} with ${deliveryItems.length} item(s).`,
    };
  }

  private normalizeRef(value: string | null | undefined): string {
    if (!value) return "";
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
}
