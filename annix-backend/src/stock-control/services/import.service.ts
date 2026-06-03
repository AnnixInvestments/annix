import { Injectable, Logger } from "@nestjs/common";
import { fromISO } from "../../lib/datetime";
import { selectSheetForMonth } from "../../lib/xlsx-sheet-select";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { LearningSource, LearningType } from "../../nix/entities/nix-learning.entity";
import { NixLearningRepository } from "../../nix/nix-learning.repository";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";

export interface ImportRow {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  costPerUnit?: number;
  quantity?: number;
  minStockLevel?: number;
  location?: string;
}

export interface ColumnMapping {
  sku: number | null;
  name: number | null;
  description: number | null;
  category: number | null;
  unitOfMeasure: number | null;
  costPerUnit: number | null;
  quantity: number | null;
  minStockLevel: number | null;
  location: number | null;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface MatchedExistingItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  location: string | null;
}

export interface ImportMatchRow {
  index: number;
  imported: ImportRow;
  match: MatchedExistingItem | null;
  matchConfidence: number;
  matchReason: string | null;
}

export interface ReviewedRow {
  index: number;
  action: "update" | "create" | "skip";
  matchedItemId: number | null;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  location: string | null;
  corrections: { field: string; originalValue: string | null; correctedValue: string | null }[];
}

export interface StockTakeVariance {
  stockItemId: number;
  sku: string;
  name: string;
  location: string | null;
  unitOfMeasure: string;
  systemQty: number; // on-hand the system held before this stock take
  countedQty: number; // what was counted (0 for items not on the count)
  varianceQty: number; // counted - system
  unitCost: number;
  varianceValueR: number; // varianceQty * unitCost
  zeroed: boolean; // true when the item was on the system but absent from the count
}

export interface ReviewedImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  learned: number;
  zeroed: number; // items not on the count that were set to zero (full stock take)
  errors: { row: number; message: string }[];
  variances: StockTakeVariance[];
}

export interface MissingStockTakeItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  costPerUnit: number;
  valueR: number;
}

