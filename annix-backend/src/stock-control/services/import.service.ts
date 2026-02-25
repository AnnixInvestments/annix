import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
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

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
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
        this.logger.warn("AI not available for column mapping, returning null mapping");
        return nullMapping;
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

      return Object.keys(nullMapping).reduce((acc, key) => {
        const value = parsed[key];
        return {
          ...acc,
          [key]: typeof value === "number" && value >= 0 && value < headers.length ? value : null,
        };
      }, nullMapping);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`AI column mapping failed: ${message}`);
      return nullMapping;
    }
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
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const lines = data.text.split("\n").filter((line: string) => line.trim().length > 0);

    const rows: ImportRow[] = [];
    for (const line of lines) {
      const parts = line.split(/\t|,|;/).map((p: string) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        rows.push({
          sku: parts[0],
          name: parts[1],
          description: parts[2] || undefined,
          category: parts[3] || undefined,
          quantity: Number(parts[4]) || undefined,
          costPerUnit: Number(parts[5]) || undefined,
        });
      }
    }

    return rows;
  }

  async importRows(
    companyId: number,
    rows: ImportRow[],
    createdBy?: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.name) {
        if (!row.sku) {
          continue;
        }
        row.name = row.sku;
      }

      if (!row.sku) {
        row.sku = row.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 20);
      }

      if (row.quantity !== undefined) {
        row.quantity = Math.round(row.quantity);
      }
      if (row.minStockLevel !== undefined) {
        row.minStockLevel = Math.round(row.minStockLevel);
      }

      try {
        const existing = await this.stockItemRepo.findOne({ where: { sku: row.sku, companyId } });

        if (existing) {
          Object.assign(existing, {
            name: row.name || existing.name,
            description: row.description ?? existing.description,
            category: row.category ?? existing.category,
            unitOfMeasure: row.unitOfMeasure ?? existing.unitOfMeasure,
            costPerUnit: row.costPerUnit ?? existing.costPerUnit,
            minStockLevel: row.minStockLevel ?? existing.minStockLevel,
            location: row.location ?? existing.location,
          });

          if (row.quantity !== undefined && row.quantity !== existing.quantity) {
            const delta = row.quantity - existing.quantity;
            existing.quantity = row.quantity;

            const movement = this.movementRepo.create({
              stockItem: existing,
              movementType: delta > 0 ? MovementType.IN : MovementType.OUT,
              quantity: Math.abs(delta),
              referenceType: ReferenceType.IMPORT,
              notes: "Updated via import",
              createdBy: createdBy || null,
              companyId,
            });
            await this.movementRepo.save(movement);
          }

          await this.stockItemRepo.save(existing);
          result.updated++;
        } else {
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
          });
          const saved = await this.stockItemRepo.save(item);

          if (row.quantity && row.quantity > 0) {
            const movement = this.movementRepo.create({
              stockItem: saved,
              movementType: MovementType.IN,
              quantity: row.quantity,
              referenceType: ReferenceType.IMPORT,
              notes: "Initial import",
              createdBy: createdBy || null,
              companyId,
            });
            await this.movementRepo.save(movement);
          }

          result.created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }
}
