import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
  ) {}

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

      if (!row.sku || !row.name) {
        result.errors.push({ row: i + 1, message: "SKU and Name are required" });
        continue;
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