const INVENTORY_PDF_EXTRACTION_PROMPT = `You are an expert at reading inventory, stock, and product listing documents.

Look at this PDF and extract all inventory/stock items into a JSON array.

Each item should have these fields (use null if not found):
- sku: product code, SKU, item code, or part number
- name: product name or item name
- description: additional description or specification
- category: category or group if shown
- unitOfMeasure: unit (each, kg, m, ltr, etc.)
- costPerUnit: price per unit (number only, no currency symbol)
- quantity: stock quantity or count (number only)
- minStockLevel: minimum stock level if shown (number only)
- location: storage location or bin number

Return ONLY a JSON array of objects, no markdown fences or explanation.
Example: [{"sku":"ABC-001","name":"Widget","quantity":50,"costPerUnit":12.5}]`;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly stockItemRepo: StockItemRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly nixLearningRepo: NixLearningRepository,
    private readonly aiChatService: AiChatService,
  ) {}

  async parseExcelRaw(
    buffer: Buffer,
    monthLabel?: string | null,
    explicitSheetName?: string | null,
  ): Promise<{
    headers: string[];
    rawRows: string[][];
    sheetNames: string[];
    selectedSheet: string | null;
  }> {
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
        headers: [],
        rawRows: [],
        sheetNames: selection.availableSheets,
        selectedSheet: null,
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const allRows = xlsx.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (allRows.length === 0) {
      return {
        headers: [],
        rawRows: [],
        sheetNames: selection.availableSheets,
        selectedSheet: sheetName,
      };
    }

    const headerRowIndex = this.detectHeaderRow(allRows);
    this.logger.log(
      `Excel parse (sheet "${sheetName}"): ${allRows.length} total rows, header row at index ${headerRowIndex}`,
    );

    const headers = allRows[headerRowIndex].map((h) => String(h).trim());
    this.logger.log(`Excel headers: ${JSON.stringify(headers)}`);

    const nonEmptyRows = allRows
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ""));

    return {
      headers,
      rawRows: nonEmptyRows.map((row) => row.map((cell) => String(cell))),
      sheetNames: selection.availableSheets,
      selectedSheet: sheetName,
    };
  }

  private detectHeaderRow(allRows: string[][]): number {
    const maxScan = Math.min(allRows.length, 15);
    const knownHeaders = [
      "item code",
      "stock code",
      "description",
      "item description",
      "qty",
      "quantity",
      "on hand",
      "soh",
      "uom",
      "unit",
      "warehouse",
      "location",
      "cost",
      "price",
      "category",
      "code",
      "name",
      "product",
      "bin",
      "group",
    ];

    let bestIndex = 0;
    let bestScore = 0;

    Array.from({ length: maxScan }, (_, i) => i).forEach((i) => {
      const row = allRows[i];
      const nonEmpty = row.filter((cell) => String(cell).trim() !== "").length;
      if (nonEmpty < 2) {
        return;
      }

      const headerMatches = row.filter((cell) => {
        const lower = String(cell).toLowerCase().trim();
        return (
          lower.length > 0 && lower.length < 50 && knownHeaders.some((kh) => lower.includes(kh))
        );
      }).length;

      const score = headerMatches * 3 + nonEmpty;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    return bestIndex;
  }

  async mapColumnsWithAi(headers: string[]): Promise<ColumnMapping> {
    const nullMapping: ColumnMapping = {
      sku: null,
      name: null,
      description: null,
      category: null,
      unitOfMeasure: null,
      costPerUnit: null,
      quantity: null,
      minStockLevel: null,
      location: null,
    };

    try {
      const available = await this.aiChatService.isAvailable();
      if (!available) {
        this.logger.warn("AI not available for column mapping, using fallback header matching");
        return this.fallbackColumnMapping(headers);
      }

      const systemPrompt = [
        "Map spreadsheet column headers to inventory fields.",
        "Fields: sku, name, description, category, unitOfMeasure, costPerUnit, quantity, minStockLevel, location.",
        "Return JSON object mapping each field to the column index (0-based), or null if no match.",
        "Respond with JSON only, no markdown fences.",
      ].join(" ");

      const userMessage = `Column headers: ${JSON.stringify(headers.map((h, i) => ({ index: i, header: h })))}`;

      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      const cleaned = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      const aiResult = Object.keys(nullMapping).reduce<ColumnMapping>((acc, key) => {
        const value = parsed[key];
        return {
          ...acc,
          [key]: typeof value === "number" && value >= 0 && value < headers.length ? value : null,
        };
      }, nullMapping);

      this.logger.log(
        `AI column mapping result: ${
          Object.entries(aiResult)
            .filter(([, v]) => v !== null)
            .map(([k, v]) => `${k}→col${v}("${headers[v as number]}")`)
            .join(", ") || "all null"
        }`,
      );

      const hasAnyMapping = Object.values(aiResult).some((v) => v !== null);
      if (hasAnyMapping) {
        return this.inferMissingNameColumn(aiResult, headers);
      }

      this.logger.warn("AI returned all-null mapping, falling back to header matching");
      return this.inferMissingNameColumn(this.fallbackColumnMapping(headers), headers);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI column mapping failed: ${message}, using fallback`);
      return this.inferMissingNameColumn(this.fallbackColumnMapping(headers), headers);
    }
  }

  private inferMissingNameColumn(mapping: ColumnMapping, headers: string[]): ColumnMapping {
    if (mapping.name !== null) {
      return mapping;
    }

    const usedIndices = new Set(Object.values(mapping).filter((v): v is number => v !== null));

    const candidate = headers.findIndex((h, i) => {
      if (usedIndices.has(i)) {
        return false;
      }
      const lower = h.toLowerCase().trim();
      const looksNumeric = /^\d+(\.\d+)?$/.test(lower);
      return !looksNumeric;
    });

    if (candidate >= 0) {
      this.logger.log(
        `Inferred name column: col${candidate}("${headers[candidate]}") — was unmapped`,
      );
      return { ...mapping, name: candidate };
    }

    return mapping;
  }

  private fallbackColumnMapping(headers: string[]): ColumnMapping {
    const lower = headers.map((h) => h.toLowerCase().trim());
    const used = new Set<number>();

    const findFirst = (patterns: string[]): number | null => {
      const idx = lower.findIndex((h, i) => !used.has(i) && patterns.some((p) => h.includes(p)));
      if (idx >= 0) {
        used.add(idx);
        return idx;
      }
      return null;
    };

    const sku = findFirst([
      "item code",
      "itemcode",
      "stock code",
      "stockcode",
      "product code",
      "part number",
      "part no",
      "sku",
      "code",
      "material",
    ]);
    const name = findFirst([
      "item description",
      "stock description",
      "item name",
      "description",
      "name",
      "product",
      "item",
    ]);
    const description = findFirst(["long description", "detail", "notes", "secondary", "remarks"]);
    const category = findFirst(["category", "group", "type", "class", "segment"]);
    const unitOfMeasure = findFirst([
      "uom",
      "unit of measure",
      "stocking uom",
      "stocking u/m",
      "sell uom",
      "u/m",
      "unit",
      "measure",
    ]);
    const costPerUnit = findFirst([
      "cost price",
      "unit cost",
      "average cost",
      "avg cost",
      "latest cost",
      "last cost",
      "cost",
      "price",
      "unit price",
      "rate",
      "value",
    ]);
    const quantity = findFirst([
      "on hand",
      "qty on hand",
      "quantity on hand",
      "soh",
      "stock on hand",
      "physical qty",
      "counted qty",
      "qty counted",
      "available",
      "balance",
      "qty",
      "quantity",
      "count",
      "stock",
    ]);
    const minStockLevel = findFirst([
      "min stock",
      "minimum stock",
      "reorder level",
      "reorder point",
      "minimum",
      "reorder",
      "min level",
      "min",
    ]);
    const location = findFirst(["warehouse code", "warehouse", "location", "bin", "store", "site"]);

    const result = {
      sku,
      name,
      description,
      category,
      unitOfMeasure,
      costPerUnit,
      quantity,
      minStockLevel,
      location,
    };
    this.logger.log(
      `Fallback column mapping: ${
        Object.entries(result)
          .filter(([, v]) => v !== null)
          .map(([k, v]) => `${k}→col${v}`)
          .join(", ") || "none matched"
      }`,
    );
    return result;
  }

  async parseExcel(buffer: Buffer): Promise<ImportRow[]> {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    return rawRows.map((row) => ({
      sku: String(row["SKU"] || row["sku"] || row["Sku"] || "").trim() || undefined,
      name:
        String(row["Name"] || row["name"] || row["ITEM"] || row["Item"] || "").trim() || undefined,
      description: String(row["Description"] || row["description"] || "").trim() || undefined,
      category: String(row["Category"] || row["category"] || "").trim() || undefined,
      unitOfMeasure:
        String(row["Unit"] || row["UOM"] || row["unit_of_measure"] || "").trim() || undefined,
      costPerUnit: Number(row["Cost"] || row["cost_per_unit"] || row["Price"] || 0) || undefined,
      quantity:
        Number(row["Quantity"] || row["quantity"] || row["Qty"] || row["QTY"] || 0) || undefined,
      minStockLevel:
        Number(row["Min Stock"] || row["min_stock_level"] || row["Min"] || 0) || undefined,
      location: String(row["Location"] || row["location"] || "").trim() || undefined,
    }));
  }

  async parsePdf(buffer: Buffer): Promise<ImportRow[]> {
    const aiRows = await this.parsePdfWithAi(buffer);
    if (aiRows.length > 0) {
      return aiRows;
    }

    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const lines = data.text.split("\n").filter((line: string) => line.trim().length > 0);

    const rows: ImportRow[] = lines
      .map((line: string) => line.split(/\t|,|;/).map((p: string) => p.trim()))
      .filter((parts: string[]) => parts.length >= 2 && parts[0] && parts[1])
      .map((parts: string[]) => ({
        sku: parts[0],
        name: parts[1],
        description: parts[2] || undefined,
        category: parts[3] || undefined,
        quantity: Number(parts[4]) || undefined,
        costPerUnit: Number(parts[5]) || undefined,
      }));

    return rows;
  }

  private async parsePdfWithAi(buffer: Buffer): Promise<ImportRow[]> {
    try {
      const base64 = buffer.toString("base64");
      const { content } = await this.aiChatService.chatWithImage(
        base64,
        "application/pdf",
        INVENTORY_PDF_EXTRACTION_PROMPT,
      );

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn("AI inventory PDF extraction returned no JSON array");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
      }

      this.logger.log(`AI extracted ${parsed.length} inventory rows from PDF`);

      return parsed.map((row: Record<string, unknown>) => ({
        sku: row.sku ? String(row.sku) : undefined,
        name: row.name ? String(row.name) : undefined,
        description: row.description ? String(row.description) : undefined,
        category: row.category ? String(row.category) : undefined,
        unitOfMeasure: row.unitOfMeasure ? String(row.unitOfMeasure) : undefined,
        costPerUnit: row.costPerUnit != null ? Number(row.costPerUnit) || undefined : undefined,
        quantity: row.quantity != null ? Number(row.quantity) || undefined : undefined,
        minStockLevel:
          row.minStockLevel != null ? Number(row.minStockLevel) || undefined : undefined,
        location: row.location ? String(row.location) : undefined,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`AI inventory PDF extraction failed, falling back to text: ${message}`);
      return [];
    }
  }

  async importRows(
    companyId: number,
    rows: ImportRow[],
    createdBy?: string,
    isStockTake: boolean = false,
    stockTakeDate: string | null = null,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      errors: [],
    };

    const existingCategories = await this.stockItemRepo.categoriesForCompany(companyId);

    const rowsNeedingCategory = rows.filter((r) => !r.category && r.name);
    const categoryMap = await this.inferCategories(rowsNeedingCategory, existingCategories);

    const normalizedRows = rows
      .map((row, i) => ({ row, index: i }))
      .filter(({ row }) => row.name || row.sku)
      .map(({ row, index }) => {
        const name = row.name || row.sku!;
        const category =
          row.category || (name && categoryMap.has(name) ? categoryMap.get(name) : undefined);
        const sku =
          row.sku ||
          name
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 20);
        const quantity = row.quantity !== undefined ? Math.round(row.quantity) : undefined;
        const minStockLevel =
          row.minStockLevel !== undefined ? Math.round(row.minStockLevel) : undefined;
        return {
          ...row,
          name,
          sku,
          category,
          quantity,
          minStockLevel,
          originalIndex: index,
        };
      });

    return normalizedRows.reduce(async (accPromise, row) => {
      const acc = await accPromise;

      try {
        const existing = await this.stockItemRepo.findOneBySkuForCompany(row.sku, companyId);

        if (existing) {
          if (!isStockTake) {
            Object.assign(existing, {
              name: row.name || existing.name,
              description: row.description ?? existing.description,
              category: row.category ?? existing.category,
              unitOfMeasure: row.unitOfMeasure ?? existing.unitOfMeasure,
              costPerUnit: row.costPerUnit ?? existing.costPerUnit,
              minStockLevel: row.minStockLevel ?? existing.minStockLevel,
              location: row.location ?? existing.location,
            });
          }

          if (row.quantity !== undefined) {
            const importedQty = row.quantity;
            const { finalSoh, movementNotes } = await this.resolveStockTakeQuantity(
              existing,
              importedQty,
              companyId,
              isStockTake,
              stockTakeDate,
            );

            if (finalSoh !== existing.quantity) {
              const delta = finalSoh - existing.quantity;
              existing.quantity = finalSoh;

              const movement = this.movementRepo.build({
                stockItem: existing,
                movementType: delta > 0 ? MovementType.IN : MovementType.OUT,
                quantity: Math.abs(delta),
                referenceType: isStockTake ? ReferenceType.STOCK_TAKE : ReferenceType.IMPORT,
                notes: movementNotes,
                createdBy: createdBy || null,
                companyId,
              });
              await this.movementRepo.save(movement);
            }
          }

          await this.stockItemRepo.save(existing);
          return { ...acc, updated: acc.updated + 1 };
        }

        const item = this.stockItemRepo.build({
          sku: row.sku,
          name: row.name,
          description: row.description || null,
          category: row.category || null,
          unitOfMeasure: row.unitOfMeasure || "each",
          costPerUnit: row.costPerUnit || 0,
          quantity: row.quantity || 0,
          minStockLevel: row.minStockLevel || 0,
          location: row.location || null,
          companyId,
          needsQrPrint: isStockTake,
        });
        const saved = await this.stockItemRepo.save(item);

        if (row.quantity && row.quantity > 0) {
          const movement = this.movementRepo.build({
            stockItem: saved,
            movementType: MovementType.IN,
            quantity: row.quantity,
            referenceType: isStockTake ? ReferenceType.STOCK_TAKE : ReferenceType.IMPORT,
            notes: isStockTake ? "Stock take - new item" : "Initial import",
            createdBy: createdBy || null,
            companyId,
          });
          await this.movementRepo.save(movement);
        }

        return { ...acc, created: acc.created + 1 };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          ...acc,
          errors: [...acc.errors, { row: row.originalIndex + 1, message }],
        };
      }
    }, Promise.resolve(result));
  }

  private async resolveStockTakeQuantity(
    existing: StockItem,
    importedQty: number,
    companyId: number,
    isStockTake: boolean,
    stockTakeDate: string | null,
    stockTakePeriod: string | null = null,
  ): Promise<{ finalSoh: number; movementNotes: string }> {
    const periodPrefix = stockTakePeriod ? `${stockTakePeriod} — ` : "";

    if (!isStockTake || !stockTakeDate) {
      return {
        finalSoh: importedQty,
        movementNotes: isStockTake ? `${periodPrefix}Stock take adjustment` : "Updated via import",
      };
    }

    const cutoff = fromISO(stockTakeDate).endOf("day").toJSDate();
    const postMovements = await this.movementRepo.findForItemSinceExcludingStockTake(
      companyId,
      existing.id,
      cutoff,
    );

    const netDelta = postMovements.reduce((acc, m) => {
      if (m.movementType === MovementType.IN) {
        return acc + m.quantity;
      } else if (m.movementType === MovementType.OUT) {
        return acc - m.quantity;
      }
      return acc;
    }, 0);

    const finalSoh = importedQty + netDelta;
    const movementNotes = `${periodPrefix}Stock take (${stockTakeDate}): counted ${importedQty}, +${postMovements.filter((m) => m.movementType === MovementType.IN).reduce((s, m) => s + m.quantity, 0)} in / -${postMovements.filter((m) => m.movementType === MovementType.OUT).reduce((s, m) => s + m.quantity, 0)} out since count = ${finalSoh}`;

    return { finalSoh, movementNotes };
  }

  private async inferCategories(
    rows: ImportRow[],
    existingCategories: string[],
  ): Promise<Map<string, string>> {
    const categoryMap = new Map<string, string>();

    if (rows.length === 0) {
      return categoryMap;
    }

    try {
      const available = await this.aiChatService.isAvailable();
      if (!available) {
        this.logger.warn("AI not available for category inference");
        return categoryMap;
      }

      const itemNames = rows.map((r) => r.name).filter((n): n is string => !!n);
      if (itemNames.length === 0) {
        return categoryMap;
      }

      const systemPrompt = [
        "You are a stock inventory categorization assistant.",
        "Analyze item names and assign each to a category.",
        existingCategories.length > 0
          ? `Prefer using existing categories: ${existingCategories.join(", ")}.`
          : "Create sensible general categories (e.g., Paint, Hardware, Electrical, PPE, Consumables, Tools, Chemicals, Fasteners).",
        "For items that don't fit existing categories, suggest a new appropriate category name.",
        "Return a JSON object mapping each item name to its category.",
        "Respond with JSON only, no markdown fences.",
      ].join(" ");

      const userMessage = `Categorize these inventory items: ${JSON.stringify(itemNames.slice(0, 50))}`;

      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      const cleaned = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as Record<string, string>;

      Object.entries(parsed).forEach(([name, category]) => {
        if (typeof category === "string" && category.trim()) {
          categoryMap.set(name, category.trim());
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI category inference failed: ${message}`);
    }

    return categoryMap;
  }

  async matchRowsToInventory(companyId: number, rows: ImportRow[]): Promise<ImportMatchRow[]> {
    const allItems = await this.stockItemRepo.findAllForCompany(companyId);
    const learned = await this.nixLearningRepo.findActiveCorrectionsByCategory("stock_import");

    const skuCorrections = learned
      .filter((l) => l.patternKey.startsWith("sku_rename:"))
      .reduce(
        (acc, l) => ({ ...acc, [l.originalValue || ""]: l.learnedValue }),
        {} as Record<string, string>,
      );

    const nameCorrections = learned
      .filter((l) => l.patternKey.startsWith("name_correction:"))
      .reduce(
        (acc, l) => ({ ...acc, [(l.originalValue || "").toLowerCase()]: l.learnedValue }),
        {} as Record<string, string>,
      );

    const results = rows.map((row, index) => {
      const importSku = row.sku?.trim() || "";
      const importName = row.name?.trim() || "";

      const correctedSku = skuCorrections[importSku] || importSku;

      const exactSkuMatch = allItems.find(
        (item) => item.sku.toLowerCase() === correctedSku.toLowerCase() && correctedSku !== "",
      );
      if (exactSkuMatch) {
        return {
          index,
          imported: row,
          match: this.toMatchedItem(exactSkuMatch),
          matchConfidence: correctedSku !== importSku ? 0.95 : 1.0,
          matchReason:
            correctedSku !== importSku
              ? `Exact SKU match via learned correction (${importSku} -> ${correctedSku})`
              : "Exact SKU match",
        };
      }

      const partialSkuMatch = importSku
        ? allItems.find(
            (item) =>
              item.sku.toLowerCase().includes(importSku.toLowerCase()) ||
              importSku.toLowerCase().includes(item.sku.toLowerCase()),
          )
        : null;
      if (partialSkuMatch) {
        return {
          index,
          imported: row,
          match: this.toMatchedItem(partialSkuMatch),
          matchConfidence: 0.7,
          matchReason: `Partial SKU match: "${partialSkuMatch.sku}"`,
        };
      }

      const correctedName = nameCorrections[importName.toLowerCase()] || importName;
      if (correctedName) {
        const nameMatch = allItems.find(
          (item) => item.name.toLowerCase() === correctedName.toLowerCase(),
        );
        if (nameMatch) {
          return {
            index,
            imported: row,
            match: this.toMatchedItem(nameMatch),
            matchConfidence: correctedName !== importName ? 0.85 : 0.8,
            matchReason:
              correctedName !== importName
                ? "Name match via learned correction"
                : "Exact name match",
          };
        }

        const fuzzyMatch = this.fuzzyNameMatch(correctedName, allItems);
        if (fuzzyMatch) {
          return {
            index,
            imported: row,
            match: this.toMatchedItem(fuzzyMatch.item),
            matchConfidence: fuzzyMatch.score,
            matchReason: `Fuzzy name match (${Math.round(fuzzyMatch.score * 100)}%): "${fuzzyMatch.item.name}"`,
          };
        }
      }

      return {
        index,
        imported: row,
        match: null,
        matchConfidence: 0,
        matchReason: null,
      };
    });

    return this.dedupeMatchesByItem(results);
  }

  private dedupeMatchesByItem(results: ImportMatchRow[]): ImportMatchRow[] {
    const bestConfidenceByItem = results.reduce((acc, r) => {
      const match = r.match;
      if (match === null) return acc;
      const prev = acc.get(match.id);
      if (prev === undefined || r.matchConfidence > prev) {
        acc.set(match.id, r.matchConfidence);
      }
      return acc;
    }, new Map<number, number>());

    const claimed = new Set<number>();
    return results.map((r) => {
      const match = r.match;
      if (match === null) return r;
      const isBest = r.matchConfidence === bestConfidenceByItem.get(match.id);
      if (isBest && !claimed.has(match.id)) {
        claimed.add(match.id);
        return r;
      }
      return {
        index: r.index,
        imported: r.imported,
        match: null,
        matchConfidence: 0,
        matchReason: `Another row matched "${match.name}" more closely — treated as new. Give this item a unique product code so it isn't merged.`,
      };
    });
  }

  private toMatchedItem(item: StockItem): MatchedExistingItem {
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      costPerUnit: Number(item.costPerUnit),
      quantity: Number(item.quantity),
      location: item.location,
    };
  }

  private fuzzyNameMatch(
    name: string,
    items: StockItem[],
  ): { item: StockItem; score: number } | null {
    const normalizedInput = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim();
    const inputTokens = new Set(normalizedInput.split(/\s+/).filter((t) => t.length > 1));

    if (inputTokens.size === 0) {
      return null;
    }

    const scored = items
      .map((item) => {
        const normalizedItem = item.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ")
          .trim();
        const itemTokens = new Set(normalizedItem.split(/\s+/).filter((t) => t.length > 1));
        if (itemTokens.size === 0) {
          return { item, score: 0 };
        }
        const intersection = [...inputTokens].filter((t) => itemTokens.has(t)).length;
        const union = new Set([...inputTokens, ...itemTokens]).size;
        const score = union > 0 ? intersection / union : 0;
        return { item, score };
      })
      .filter((s) => s.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0] : null;
  }

  async confirmReviewedImport(
    companyId: number,
    rows: ReviewedRow[],
    createdBy: string | null,
    isStockTake: boolean,
    stockTakeDate: string | null,
    zeroMissing = false,
    stockTakePeriod: string | null = null,
    zeroMissingItemIds: number[] | null = null,
  ): Promise<ReviewedImportResult> {
    const zeroSet = zeroMissingItemIds === null ? null : new Set(zeroMissingItemIds);
    const result: ReviewedImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      learned: 0,
      zeroed: 0,
      errors: [],
      variances: [],
    };

    // Every item the count touched (matched or newly created) — the zero-missing pass
    // must leave these alone.
    const countedItemIds = new Set<number>();

    for (const row of rows) {
      try {
        if (row.action === "skip") {
          result.skipped += 1;
          continue;
        }

        const learningCount = await this.recordCorrections(row);
        result.learned += learningCount;

        if (row.action === "update" && row.matchedItemId) {
          const existing = await this.stockItemRepo.findOneForCompany(row.matchedItemId, companyId);
          if (!existing) {
            result.errors = [
              ...result.errors,
              { row: row.index + 1, message: `Matched item #${row.matchedItemId} not found` },
            ];
            continue;
          }

          if (countedItemIds.has(existing.id)) {
            result.errors = [
              ...result.errors,
              {
                row: row.index + 1,
                message: `"${existing.name}" (${existing.sku}) was already counted on an earlier row — this row was skipped to avoid double-counting. These are likely distinct products that share a name; give each a unique product code.`,
              },
            ];
            continue;
          }

          const systemQtyBefore = Number(existing.quantity) || 0;
          countedItemIds.add(existing.id);

          if (!isStockTake) {
            existing.sku = row.sku || existing.sku;
            existing.name = row.name || existing.name;
            existing.description = row.description ?? existing.description;
            existing.category = row.category ?? existing.category;
            existing.unitOfMeasure = row.unitOfMeasure || existing.unitOfMeasure;
            existing.costPerUnit = row.costPerUnit ?? existing.costPerUnit;
            existing.minStockLevel = row.minStockLevel ?? existing.minStockLevel;
            existing.location = row.location ?? existing.location;
          } else {
            row.corrections.forEach((correction) => {
              const value = correction.correctedValue;
              if (correction.field === "name" && value) existing.name = value;
              else if (correction.field === "sku" && value) existing.sku = value;
              else if (correction.field === "description") existing.description = value;
              else if (correction.field === "category") existing.category = value;
            });
            if (row.location && row.location !== existing.location) {
              existing.location = row.location;
            }
          }

          if (row.quantity !== null && row.quantity !== undefined) {
            const { finalSoh, movementNotes } = await this.resolveStockTakeQuantity(
              existing,
              row.quantity,
              companyId,
              isStockTake,
              stockTakeDate,
              stockTakePeriod,
            );

            if (finalSoh !== existing.quantity) {
              const delta = finalSoh - existing.quantity;
              existing.quantity = finalSoh;

              const movement = this.movementRepo.build({
                stockItem: existing,
                movementType: delta > 0 ? MovementType.IN : MovementType.OUT,
                quantity: Math.abs(delta),
                referenceType: isStockTake ? ReferenceType.STOCK_TAKE : ReferenceType.IMPORT,
                notes: movementNotes,
                createdBy,
                companyId,
              });
              await this.movementRepo.save(movement);
            }
          }

          await this.stockItemRepo.save(existing);
          result.updated += 1;

          if (isStockTake && row.quantity !== null && row.quantity !== undefined) {
            result.variances.push(
              this.buildVariance(existing, systemQtyBefore, row.quantity, false),
            );
          }
        } else if (row.action === "create") {
          const item = this.stockItemRepo.build({
            sku: row.sku,
            name: row.name,
            description: row.description || null,
            category: row.category || null,
            unitOfMeasure: row.unitOfMeasure || "each",
            costPerUnit: row.costPerUnit || 0,
            quantity: row.quantity || 0,
            minStockLevel: row.minStockLevel || 0,
            location: row.location || null,
            companyId,
            needsQrPrint: isStockTake,
          });
          const saved = await this.stockItemRepo.save(item);
          countedItemIds.add(saved.id);

          if (row.quantity && row.quantity > 0) {
            const movement = this.movementRepo.build({
              stockItem: saved,
              movementType: MovementType.IN,
              quantity: row.quantity,
              referenceType: isStockTake ? ReferenceType.STOCK_TAKE : ReferenceType.IMPORT,
              notes: isStockTake
                ? `${stockTakePeriod ? `${stockTakePeriod} — ` : ""}Stock take - new item`
                : "Initial import (reviewed)",
              createdBy,
              companyId,
            });
            await this.movementRepo.save(movement);
          }

          result.created += 1;

          if (isStockTake) {
            result.variances.push(this.buildVariance(saved, 0, row.quantity || 0, false));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors = [...result.errors, { row: row.index + 1, message }];
      }
    }

    // Full stock take: anything in the system but absent from the count no longer exists,
    // so zero it (rolling forward any movements since the count date) and log the variance.
    if (isStockTake && zeroMissing) {
      const allItems = await this.stockItemRepo.findAllForCompany(companyId);
      for (const item of allItems) {
        if (countedItemIds.has(item.id)) continue;
        if (zeroSet !== null && !zeroSet.has(item.id)) continue;
        const systemQtyBefore = Number(item.quantity) || 0;
        if (systemQtyBefore === 0) continue;
        try {
          const { finalSoh, movementNotes } = await this.resolveStockTakeQuantity(
            item,
            0,
            companyId,
            true,
            stockTakeDate,
            stockTakePeriod,
          );
          if (finalSoh !== item.quantity) {
            const delta = finalSoh - item.quantity;
            item.quantity = finalSoh;
            await this.movementRepo.create({
              stockItem: item,
              movementType: delta > 0 ? MovementType.IN : MovementType.OUT,
              quantity: Math.abs(delta),
              referenceType: ReferenceType.STOCK_TAKE,
              notes: `Not on count — ${movementNotes}`,
              createdBy,
              companyId,
            });
            await this.stockItemRepo.save(item);
          }
          result.zeroed += 1;
          result.variances.push(this.buildVariance(item, systemQtyBefore, 0, true));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          result.errors = [
            ...result.errors,
            { row: 0, message: `Zeroing ${item.sku || item.name}: ${message}` },
          ];
        }
      }
    }

    return result;
  }

  async missingStockTakeItems(
    companyId: number,
    rows: ReviewedRow[],
  ): Promise<MissingStockTakeItem[]> {
    const matchedIds = rows.reduce((acc, r) => {
      if (r.action === "update" && r.matchedItemId) acc.add(r.matchedItemId);
      return acc;
    }, new Set<number>());
    const allItems = await this.stockItemRepo.findAllForCompany(companyId);
    return allItems
      .filter((item) => !matchedIds.has(item.id) && (Number(item.quantity) || 0) !== 0)
      .map((item) => {
        const quantity = Number(item.quantity) || 0;
        const costPerUnit = Number(item.costPerUnit) || 0;
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          quantity,
          costPerUnit,
          valueR: Math.round(quantity * costPerUnit * 100) / 100,
        };
      });
  }

  private buildVariance(
    item: StockItem,
    systemQty: number,
    countedQty: number,
    zeroed: boolean,
  ): StockTakeVariance {
    const unitCost = Number(item.costPerUnit) || 0;
    const varianceQty = countedQty - systemQty;
    return {
      stockItemId: item.id,
      sku: item.sku,
      name: item.name,
      location: item.location,
      unitOfMeasure: item.unitOfMeasure,
      systemQty,
      countedQty,
      varianceQty,
      unitCost,
      varianceValueR: Math.round(varianceQty * unitCost * 100) / 100,
      zeroed,
    };
  }

  /** Build a downloadable .xlsx of stock-take variances (SheetJS, matching the reader). */
  async buildVarianceWorkbook(variances: StockTakeVariance[]): Promise<Buffer> {
    const xlsx = await import("xlsx");
    const header = [
      "SKU",
      "Item",
      "Location",
      "UoM",
      "System Qty",
      "Counted Qty",
      "Variance Qty",
      "Unit Cost (R)",
      "Variance Value (R)",
      "Not On Count",
    ];
    const rows = variances.map((v) => [
      v.sku,
      v.name,
      v.location || "",
      v.unitOfMeasure,
      v.systemQty,
      v.countedQty,
      v.varianceQty,
      v.unitCost,
      v.varianceValueR,
      v.zeroed ? "Yes" : "",
    ]);
    const totalValue = variances.reduce((s, v) => s + v.varianceValueR, 0);
    const sheet = xlsx.utils.aoa_to_sheet([
      header,
      ...rows,
      [],
      ["", "", "", "", "", "", "", "Total variance (R)", Math.round(totalValue * 100) / 100, ""],
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, sheet, "Stock Variances");
    return xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  private async recordCorrections(row: ReviewedRow): Promise<number> {
    if (row.corrections.length === 0) {
      return 0;
    }

    let count = 0;
    for (const correction of row.corrections) {
      if (correction.originalValue === correction.correctedValue) {
        continue;
      }

      const patternKey = `${correction.field}_correction:${(correction.originalValue || "").slice(0, 100)}`;

      const existing = await this.nixLearningRepo.findOneCorrectionByPatternKeyCategoryAndValue(
        patternKey,
        "stock_import",
        correction.correctedValue || "",
      );

      if (existing) {
        existing.confirmationCount += 1;
        existing.confidence = Math.min(1, existing.confidence + 0.1);
        await this.nixLearningRepo.save(existing);
      } else {
        const learning = this.nixLearningRepo.build({
          learningType: LearningType.CORRECTION,
          source: LearningSource.USER_CORRECTION,
          category: "stock_import",
          patternKey,
          originalValue: correction.originalValue || undefined,
          learnedValue: correction.correctedValue || "",
          context: {
            field: correction.field,
            importedSku: row.sku,
            importedName: row.name,
            matchedItemId: row.matchedItemId,
          },
          confidence: 0.6,
          confirmationCount: 1,
          applicableProducts: ["stock_item"],
          isActive: true,
        });
        await this.nixLearningRepo.save(learning);
      }

      count += 1;
    }

    return count;
  }
}
