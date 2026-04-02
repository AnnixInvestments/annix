import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { LearningSource, LearningType, NixLearning } from "../../nix/entities/nix-learning.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";

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

export interface ReviewedImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  learned: number;
  errors: { row: number; message: string }[];
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
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(NixLearning)
    private readonly nixLearningRepo: Repository<NixLearning>,
    private readonly aiChatService: AiChatService,
  ) {}

  async parseExcelRaw(buffer: Buffer): Promise<{ headers: string[]; rawRows: string[][] }> {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allRows = xlsx.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (allRows.length === 0) {
      return { headers: [], rawRows: [] };
    }

    const headers = allRows[0].map((h) => String(h).trim());
    const nonEmptyRows = allRows
      .slice(1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ""));

    return {
      headers,
      rawRows: nonEmptyRows.map((row) => row.map((cell) => String(cell))),
    };
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

      const hasAnyMapping = Object.values(aiResult).some((v) => v !== null);
      if (hasAnyMapping) {
        return aiResult;
      }

      this.logger.warn("AI returned all-null mapping, falling back to header matching");
      return this.fallbackColumnMapping(headers);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI column mapping failed: ${message}, using fallback`);
      return this.fallbackColumnMapping(headers);
    }
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

    const sku = findFirst(["item code", "itemcode", "stock code", "product code", "sku", "code"]);
    const name = findFirst([
      "item description",
      "item name",
      "description",
      "name",
      "product",
      "item",
    ]);
    const description = findFirst(["long description", "detail", "notes", "secondary"]);
    const category = findFirst(["category", "group", "type", "class"]);
    const unitOfMeasure = findFirst(["uom", "unit of measure", "unit", "measure"]);
    const costPerUnit = findFirst(["cost price", "cost", "price", "unit price", "rate", "value"]);
    const quantity = findFirst([
      "on hand",
      "soh",
      "qty on hand",
      "qty",
      "quantity",
      "count",
      "stock",
    ]);
    const minStockLevel = findFirst(["min stock", "minimum", "reorder", "min"]);
    const location = findFirst(["warehouse", "location", "bin", "store"]);

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

    const existingCategories = await this.stockItemRepo
      .createQueryBuilder("item")
      .select("DISTINCT item.category", "category")
      .where("item.company_id = :companyId", { companyId })
      .andWhere("item.category IS NOT NULL")
      .getRawMany()
      .then((cats) => cats.map((c) => c.category as string));

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
        const existing = await this.stockItemRepo.findOne({
          where: { sku: row.sku, companyId },
        });

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

              const movement = this.movementRepo.create({
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

        const item = this.stockItemRepo.create({
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
          const movement = this.movementRepo.create({
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
  ): Promise<{ finalSoh: number; movementNotes: string }> {
    if (!isStockTake || !stockTakeDate) {
      return {
        finalSoh: importedQty,
        movementNotes: isStockTake ? "Stock take adjustment" : "Updated via import",
      };
    }

    const cutoff = fromISO(stockTakeDate).endOf("day").toJSDate();
    const postMovements = await this.movementRepo
      .createQueryBuilder("m")
      .where("m.stock_item_id = :itemId", { itemId: existing.id })
      .andWhere("m.company_id = :companyId", { companyId })
      .andWhere("m.created_at > :cutoff", { cutoff })
      .andWhere("m.reference_type != :stockTake", { stockTake: ReferenceType.STOCK_TAKE })
      .getMany();

    const netDelta = postMovements.reduce((acc, m) => {
      if (m.movementType === MovementType.IN) {
        return acc + m.quantity;
      } else if (m.movementType === MovementType.OUT) {
        return acc - m.quantity;
      }
      return acc;
    }, 0);

    const finalSoh = importedQty + netDelta;
    const movementNotes = `Stock take (${stockTakeDate}): counted ${importedQty}, +${postMovements.filter((m) => m.movementType === MovementType.IN).reduce((s, m) => s + m.quantity, 0)} in / -${postMovements.filter((m) => m.movementType === MovementType.OUT).reduce((s, m) => s + m.quantity, 0)} out since count = ${finalSoh}`;

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
    const allItems = await this.stockItemRepo.find({ where: { companyId } });
    const learned = await this.nixLearningRepo.find({
      where: {
        learningType: LearningType.CORRECTION,
        category: "stock_import",
        isActive: true,
      },
    });

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

    return rows.map((row, index) => {
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
  ): Promise<ReviewedImportResult> {
    const result: ReviewedImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      learned: 0,
      errors: [],
    };

    for (const row of rows) {
      try {
        if (row.action === "skip") {
          result.skipped += 1;
          continue;
        }

        const learningCount = await this.recordCorrections(row);
        result.learned += learningCount;

        if (row.action === "update" && row.matchedItemId) {
          const existing = await this.stockItemRepo.findOne({
            where: { id: row.matchedItemId, companyId },
          });
          if (!existing) {
            result.errors = [
              ...result.errors,
              { row: row.index + 1, message: `Matched item #${row.matchedItemId} not found` },
            ];
            continue;
          }

          if (!isStockTake) {
            existing.sku = row.sku || existing.sku;
            existing.name = row.name || existing.name;
            existing.description = row.description ?? existing.description;
            existing.category = row.category ?? existing.category;
            existing.unitOfMeasure = row.unitOfMeasure || existing.unitOfMeasure;
            existing.costPerUnit = row.costPerUnit ?? existing.costPerUnit;
            existing.minStockLevel = row.minStockLevel ?? existing.minStockLevel;
            existing.location = row.location ?? existing.location;
          }

          if (row.quantity !== null && row.quantity !== undefined) {
            const { finalSoh, movementNotes } = await this.resolveStockTakeQuantity(
              existing,
              row.quantity,
              companyId,
              isStockTake,
              stockTakeDate,
            );

            if (finalSoh !== existing.quantity) {
              const delta = finalSoh - existing.quantity;
              existing.quantity = finalSoh;

              const movement = this.movementRepo.create({
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
        } else if (row.action === "create") {
          const item = this.stockItemRepo.create({
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
            const movement = this.movementRepo.create({
              stockItem: saved,
              movementType: MovementType.IN,
              quantity: row.quantity,
              referenceType: isStockTake ? ReferenceType.STOCK_TAKE : ReferenceType.IMPORT,
              notes: isStockTake ? "Stock take - new item" : "Initial import (reviewed)",
              createdBy,
              companyId,
            });
            await this.movementRepo.save(movement);
          }

          result.created += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors = [...result.errors, { row: row.index + 1, message }];
      }
    }

    return result;
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

      const existing = await this.nixLearningRepo.findOne({
        where: {
          patternKey,
          learningType: LearningType.CORRECTION,
          category: "stock_import",
          learnedValue: correction.correctedValue || "",
        },
      });

      if (existing) {
        existing.confirmationCount += 1;
        existing.confidence = Math.min(1, existing.confidence + 0.1);
        await this.nixLearningRepo.save(existing);
      } else {
        const learning = this.nixLearningRepo.create({
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
